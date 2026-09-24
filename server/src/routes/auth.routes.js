import { Router } from 'express';
import { register, login, refresh, logout, getMe } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/auth.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(register));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(login));
router.post('/refresh', asyncHandler(refresh));
router.post('/logout', asyncHandler(logout));
router.get('/me', requireAuth, asyncHandler(getMe));

export default router;
