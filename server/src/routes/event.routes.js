import { Router } from 'express';
import * as eventController from '../controllers/event.controller.js';
import { requireAuth, requireEventRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createEventSchema,
  updateEventSchema,
  sessionSchema,
  addMemberSchema,
} from '../validators/event.validator.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

// Public routes (No auth required - User-approved change #8)
router.get('/public', asyncHandler(eventController.getPublicEvents));
router.get('/public/:slug', asyncHandler(eventController.getPublicEvent));

// Protected routes (Require auth)
router.use(requireAuth);

router.post('/', validate(createEventSchema), asyncHandler(eventController.createEvent));
router.get('/org', asyncHandler(eventController.getOrgEvents));

router
  .route('/:id')
  .get(asyncHandler(eventController.getEvent))
  .patch(validate(updateEventSchema), asyncHandler(eventController.updateEvent))
  .delete(asyncHandler(eventController.deleteEvent));

// Sessions
router.post(
  '/:id/sessions',
  requireEventRole('organizer'),
  validate(sessionSchema),
  asyncHandler(eventController.addSession)
);
router.patch(
  '/:id/sessions/:sessionId',
  requireEventRole('organizer'),
  asyncHandler(eventController.updateSession)
);
router.delete(
  '/:id/sessions/:sessionId',
  requireEventRole('organizer'),
  asyncHandler(eventController.deleteSession)
);

// Event team members
router.get('/:id/members', asyncHandler(eventController.getMembers));
router.post(
  '/:id/members',
  requireEventRole('organizer'),
  validate(addMemberSchema),
  asyncHandler(eventController.addMember)
);
router.delete(
  '/:id/members/:memberId',
  requireEventRole('organizer'),
  asyncHandler(eventController.removeMember)
);

export default router;
