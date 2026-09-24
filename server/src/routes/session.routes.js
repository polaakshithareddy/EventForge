import { Router } from 'express';
import * as sessionController from '../controllers/session.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createSessionSchema,
  updateSessionSchema,
  speakerInviteSchema,
  updateSpeakerProfileSchema,
} from '../validators/session.validator.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

// Public schedule & speaker routes
router.get('/event/:eventId', asyncHandler(sessionController.getEventSessions));
router.get('/event/:eventId/schedule', asyncHandler(sessionController.getSchedule));
router.get('/event/:eventId/speakers', asyncHandler(sessionController.getSpeakers));
router.get('/:id', asyncHandler(sessionController.getSession));

// Protected session & speaker management
router.use(requireAuth);

router.post(
  '/event/:eventId',
  validate(createSessionSchema),
  asyncHandler(sessionController.createSession)
);
router.patch(
  '/:id',
  validate(updateSessionSchema),
  asyncHandler(sessionController.updateSession)
);
router.delete('/:id', asyncHandler(sessionController.deleteSession));

router.post(
  '/event/:eventId/speakers/invite',
  validate(speakerInviteSchema),
  asyncHandler(sessionController.inviteSpeaker)
);
router.patch(
  '/event/:eventId/speakers/:speakerId/profile',
  validate(updateSpeakerProfileSchema),
  asyncHandler(sessionController.updateSpeakerProfile)
);

export default router;
