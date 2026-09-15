import { RBACPermissionModel } from './rbac.model';
import { IRBACPermission, IPermissionCheck, IUserPermissions } from '../../shared/interfaces/rbac.d';
import { Permission, ResourceType } from '../../shared/enums/rbac';
import { UserRole, UserDepartmentType, UserDepartmentRole } from '../../shared/enums/user';
import { logger } from '../../core/utils/logger';

export class RBACService {
  /**
   * Check if a user has a specific permission for a resource
   */
  async hasPermission(
    hotelId: string,
    role: UserRole,
    departmentType: UserDepartmentType | undefined,
    departmentRole: UserDepartmentRole | undefined,
    resourceType: ResourceType,
    action: Permission
  ): Promise<boolean> {
    try {
      // Build query with specific conditions first, then fall back to less specific
      const query: any = {
        hotelId,
        isActive: true,
        resourceType,
        permissions: action,
      };

      // Try specific match first: role + departmentType + departmentRole
      if (departmentType && departmentRole) {
        query.role = role;
        query.departmentType = departmentType;
        query.departmentRole = departmentRole;

        const permission = await RBACPermissionModel.findOne(query);
        if (permission) {
          return true;
        }
      }

      // Try role + departmentType
      if (departmentType) {
        const query2: any = {
          hotelId,
          isActive: true,
          resourceType,
          permissions: action,
          role,
          departmentType,
          departmentRole: { $exists: false },
        };

        const permission = await RBACPermissionModel.findOne(query2);
        if (permission) {
          return true;
        }
      }

      // Try role + departmentRole
      if (departmentRole) {
        const query3: any = {
          hotelId,
          isActive: true,
          resourceType,
          permissions: action,
          role,
          departmentRole,
          departmentType: { $exists: false },
        };

        const permission = await RBACPermissionModel.findOne(query3);
        if (permission) {
          return true;
        }
      }

      // Fall back to role only
      const query4: any = {
        hotelId,
        isActive: true,
        resourceType,
        permissions: action,
        role,
        departmentType: { $exists: false },
        departmentRole: { $exists: false },
      };

      const permission = await RBACPermissionModel.findOne(query4);
      if (permission) {
        return true;
      }

      return false;
    } catch (error: any) {
      logger.error('Error checking permission', { error, hotelId, role });
      return false;
    }
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(
    hotelId: string,
    role: UserRole,
    departmentType?: UserDepartmentType,
    departmentRole?: UserDepartmentRole
  ): Promise<IUserPermissions> {
    try {
      const permissions = await RBACPermissionModel.find({
        hotelId,
        isActive: true,
        $or: [
          { role, departmentType: { $exists: false }, departmentRole: { $exists: false } },
          { role, departmentType, departmentRole: { $exists: false } },
          { role, departmentRole, departmentType: { $exists: false } },
          { role, departmentType, departmentRole },
        ],
      }).sort({ priority: -1 });

      const resourcePermissionsMap = new Map<ResourceType, Set<Permission>>();

      // Aggregate permissions by resource type
      for (const perm of permissions) {
        const existing = resourcePermissionsMap.get(perm.resourceType) || new Set();
        perm.permissions.forEach((p) => existing.add(p));
        resourcePermissionsMap.set(perm.resourceType, existing);
      }

      const resourcePermissions = Array.from(resourcePermissionsMap.entries()).map(
        ([resourceType, allowedActions]) => ({
          resourceType,
          allowedActions: Array.from(allowedActions),
        })
      );

      return {
        userId: '', // Will be filled by caller if needed
        hotelId,
        role,
        departmentType,
        departmentRole,
        permissions: resourcePermissions,
      };
    } catch (error: any) {
      logger.error('Error getting user permissions', { error, hotelId, role });
      return {
        userId: '',
        hotelId,
        role,
        departmentType,
        departmentRole,
        permissions: [],
      };
    }
  }

  /**
   * Create or update permission rule
   */
  async upsertPermission(
    hotelId: string,
    role: UserRole,
    resourceType: ResourceType,
    permissions: Permission[],
    departmentType?: UserDepartmentType,
    departmentRole?: UserDepartmentRole,
    description?: string
  ): Promise<IRBACPermission> {
    try {
      const query: any = {
        hotelId,
        role,
        resourceType,
      };

      if (departmentType) query.departmentType = departmentType;
      if (departmentRole) query.departmentRole = departmentRole;

      const updated = await RBACPermissionModel.findOneAndUpdate(
        query,
        {
          $set: {
            permissions,
            description,
            isActive: true,
            hotelId,
            role,
            resourceType,
            ...(departmentType && { departmentType }),
            ...(departmentRole && { departmentRole }),
          },
        },
        { upsert: true, new: true }
      );

      logger.info('Permission updated/created', { hotelId, role, resourceType });
      return updated;
    } catch (error: any) {
      logger.error('Error upserting permission', { error, hotelId, role, resourceType });
      throw error;
    }
  }

  /**
   * Delete permission rule
   */
  async deletePermission(id: string): Promise<boolean> {
    try {
      const result = await RBACPermissionModel.findByIdAndDelete(id);
      return !!result;
    } catch (error: any) {
      logger.error('Error deleting permission', { error, id });
      throw error;
    }
  }

  /**
   * Get all permissions for a hotel
   */
  async getHotelPermissions(hotelId: string): Promise<IRBACPermission[]> {
    try {
      return await RBACPermissionModel.find({ hotelId, isActive: true }).sort({
        role: 1,
        departmentType: 1,
        departmentRole: 1,
        resourceType: 1,
      });
    } catch (error: any) {
      logger.error('Error getting hotel permissions', { error, hotelId });
      return [];
    }
  }

  /**
   * Get permissions by role and department
   */
  async getPermissionsByRoleAndDept(
    hotelId: string,
    role: UserRole,
    departmentType?: UserDepartmentType,
    departmentRole?: UserDepartmentRole
  ): Promise<IRBACPermission[]> {
    try {
      const query: any = {
        hotelId,
        role,
        isActive: true,
      };

      if (departmentType) query.departmentType = departmentType;
      if (departmentRole) query.departmentRole = departmentRole;

      return await RBACPermissionModel.find(query).sort({ resourceType: 1 });
    } catch (error: any) {
      logger.error('Error getting permissions by role and dept', { error, hotelId, role });
      return [];
    }
  }

  /**
   * Disable permission rule
   */
  async disablePermission(id: string): Promise<boolean> {
    try {
      const result = await RBACPermissionModel.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );
      return !!result;
    } catch (error: any) {
      logger.error('Error disabling permission', { error, id });
      throw error;
    }
  }

  /**
   * Enable permission rule
   */
  async enablePermission(id: string): Promise<boolean> {
    try {
      const result = await RBACPermissionModel.findByIdAndUpdate(
        id,
        { isActive: true },
        { new: true }
      );
      return !!result;
    } catch (error: any) {
      logger.error('Error enabling permission', { error, id });
      throw error;
    }
  }

  /**
   * Clone permissions from one role to another
   */
  async clonePermissions(
    hotelId: string,
    sourceRole: UserRole,
    targetRole: UserRole
  ): Promise<number> {
    try {
      const sourcePermissions = await RBACPermissionModel.find({
        hotelId,
        role: sourceRole,
        isActive: true,
      });

      if (sourcePermissions.length === 0) {
        return 0;
      }

      const newPermissions = sourcePermissions.map((perm) => ({
        ...perm.toObject(),
        _id: undefined,
        role: targetRole,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await RBACPermissionModel.insertMany(newPermissions);
      logger.info('Permissions cloned', { hotelId, sourceRole, targetRole, count: result.length });
      return result.length;
    } catch (error: any) {
      logger.error('Error cloning permissions', { error, hotelId, sourceRole, targetRole });
      throw error;
    }
  }
}

export default new RBACService();
