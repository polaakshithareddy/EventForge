import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';
import { requireAuth } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

// Protected analytics endpoints (Require authentication)
router.use(requireAuth);

router.get(
  '/event/:eventId/overview',
  asyncHandler(analyticsController.getEventOverview)
);

router.get(
  '/event/:eventId/export/attendees',
  asyncHandler(analyticsController.exportAttendeesCSV)
);

router.get(
  '/event/:eventId/badges',
  asyncHandler(analyticsController.getAttendeeBadges)
);

export default router;
