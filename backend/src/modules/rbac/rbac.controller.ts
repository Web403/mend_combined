import { Response } from 'express';
import RBACService from './rbac.service';
import { AuthenticatedRequest } from '../../core/middleware/auth.middleware';
import { successResponse, errorResponse } from '../../core/utils/ApiResponse';
import { logger } from '../../core/utils/logger';
import { getString, getStringRequired } from '../../core/utils/string.helper';
import { UserRole, UserDepartmentType, UserDepartmentRole } from '../../shared/enums/user';
import { Permission, ResourceType } from '../../shared/enums/rbac';

export class RBACController {
  /**
   * Get all permissions for a hotel
   */
  async getHotelPermissions(req: AuthenticatedRequest, res: Response) {
    try {
      const hotelId = getStringRequired(req.params.hotelId, 'Hotel ID');
      const permissions = await RBACService.getHotelPermissions(hotelId);
      res.json(successResponse(permissions, 'Permissions retrieved successfully'));
    } catch (error: any) {
      logger.error('Error fetching hotel permissions', { error });
      res.status(400).json(errorResponse(error.message));
    }
  }

  /**
   * Get permissions by role and department
   */
  async getPermissionsByRole(req: AuthenticatedRequest, res: Response) {
    try {
      const hotelId = getStringRequired(req.params.hotelId, 'Hotel ID');
      const role = getStringRequired(req.query.role, 'Role');
      const departmentType = getString(req.query.departmentType);
      const departmentRole = getString(req.query.departmentRole);

      const permissions = await RBACService.getPermissionsByRoleAndDept(
        hotelId,
        role as UserRole,
        departmentType as UserDepartmentType,
        departmentRole as UserDepartmentRole
      );

      res.json(successResponse(permissions, 'Permissions retrieved successfully'));
    } catch (error: any) {
      logger.error('Error fetching permissions by role', { error });
      res.status(400).json(errorResponse(error.message));
    }
  }

  /**
   * Get user's effective permissions
   */
  async getUserPermissions(req: AuthenticatedRequest, res: Response) {
    try {
      const hotelId = getStringRequired(req.params.hotelId, 'Hotel ID');
      const role = getStringRequired(req.query.role, 'Role');
      const departmentType = getString(req.query.departmentType);
      const departmentRole = getString(req.query.departmentRole);

      const permissions = await RBACService.getUserPermissions(
        hotelId,
        role as UserRole,
        departmentType as UserDepartmentType,
        departmentRole as UserDepartmentRole
      );

      res.json(successResponse(permissions, 'User permissions retrieved successfully'));
    } catch (error: any) {
      logger.error('Error fetching user permissions', { error });
      res.status(400).json(errorResponse(error.message));
    }
  }

  /**
   * Create or update permission rule
   */
  async upsertPermission(req: AuthenticatedRequest, res: Response) {
    try {
      const hotelId = getStringRequired(req.params.hotelId, 'Hotel ID');
      const {
        role,
        resourceType,
        permissions,
        departmentType,
        departmentRole,
        description,
      } = req.body;

      if (!role || !resourceType || !permissions || !Array.isArray(permissions)) {
        return res
          .status(400)
          .json(
            errorResponse(
              'Role, Resource Type, and Permissions array are required'
            )
          );
      }

      const permission = await RBACService.upsertPermission(
        hotelId,
        role as UserRole,
        resourceType as ResourceType,
        permissions as Permission[],
        departmentType as UserDepartmentType,
        departmentRole as UserDepartmentRole,
        description
      );

      logger.info('Permission upserted', {
        hotelId,
        role,
        resourceType,
        permissions,
      });

      res.json(successResponse(permission, 'Permission updated successfully'));
    } catch (error: any) {
      logger.error('Error upserting permission', { error });
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Delete permission rule
   */
  async deletePermission(req: AuthenticatedRequest, res: Response) {
    try {
      const id = getStringRequired(req.params.id, 'Permission ID');
      const deleted = await RBACService.deletePermission(id);

      if (!deleted) {
        return res.status(404).json(errorResponse('Permission not found'));
      }

      logger.info('Permission deleted', { id });
      res.json(successResponse(null, 'Permission deleted successfully'));
    } catch (error: any) {
      logger.error('Error deleting permission', { error });
      res.status(400).json(errorResponse(error.message));
    }
  }

  /**
   * Disable permission rule
   */
  async disablePermission(req: AuthenticatedRequest, res: Response) {
    try {
      const id = getStringRequired(req.params.id, 'Permission ID');
      const disabled = await RBACService.disablePermission(id);

      if (!disabled) {
        return res.status(404).json(errorResponse('Permission not found'));
      }

      logger.info('Permission disabled', { id });
      res.json(successResponse(null, 'Permission disabled successfully'));
    } catch (error: any) {
      logger.error('Error disabling permission', { error });
      res.status(400).json(errorResponse(error.message));
    }
  }

  /**
   * Enable permission rule
   */
  async enablePermission(req: AuthenticatedRequest, res: Response) {
    try {
      const id = getStringRequired(req.params.id, 'Permission ID');
      const enabled = await RBACService.enablePermission(id);

      if (!enabled) {
        return res.status(404).json(errorResponse('Permission not found'));
      }

      logger.info('Permission enabled', { id });
      res.json(successResponse(null, 'Permission enabled successfully'));
    } catch (error: any) {
      logger.error('Error enabling permission', { error });
      res.status(400).json(errorResponse(error.message));
    }
  }

  /**
   * Clone permissions from one role to another
   */
  async clonePermissions(req: AuthenticatedRequest, res: Response) {
    try {
      const hotelId = getStringRequired(req.params.hotelId, 'Hotel ID');
      const { sourceRole, targetRole } = req.body;

      if (!sourceRole || !targetRole) {
        return res
          .status(400)
          .json(errorResponse('Source Role and Target Role are required'));
      }

      const count = await RBACService.clonePermissions(
        hotelId,
        sourceRole as UserRole,
        targetRole as UserRole
      );

      logger.info('Permissions cloned', {
        hotelId,
        sourceRole,
        targetRole,
        count,
      });

      res.json(
        successResponse(
          { count },
          `${count} permissions cloned successfully`
        )
      );
    } catch (error: any) {
      logger.error('Error cloning permissions', { error });
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Check if user has specific permission
   */
  async checkPermission(req: AuthenticatedRequest, res: Response) {
    try {
      const hotelId = getStringRequired(req.params.hotelId, 'Hotel ID');
      const role = getStringRequired(req.query.role, 'Role');
      const resourceType = getStringRequired(req.query.resourceType, 'Resource Type');
      const action = getStringRequired(req.query.action, 'Action');
      const departmentType = getString(req.query.departmentType);
      const departmentRole = getString(req.query.departmentRole);

      const hasPermission = await RBACService.hasPermission(
        hotelId,
        role as UserRole,
        departmentType as UserDepartmentType,
        departmentRole as UserDepartmentRole,
        resourceType as ResourceType,
        action as Permission
      );

      res.json(
        successResponse(
          { hasPermission },
          'Permission check completed'
        )
      );
    } catch (error: any) {
      logger.error('Error checking permission', { error });
      res.status(400).json(errorResponse(error.message));
    }
  }

  /**
   * Get available permissions and resource types
   */
  async getAvailableOptions(req: AuthenticatedRequest, res: Response) {
    try {
      const availablePermissions = Object.values(Permission);
      const availableResourceTypes = Object.values(ResourceType);
      const availableRoles = Object.values(UserRole);
      const availableDepartmentTypes = Object.values(UserDepartmentType);
      const availableDepartmentRoles = Object.values(UserDepartmentRole);

      res.json(
        successResponse({
          permissions: availablePermissions,
          resourceTypes: availableResourceTypes,
          roles: availableRoles,
          departmentTypes: availableDepartmentTypes,
          departmentRoles: availableDepartmentRoles,
        }, 'Available options retrieved')
      );
    } catch (error: any) {
      logger.error('Error getting available options', { error });
      res.status(500).json(errorResponse(error.message));
    }
  }
}

export default new RBACController();
