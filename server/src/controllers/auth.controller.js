import * as authService from '../services/auth.service.js';

const isProduction = process.env.NODE_ENV === 'production';

const getCookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge,
});

const setCookies = (res, accessToken, refreshToken, family) => {
  res.cookie('accessToken', accessToken, getCookieOptions(15 * 60 * 1000));
  res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));
  res.cookie('family', family, getCookieOptions(7 * 24 * 60 * 60 * 1000));
};

const clearCookies = (res) => {
  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  };
  res.clearCookie('accessToken', options);
  res.clearCookie('refreshToken', options);
  res.clearCookie('family', options);
};

export const register = async (req, res) => {
  const { user, accessToken, refreshToken, family } = await authService.register(req.body);
  setCookies(res, accessToken, refreshToken, family);

  res.status(201).json({
    success: true,
    data: { user, accessToken },
    message: 'Registration successful',
  });
};

export const login = async (req, res) => {
  const { user, accessToken, refreshToken, family } = await authService.login(req.body);
  setCookies(res, accessToken, refreshToken, family);

  res.json({
    success: true,
    data: { user, accessToken },
    message: 'Login successful',
  });
};

export const refresh = async (req, res) => {
  const currentRefreshToken = req.cookies.refreshToken;
  const currentFamily = req.cookies.family;
  
  if (!currentRefreshToken || !currentFamily) {
    return res.status(401).json({ success: false, message: 'No refresh token' });
  }

  // The auth service requires userId for new tokens. Usually decoded from expired access token,
  // or embedded inside the refresh token. 
  // Wait, our refresh logic needs `userId` to generate new tokens. Let's decode it from the expired JWT.
  // Or better, let's fetch the userId from the RefreshToken model inside the service.
  // Ah, the service currently takes `userId`, `refreshToken`, `family`. Let's update that inside the service
  // to fetch the user from the token family. Wait, I'll pass a dummy userId or rely on the service to look it up.
  // Let me look up the user inside the controller for now.
  // Actually, we can get the user ID from the database using the family!
  // But wait, what if the user sends an invalid token? The service handles it. Let's adjust controller.
  
  const { user, accessToken, refreshToken, family } = await authService.refresh({
    refreshToken: currentRefreshToken,
    family: currentFamily,
  });

  setCookies(res, accessToken, refreshToken, family);

  res.json({
    success: true,
    data: { user },
    message: 'Token refreshed',
  });
};

export const logout = async (req, res) => {
  const family = req.cookies.family;
  await authService.logout(family);
  clearCookies(res);
  
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const getMe = async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user },
    message: 'Current user profile',
  });
};
