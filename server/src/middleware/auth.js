import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { User } from '../models/User.js';
import { EventMembership } from '../models/EventMembership.js';
import { UnauthorizedError, ForbiddenError } from '../utils/AppError.js';
import asyncHandler from './asyncHandler.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return next(new UnauthorizedError('Not authenticated'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');
    
    if (!user || !user.isActive) {
      return next(new UnauthorizedError('User not found or inactive'));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new UnauthorizedError('Invalid or expired token'));
  }
});

export const requireRole = (...roles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }
    if (!roles.includes(req.user.globalRole)) {
      return next(new ForbiddenError('Not authorized to perform this action'));
    }
    next();
  };
};

export const requireEventRole = (...roles) => {
  return asyncHandler(async (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    const eventId =
      req.params.id || req.params.eventId || req.body.eventId || req.query.eventId;
    if (!eventId) {
      return next(new ForbiddenError('Event context required'));
    }

    const membership = await EventMembership.findOne({
      user: req.user._id,
      event: eventId,
    });

    // Admins bypass event-scoped checks
    if (req.user.globalRole === 'admin') {
      req.eventRole = 'admin';
      return next();
    }

    if (!membership || !roles.includes(membership.role)) {
      return next(new ForbiddenError(`Requires one of these roles for this event: ${roles.join(', ')}`));
    }

    req.eventRole = membership.role;
    next();
  });
};

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (user && user.isActive) {
      req.user = user;
    }
  } catch {
    // Ignore invalid/expired token in optional auth
  }
  next();
});
