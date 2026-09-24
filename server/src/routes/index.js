import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import venueRoutes from './venue.routes.js';
import eventRoutes from './event.routes.js';
import registrationRoutes from './registration.routes.js';
import sessionRoutes from './session.routes.js';
import sponsorRoutes from './sponsor.routes.js';
import analyticsRoutes from './analytics.routes.js';
import aiRoutes from './ai.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/venues', venueRoutes);
router.use('/events', eventRoutes);
router.use('/registrations', registrationRoutes);
router.use('/sessions', sessionRoutes);
router.use('/sponsors', sponsorRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/ai', aiRoutes);

export default router;
