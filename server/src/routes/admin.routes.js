import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

// Protect all admin routes
router.use(requireAuth);
router.use(requireRole('admin'));

// Organizations
router.route('/organizations')
  .post(asyncHandler(adminController.createOrganization))
  .get(asyncHandler(adminController.getOrganizations));

router.route('/organizations/:id')
  .get(asyncHandler(adminController.getOrganization))
  .patch(asyncHandler(adminController.updateOrganization))
  .delete(asyncHandler(adminController.deleteOrganization));

// Users
router.route('/users')
  .get(asyncHandler(adminController.getUsers));

router.route('/users/:id')
  .get(asyncHandler(adminController.getUser))
  .patch(asyncHandler(adminController.updateUser))
  .delete(asyncHandler(adminController.deleteUser));

export default router;
