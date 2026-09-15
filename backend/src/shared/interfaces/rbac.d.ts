import mongoose from 'mongoose';
import { IBaseDocument } from './base.d';
import { UserRole, UserDepartmentType, UserDepartmentRole } from '../enums/user';
import { Permission, ResourceType } from '../enums/rbac';

export interface IRBACPermission extends IBaseDocument {
  hotelId: mongoose.Types.ObjectId | string; // Restaurant/Hotel ID for independence
  
  // Role Configuration
  role: UserRole;
  departmentType?: UserDepartmentType;
  departmentRole?: UserDepartmentRole;

  // Permissions
  permissions: Permission[];

  // Resource Type this permission applies to
  resourceType: ResourceType;

  // Additional metadata
  description?: string;
  isActive: boolean;
  priority?: number; // Higher priority rules override lower ones
}

export interface IRBACMatrix {
  hotelId: string;
  role: UserRole;
  departmentType?: UserDepartmentType;
  departmentRole?: UserDepartmentRole;
  resourcePermissions: {
    resourceType: ResourceType;
    permissions: Permission[];
  }[];
  isActive: boolean;
}

export interface IPermissionCheck {
  hotelId: string;
  role: UserRole;
  departmentType?: UserDepartmentType;
  departmentRole?: UserDepartmentRole;
  resourceType: ResourceType;
  action: Permission;
}

export interface IUserPermissions {
  userId: string;
  hotelId: string;
  role: UserRole;
  departmentType?: UserDepartmentType;
  departmentRole?: UserDepartmentRole;
  permissions: {
    resourceType: ResourceType;
    allowedActions: Permission[];
  }[];
}
