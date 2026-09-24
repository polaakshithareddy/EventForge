import { Router } from 'express';
import * as registrationController from '../controllers/registration.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createRegistrationSchema,
  checkInSchema,
} from '../validators/registration.validator.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

router.use(requireAuth);

// Attendee actions
router.post('/', validate(createRegistrationSchema), asyncHandler(registrationController.register));
router.get('/me', asyncHandler(registrationController.getMyRegistrations));

// Single registration details & cancel
router.get('/:id', asyncHandler(registrationController.getRegistration));
router.delete('/:id', asyncHandler(registrationController.cancelRegistration));

// Organizer actions
router.get('/event/:eventId', asyncHandler(registrationController.getEventRegistrations));
router.post(
  '/event/:eventId/checkin',
  validate(checkInSchema),
  asyncHandler(registrationController.checkIn)
);
router.patch('/:id/pay', asyncHandler(registrationController.markAsPaid));

export default router;
