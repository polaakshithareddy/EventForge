import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  generateCopySchema,
  generateAgendaSchema,
  polishBioSchema,
  recommendSessionsSchema,
  copilotChatSchema,
} from '../validators/ai.validator.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

// Event Marketing Copy Generator
router.post(
  '/generate-event-copy',
  optionalAuth,
  validate(generateCopySchema),
  asyncHandler(aiController.generateEventCopy)
);

// Structured Multi-Track Agenda Generator
router.post(
  '/generate-agenda',
  optionalAuth,
  validate(generateAgendaSchema),
  asyncHandler(aiController.generateAgenda)
);

// Speaker Bio Polisher & Talk Topic Generator
router.post(
  '/polish-speaker-bio',
  optionalAuth,
  validate(polishBioSchema),
  asyncHandler(aiController.polishSpeakerBio)
);

// Personalized Schedule Recommendations (Attendee AI Itinerary)
router.post(
  '/recommend-sessions',
  optionalAuth,
  validate(recommendSessionsSchema),
  asyncHandler(aiController.recommendSessions)
);

// Organizer AI Copilot Interactive Assistant
router.post(
  '/copilot-chat',
  optionalAuth,
  validate(copilotChatSchema),
  asyncHandler(aiController.copilotChat)
);

export default router;
