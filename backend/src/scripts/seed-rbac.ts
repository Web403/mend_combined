import RBACRepository from '../modules/rbac/rbac.repository';
import { UserRole, UserDepartmentType, UserDepartmentRole } from '../shared/enums/user';
import { Permission, ResourceType } from '../shared/enums/rbac';
import { logger } from '../core/utils/logger';

/**
 * RBAC Seeder - Sets up default permissions for different roles
 * Run this script to initialize permissions for a hotel
 */

interface PermissionConfig {
  role: UserRole;
  departmentType?: UserDepartmentType;
  departmentRole?: UserDepartmentRole;
  resourceType: ResourceType;
  permissions: Permission[];
  description?: string;
}

// Default permissions for each role
const defaultPermissions: PermissionConfig[] = [
  // ========== ADMIN ROLE ==========
  {
    role: UserRole.ADMIN,
    resourceType: ResourceType.USERS,
    permissions: [
      Permission.VIEW_USERS,
      Permission.CREATE_USERS,
      Permission.EDIT_USERS,
      Permission.DELETE_USERS,
      Permission.ASSIGN_ROLES,
    ],
    description: 'Admin has full access to user management',
  },
  {
    role: UserRole.ADMIN,
    resourceType: ResourceType.ROSTER,
    permissions: [
      Permission.VIEW_ROSTER,
      Permission.CREATE_ROSTER,
      Permission.EDIT_ROSTER,
      Permission.DELETE_ROSTER,
      Permission.PUBLISH_ROSTER,
    ],
    description: 'Admin has full access to roster management',
  },
  {
    role: UserRole.ADMIN,
    resourceType: ResourceType.ATTENDANCE,
    permissions: [
      Permission.VIEW_ATTENDANCE,
      Permission.MARK_ATTENDANCE,
      Permission.EDIT_ATTENDANCE,
      Permission.APPROVE_ATTENDANCE,
    ],
    description: 'Admin has full access to attendance',
  },
  {
    role: UserRole.ADMIN,
    resourceType: ResourceType.SHIFT,
    permissions: [
      Permission.VIEW_SHIFT,
      Permission.CREATE_SHIFT,
      Permission.EDIT_SHIFT,
      Permission.DELETE_SHIFT,
    ],
    description: 'Admin has full access to shift management',
  },
  {
    role: UserRole.ADMIN,
    resourceType: ResourceType.GIGS,
    permissions: [
      Permission.VIEW_GIGS,
      Permission.CREATE_GIGS,
      Permission.EDIT_GIGS,
      Permission.DELETE_GIGS,
    ],
    description: 'Admin has full access to gigs',
  },
  {
    role: UserRole.ADMIN,
    resourceType: ResourceType.BOOKINGS,
    permissions: [
      Permission.VIEW_BOOKINGS,
      Permission.CREATE_BOOKINGS,
      Permission.EDIT_BOOKINGS,
      Permission.CANCEL_BOOKINGS,
    ],
    description: 'Admin has full access to bookings',
  },
  {
    role: UserRole.ADMIN,
    resourceType: ResourceType.PAYMENTS,
    permissions: [
      Permission.VIEW_PAYMENTS,
      Permission.PROCESS_PAYMENTS,
      Permission.REFUND_PAYMENTS,
    ],
    description: 'Admin has full access to payments',
  },
  {
    role: UserRole.ADMIN,
    resourceType: ResourceType.RBAC,
    permissions: [Permission.MANAGE_RBAC],
    description: 'Admin can manage RBAC settings',
  },
  {
    role: UserRole.ADMIN,
    resourceType: ResourceType.REPORTS,
    permissions: [Permission.VIEW_REPORTS, Permission.GENERATE_REPORTS],
    description: 'Admin can view and generate reports',
  },

  // ========== MANAGER ROLE ==========
  {
    role: UserRole.MANAGER,
    resourceType: ResourceType.USERS,
    permissions: [Permission.VIEW_USERS, Permission.EDIT_USERS],
    description: 'Manager can view and edit users',
  },
  {
    role: UserRole.MANAGER,
    resourceType: ResourceType.ROSTER,
    permissions: [
      Permission.VIEW_ROSTER,
      Permission.CREATE_ROSTER,
      Permission.EDIT_ROSTER,
      Permission.PUBLISH_ROSTER,
    ],
    description: 'Manager can manage rosters',
  },
  {
    role: UserRole.MANAGER,
    resourceType: ResourceType.ATTENDANCE,
    permissions: [
      Permission.VIEW_ATTENDANCE,
      Permission.MARK_ATTENDANCE,
      Permission.APPROVE_ATTENDANCE,
    ],
    description: 'Manager can view and approve attendance',
  },
  {
    role: UserRole.MANAGER,
    resourceType: ResourceType.SHIFT,
    permissions: [Permission.VIEW_SHIFT, Permission.CREATE_SHIFT, Permission.EDIT_SHIFT],
    description: 'Manager can manage shifts',
  },
  {
    role: UserRole.MANAGER,
    resourceType: ResourceType.GIGS,
    permissions: [Permission.VIEW_GIGS, Permission.CREATE_GIGS, Permission.EDIT_GIGS],
    description: 'Manager can view and manage gigs',
  },
  {
    role: UserRole.MANAGER,
    resourceType: ResourceType.BOOKINGS,
    permissions: [Permission.VIEW_BOOKINGS, Permission.CREATE_BOOKINGS, Permission.EDIT_BOOKINGS],
    description: 'Manager can manage bookings',
  },
  {
    role: UserRole.MANAGER,
    resourceType: ResourceType.REPORTS,
    permissions: [Permission.VIEW_REPORTS, Permission.GENERATE_REPORTS],
    description: 'Manager can view and generate reports',
  },

  // ========== EMPLOYEE ROLE ==========
  {
    role: UserRole.EMPLOYEE,
    resourceType: ResourceType.ROSTER,
    permissions: [Permission.VIEW_ROSTER],
    description: 'Employee can view rosters',
  },
  {
    role: UserRole.EMPLOYEE,
    resourceType: ResourceType.ATTENDANCE,
    permissions: [Permission.VIEW_ATTENDANCE, Permission.MARK_ATTENDANCE],
    description: 'Employee can view and mark attendance',
  },
  {
    role: UserRole.EMPLOYEE,
    resourceType: ResourceType.SHIFT,
    permissions: [Permission.VIEW_SHIFT],
    description: 'Employee can view shifts',
  },
  {
    role: UserRole.EMPLOYEE,
    resourceType: ResourceType.GIGS,
    permissions: [Permission.VIEW_GIGS],
    description: 'Employee can view gigs',
  },
  {
    role: UserRole.EMPLOYEE,
    resourceType: ResourceType.BOOKINGS,
    permissions: [Permission.VIEW_BOOKINGS],
    description: 'Employee can view bookings',
  },

  // ========== DEPARTMENT-SPECIFIC PERMISSIONS ==========
  // Front Office Manager
  {
    role: UserRole.MANAGER,
    departmentType: UserDepartmentType.FRONT_OFFICE,
    departmentRole: UserDepartmentRole.FRONT_OFFICE_MANAGER,
    resourceType: ResourceType.GIGS,
    permissions: [
      Permission.VIEW_GIGS,
      Permission.CREATE_GIGS,
      Permission.EDIT_GIGS,
      Permission.DELETE_GIGS,
    ],
    description: 'Front Office Manager can fully manage gigs',
  },

  // Housekeeping Manager
  {
    role: UserRole.MANAGER,
    departmentType: UserDepartmentType.HOUSEKEEPING,
    departmentRole: UserDepartmentRole.HOUSEKEEPING_MANAGER,
    resourceType: ResourceType.ROSTER,
    permissions: [
      Permission.VIEW_ROSTER,
      Permission.CREATE_ROSTER,
      Permission.EDIT_ROSTER,
      Permission.PUBLISH_ROSTER,
    ],
    description: 'Housekeeping Manager can manage rosters',
  },

  // Finance Manager
  {
    role: UserRole.MANAGER,
    departmentType: UserDepartmentType.FINANCE_AND_ACCOUNTS,
    resourceType: ResourceType.PAYMENTS,
    permissions: [
      Permission.VIEW_PAYMENTS,
      Permission.PROCESS_PAYMENTS,
      Permission.REFUND_PAYMENTS,
    ],
    description: 'Finance Manager can manage payments',
  },
];

export async function seedRBACPermissions(hotelId: string) {
  try {
    logger.info('Starting RBAC permission seeding', { hotelId });

    // Check if permissions already exist for this hotel
    const existingCount = await RBACRepository.count({ hotelId });
    if (existingCount > 0) {
      logger.info('RBAC permissions already exist for this hotel, skipping seeding', { hotelId });
      return;
    }

    const permissionsToCreate = defaultPermissions.map((config) => ({
      ...config,
      hotelId,
      isActive: true,
      priority: 0,
    }));

    await RBACRepository.insertMany(permissionsToCreate);

    logger.info('RBAC permissions seeded successfully', {
      hotelId,
      count: permissionsToCreate.length,
    });
  } catch (error: any) {
    logger.error('Error seeding RBAC permissions', { error, hotelId });
    throw error;
  }
}

export default {
  seedRBACPermissions,
  defaultPermissions,
};
