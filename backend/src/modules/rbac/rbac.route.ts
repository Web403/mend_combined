import express, { Router } from 'express';
import RBACController from './rbac.controller';
import { authMiddleware } from '../../core/middleware/auth.middleware';
import { authorize } from '../../core/middleware/rbac.middleware';
import { Permission } from '../../shared/enums/rbac';

const router: Router = express.Router();

/**
 * Get available permissions and resource types (for UI dropdowns)
 */
router.get(
  '/available-options',
  authMiddleware,
  (req: any, res: any) => RBACController.getAvailableOptions(req, res)
);

/**
 * Get all permissions for a hotel
 */
router.get(
  '/hotel/:hotelId',
  authMiddleware,
  authorize({ permissions: [Permission.MANAGE_RBAC] }),
  (req: any, res: any) => RBACController.getHotelPermissions(req, res)
);

/**
 * Get permissions by role and department
 */
router.get(
  '/hotel/:hotelId/role',
  authMiddleware,
  (req: any, res: any) => RBACController.getPermissionsByRole(req, res)
);

/**
 * Get user's effective permissions
 */
router.get(
  '/hotel/:hotelId/user-permissions',
  authMiddleware,
  (req: any, res: any) => RBACController.getUserPermissions(req, res)
);

/**
 * Check if user has specific permission
 */
router.get(
  '/hotel/:hotelId/check',
  authMiddleware,
  (req: any, res: any) => RBACController.checkPermission(req, res)
);

/**
 * Create or update permission rule
 */
router.post(
  '/hotel/:hotelId/permission',
  authMiddleware,
  authorize({ permissions: [Permission.MANAGE_RBAC] }),
  (req: any, res: any) => RBACController.upsertPermission(req, res)
);

/**
 * Delete permission rule
 */
router.delete(
  '/permission/:id',
  authMiddleware,
  authorize({ permissions: [Permission.MANAGE_RBAC] }),
  (req: any, res: any) => RBACController.deletePermission(req, res)
);

/**
 * Disable permission rule
 */
router.patch(
  '/permission/:id/disable',
  authMiddleware,
  authorize({ permissions: [Permission.MANAGE_RBAC] }),
  (req: any, res: any) => RBACController.disablePermission(req, res)
);

/**
 * Enable permission rule
 */
router.patch(
  '/permission/:id/enable',
  authMiddleware,
  authorize({ permissions: [Permission.MANAGE_RBAC] }),
  (req: any, res: any) => RBACController.enablePermission(req, res)
);

/**
 * Clone permissions from one role to another
 */
router.post(
  '/hotel/:hotelId/clone-permissions',
  authMiddleware,
  authorize({ permissions: [Permission.MANAGE_RBAC] }),
  (req: any, res: any) => RBACController.clonePermissions(req, res)
);

export default router;
