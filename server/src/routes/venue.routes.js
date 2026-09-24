import { Router } from 'express';
import * as venueController from '../controllers/venue.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createVenueSchema, updateVenueSchema } from '../validators/venue.validator.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

router.use(requireAuth);

router
  .route('/')
  .post(validate(createVenueSchema), asyncHandler(venueController.createVenue))
  .get(asyncHandler(venueController.getVenues));

router
  .route('/:id')
  .get(asyncHandler(venueController.getVenue))
  .patch(validate(updateVenueSchema), asyncHandler(venueController.updateVenue))
  .delete(asyncHandler(venueController.deleteVenue));

export default router;
