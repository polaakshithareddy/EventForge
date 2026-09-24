import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { UnauthorizedError, ConflictError } from '../utils/AppError.js';
import env from '../config/env.js';

const hashToken = (token) => bcryptjs.hashSync(token, 10);
const compareToken = (token, hash) => bcryptjs.compareSync(token, hash);

export const register = async ({ name, email, password, organizationName }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError('User already exists');
  }

  const passwordHash = await bcryptjs.hash(password, 12);
  let orgId = null;

  if (organizationName) {
    // Generate a slug
    const slug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
      throw new ConflictError('Organization name already taken');
    }
    const org = await Organization.create({ name: organizationName, slug });
    orgId = org._id;
  }

  const user = await User.create({
    name,
    email,
    passwordHash,
    organization: orgId,
    // If they create an org, they should ideally be an admin of that org or global user.
    // For this scope, we just set organization reference.
  });

  return generateAuthTokens(user._id);
};

export const login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isValid = await bcryptjs.compare(password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  return generateAuthTokens(user._id);
};

export const refresh = async ({ refreshToken, family }) => {
  // Find all tokens for this family
  const tokens = await RefreshToken.find({ family }).sort({ createdAt: -1 });
  
  if (tokens.length === 0) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const latestToken = tokens[0];
  const userId = latestToken.user;
  const isValid = compareToken(refreshToken, latestToken.tokenHash);

  // Token reuse detection (family based revocation)
  if (!isValid) {
    // A reused token was presented, invalidate entire family!
    await RefreshToken.deleteMany({ family });
    throw new UnauthorizedError('Token reuse detected. Please login again.');
  }

  if (latestToken.expiresAt < new Date()) {
    await RefreshToken.deleteMany({ family });
    throw new UnauthorizedError('Refresh token expired');
  }

  // Generate new tokens, maintaining the family
  return generateAuthTokens(userId, family);
};

export const logout = async (family) => {
  if (family) {
    await RefreshToken.deleteMany({ family });
  }
};

const generateAuthTokens = async (userId, existingFamily = null) => {
  const accessToken = jwt.sign({ id: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });

  const rawRefreshToken = uuidv4();
  const tokenHash = hashToken(rawRefreshToken);
  const family = existingFamily || uuidv4();

  // Determine expiration date
  const expiresInMatch = env.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)([dhms])$/);
  let days = 7;
  if (expiresInMatch) {
    days = parseInt(expiresInMatch[1], 10);
  }
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  // Store refresh token
  await RefreshToken.create({
    user: userId,
    tokenHash,
    family,
    expiresAt,
  });

  // Return the raw JWT and refresh token string to the user
  // The user model representation should also be fetched
  const user = await User.findById(userId).select('-passwordHash');

  return { user, accessToken, refreshToken: rawRefreshToken, family };
};
