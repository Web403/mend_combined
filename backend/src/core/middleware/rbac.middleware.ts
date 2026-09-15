import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { AdminRole } from '../../shared/enums/admin';
import { Permission, ResourceType } from '../../shared/enums/rbac';
import RBACService from '../../modules/rbac/rbac.service';
import { logger } from '../utils/logger';

export interface AuthRule {
  roles?: string[];
  departmentTypes?: string[];
  departmentRoles?: string[];
  permissions?: Permission[];
  resourceType?: ResourceType;
}

/**
 * Middleware factory to authorize users based on user role, department type, and department role.
 * A request is authorized if it matches any of the rules (OR relationship between rules).
 * Within a single rule, all specified conditions must match (AND relationship).
 * 
 * NEW: Supports fine-grained permission checking via permission + resourceType
 */
export const authorize = (...rules: AuthRule[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const userRoles = req.user.roles || [];
    const userDeptType = req.user.departmentType;
    const userDeptRole = req.user.departmentRole;
    const userHotelId = req.user.hotelId;

    if (rules.length === 0) {
      next();
      return;
    }

    try {
      const isAuthorized = await Promise.all(
        rules.map(async (rule) => {
          // 1. Check user roles (if specified in rule)
          if (rule.roles && rule.roles.length > 0) {
            const hasRole = userRoles.some((role) => rule.roles!.includes(role));
            if (!hasRole) return false;
          }

          // 2. Check department types (if specified in rule)
          if (rule.departmentTypes && rule.departmentTypes.length > 0) {
            if (!userDeptType || !rule.departmentTypes.includes(userDeptType)) {
              return false;
            }
          }

          // 3. Check department roles (if specified in rule)
          if (rule.departmentRoles && rule.departmentRoles.length > 0) {
            if (!userDeptRole || !rule.departmentRoles.includes(userDeptRole)) {
              return false;
            }
          }

          // 4. Check fine-grained permissions (if specified in rule)
          if (rule.permissions && rule.permissions.length > 0 && rule.resourceType && userHotelId) {
            const hasPermission = await Promise.all(
              rule.permissions.map((permission) =>
                RBACService.hasPermission(
                  userHotelId,
                  userRoles[0] as any,
                  userDeptType as any,
                  userDeptRole as any,
                  rule.resourceType!,
                  permission
                )
              )
            );

            // At least one permission must be granted
            if (!hasPermission.some((p) => p)) return false;
          }

          // If all specified checks in this rule passed
          return true;
        })
      );

      if (!isAuthorized.some((auth) => auth)) {
        res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
        return;
      }

      next();
    } catch (error: any) {
      logger.error('Error in authorization middleware', { error });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
};

/**
 * Middleware factory to authorize users based on their roles.
 * Provided for backward compatibility.
 * @param allowedRoles Array of roles that are allowed to access the route.
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return authorize({ roles: allowedRoles });
};

/**
 * Middleware factory for fine-grained permission checking
 * @param resourceType The resource being accessed
 * @param permissions Array of permissions required
 */
export const authorizePermission = (
  resourceType: ResourceType,
  ...permissions: Permission[]
) => {
  return authorize({ resourceType, permissions });
};
