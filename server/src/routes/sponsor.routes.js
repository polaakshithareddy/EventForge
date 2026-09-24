import { Router } from 'express';
import * as sponsorController from '../controllers/sponsor.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createSponsorSchema,
  updateSponsorSchema,
  inviteSponsorRepSchema,
} from '../validators/sponsor.validator.js';
import { uploadContract } from '../middleware/upload.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

// Public routes (No auth required - User-approved change #8)
router.get('/event/:eventId', asyncHandler(sponsorController.getEventSponsors));
router.get('/event/:eventId/tiers', asyncHandler(sponsorController.getEventSponsorsByTier));
router.get('/:id', asyncHandler(sponsorController.getSponsorById));

// Protected routes (Require auth)
router.use(requireAuth);

router.post(
  '/event/:eventId',
  uploadContract.single('contract'),
  validate(createSponsorSchema),
  asyncHandler(sponsorController.createSponsor)
);

router.patch(
  '/:id',
  uploadContract.single('contract'),
  validate(updateSponsorSchema),
  asyncHandler(sponsorController.updateSponsor)
);

router.delete('/:id', asyncHandler(sponsorController.deleteSponsor));

// Invite sponsor representative (User-approved change #4)
router.post(
  '/:id/invite',
  validate(inviteSponsorRepSchema),
  asyncHandler(sponsorController.inviteRepresentative)
);

// Authenticated private file route (User-approved change #7)
router.get('/:id/contract', asyncHandler(sponsorController.getContractDocument));

export default router;
