# Role-Based Access Control (RBAC) System

## Overview

This is a comprehensive, restaurant-independent RBAC system that allows fine-grained permission management based on:
- **User Role** (ADMIN, MANAGER, EMPLOYEE, etc.)
- **Department Type** (FRONT_OFFICE, HOUSEKEEPING, KITCHEN, etc.)
- **Department Role** (FRONT_OFFICE_MANAGER, CHEF, WAITER, etc.)

Permissions can be customized per restaurant/hotel and are managed through the admin dashboard without requiring code changes.

## Architecture

### Components

1. **RBACPermissionModel** - MongoDB model storing permission rules
2. **RBACService** - Business logic for permission checking and management
3. **RBACRepository** - Data access layer
4. **RBACController** - HTTP handlers for admin APIs
5. **rbacRoutes** - REST API endpoints
6. **authorize middleware** - Enhanced middleware for request authorization

### Key Concepts

- **Permission**: Specific action (e.g., `CREATE_USERS`, `EDIT_ROSTER`)
- **Resource Type**: Target resource category (e.g., `USERS`, `ROSTER`, `PAYMENTS`)
- **Permission Rule**: A configuration linking role + department + permissions to resources
- **Priority**: When multiple rules match, higher priority takes precedence

## Database Schema

### RBACPermission Collection

```typescript
{
  _id: ObjectId,
  hotelId: ObjectId,              // Restaurant/Hotel ID (for independence)
  role: UserRole,                 // ADMIN, MANAGER, EMPLOYEE, etc.
  departmentType?: UserDepartmentType,  // Optional: FRONT_OFFICE, etc.
  departmentRole?: UserDepartmentRole,  // Optional: MANAGER, CHEF, etc.
  permissions: Permission[],      // Array of allowed actions
  resourceType: ResourceType,     // USERS, ROSTER, PAYMENTS, etc.
  description?: string,
  isActive: boolean,
  priority: number,               // 0-100, higher wins
  createdAt: Date,
  updatedAt: Date
}
```

## Available Permissions

```typescript
enum Permission {
  // CRUD Operations
  CREATE, READ, UPDATE, DELETE, LIST, EXPORT,
  
  // User Management
  VIEW_USERS, CREATE_USERS, EDIT_USERS, DELETE_USERS, ASSIGN_ROLES,
  
  // Roster Management
  VIEW_ROSTER, CREATE_ROSTER, EDIT_ROSTER, DELETE_ROSTER, PUBLISH_ROSTER,
  
  // Attendance
  VIEW_ATTENDANCE, MARK_ATTENDANCE, EDIT_ATTENDANCE, APPROVE_ATTENDANCE,
  
  // Shift Management
  VIEW_SHIFT, CREATE_SHIFT, EDIT_SHIFT, DELETE_SHIFT,
  
  // Gig & Booking Management
  VIEW_GIGS, CREATE_GIGS, EDIT_GIGS, DELETE_GIGS,
  VIEW_BOOKINGS, CREATE_BOOKINGS, EDIT_BOOKINGS, CANCEL_BOOKINGS,
  
  // Payment & Reporting
  VIEW_PAYMENTS, PROCESS_PAYMENTS, REFUND_PAYMENTS,
  VIEW_REPORTS, GENERATE_REPORTS,
  
  // Admin Functions
  MANAGE_RBAC, MANAGE_ADMINS, VIEW_AUDIT_LOG,
  
  // And more...
}
```

## Resource Types

```typescript
enum ResourceType {
  USERS, ROSTER, ATTENDANCE, SHIFT, GIGS, BOOKINGS, PAYMENTS,
  REPORTS, SETTINGS, JOBS, APPLICATIONS, TASKS, COURSES, RBAC, ADMINS, AUDIT_LOG
}
```

## API Endpoints

### Get Available Options (For UI)
```
GET /rbac/available-options
- Returns all available permissions, resource types, roles, departments, etc.
- Used for populating dropdowns in admin dashboard
```

### Get Hotel Permissions
```
GET /rbac/hotel/:hotelId
Authorization: Required - MANAGE_RBAC permission
- Returns all permission rules for a specific hotel
```

### Get Permissions by Role
```
GET /rbac/hotel/:hotelId/role?role=MANAGER&departmentType=FRONT_OFFICE&departmentRole=RECEPTIONIST
Authorization: Required
- Returns permissions for specific role + department combination
```

### Get User's Effective Permissions
```
GET /rbac/hotel/:hotelId/user-permissions?role=MANAGER&departmentType=FRONT_OFFICE
Authorization: Required
- Returns all resources and actions available to a user
- Merges overlapping permissions intelligently
```

### Check Permission
```
GET /rbac/hotel/:hotelId/check?role=MANAGER&resourceType=ROSTER&action=CREATE_ROSTER
Authorization: Required
- Quick permission check
- Returns: { hasPermission: boolean }
```

### Create/Update Permission Rule
```
POST /rbac/hotel/:hotelId/permission
Authorization: Required - MANAGE_RBAC permission

Body: {
  role: "MANAGER",
  resourceType: "ROSTER",
  permissions: ["VIEW_ROSTER", "CREATE_ROSTER", "EDIT_ROSTER"],
  departmentType: "FRONT_OFFICE",        // Optional
  departmentRole: "FRONT_OFFICE_MANAGER", // Optional
  description: "Front office managers can manage rosters"
}
```

### Delete Permission Rule
```
DELETE /rbac/permission/:id
Authorization: Required - MANAGE_RBAC permission
```

### Enable/Disable Permission Rule
```
PATCH /rbac/permission/:id/enable
PATCH /rbac/permission/:id/disable
Authorization: Required - MANAGE_RBAC permission
```

### Clone Permissions
```
POST /rbac/hotel/:hotelId/clone-permissions
Authorization: Required - MANAGE_RBAC permission

Body: {
  sourceRole: "MANAGER",
  targetRole: "SUPERVISOR"
}
- Copies all permission rules from one role to another
```

## Usage Examples

### 1. Basic Authorization (Backward Compatible)

```typescript
// Check if user has specific roles
router.get('/endpoint', authorize({ roles: ['ADMIN', 'MANAGER'] }), handler);

// Check department type
router.get('/endpoint', authorize({ departmentTypes: ['FRONT_OFFICE'] }), handler);

// Combined checks (AND logic)
router.get('/endpoint', authorize({ 
  roles: ['MANAGER'],
  departmentTypes: ['FRONT_OFFICE']
}), handler);

// Multiple rules (OR logic)
router.get('/endpoint', 
  authorize(
    { roles: ['ADMIN'] },
    { roles: ['MANAGER'], departmentTypes: ['FRONT_OFFICE'] }
  ),
  handler
);
```

### 2. Fine-Grained Permission Authorization (NEW)

```typescript
// Check if user can perform specific action
router.post('/roster',
  authorize({
    resourceType: ResourceType.ROSTER,
    permissions: [Permission.CREATE_ROSTER]
  }),
  handler
);

// Multiple permissions (user needs at least one)
router.patch('/roster/:id',
  authorize({
    resourceType: ResourceType.ROSTER,
    permissions: [Permission.EDIT_ROSTER, Permission.APPROVE_ROSTER]
  }),
  handler
);

// Shorthand helper
router.delete('/roster/:id',
  authorizePermission(ResourceType.ROSTER, Permission.DELETE_ROSTER),
  handler
);
```

### 3. Combining Both Approaches

```typescript
// Must be admin OR must have specific permissions
router.get('/reports',
  authorize(
    { roles: ['ADMIN'] },
    {
      resourceType: ResourceType.REPORTS,
      permissions: [Permission.VIEW_REPORTS]
    }
  ),
  handler
);
```

## Service Usage

### Check Permission Programmatically

```typescript
import RBACService from './rbac.service';

// Check single permission
const hasPermission = await RBACService.hasPermission(
  hotelId,
  'MANAGER',
  'FRONT_OFFICE',
  'RECEPTIONIST',
  ResourceType.ROSTER,
  Permission.CREATE_ROSTER
);

// Get all user permissions
const userPerms = await RBACService.getUserPermissions(
  hotelId,
  'MANAGER',
  'FRONT_OFFICE'
);

// Create/Update permission
await RBACService.upsertPermission(
  hotelId,
  UserRole.MANAGER,
  ResourceType.ROSTER,
  [Permission.VIEW_ROSTER, Permission.CREATE_ROSTER],
  UserDepartmentType.FRONT_OFFICE
);

// Clone permissions from one role to another
const count = await RBACService.clonePermissions(
  hotelId,
  UserRole.MANAGER,
  UserRole.SUPERVISOR
);
```

## Seeding Default Permissions

### Option 1: Using the Seeder Script

```typescript
import { seedRBACPermissions } from './scripts/seed-rbac';

// In your bootstrap/initialization code
await seedRBACPermissions(hotelId);
```

### Option 2: Manual API Call

```bash
# Create permission via API
curl -X POST http://localhost:3000/rbac/hotel/507f1f77bcf86cd799439011/permission \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "MANAGER",
    "resourceType": "ROSTER",
    "permissions": ["VIEW_ROSTER", "CREATE_ROSTER"],
    "description": "Managers can view and create rosters"
  }'
```

## Permission Lookup Logic

The system uses a cascading lookup strategy when checking permissions:

1. **Exact Match**: role + departmentType + departmentRole
2. **Role + DepartmentType**: Ignoring departmentRole
3. **Role + DepartmentRole**: Ignoring departmentType
4. **Role Only**: Generic permissions

This allows for flexible, hierarchical permission management.

### Example

```
User: Manager in Front Office as Receptionist
Hotel: 507f...

Looking for: ROSTER → CREATE_ROSTER

Lookup order:
1. MANAGER + FRONT_OFFICE + RECEPTIONIST + ROSTER + CREATE_ROSTER?
2. MANAGER + FRONT_OFFICE + (any/none) + ROSTER + CREATE_ROSTER?
3. MANAGER + (any/none) + RECEPTIONIST + ROSTER + CREATE_ROSTER?
4. MANAGER + (any/none) + (any/none) + ROSTER + CREATE_ROSTER?
```

## Restaurant Independence

Permissions are completely restaurant-independent through the `hotelId` field:

- Each restaurant has its own permission matrix
- Permissions created for Restaurant A don't affect Restaurant B
- Admins can customize permissions per restaurant
- Same user role may have different permissions across restaurants

## Practical Examples

### Scenario 1: Hotel Receptionist Setup

```typescript
// Receptionists can only:
// - View rosters and shifts
// - Mark their own attendance
// - View available gigs

await RBACService.upsertPermission(
  hotelId,
  UserRole.EMPLOYEE,
  ResourceType.ROSTER,
  [Permission.VIEW_ROSTER],
  UserDepartmentType.FRONT_OFFICE,
  UserDepartmentRole.RECEPTIONIST
);

await RBACService.upsertPermission(
  hotelId,
  UserRole.EMPLOYEE,
  ResourceType.ATTENDANCE,
  [Permission.VIEW_ATTENDANCE, Permission.MARK_ATTENDANCE],
  UserDepartmentType.FRONT_OFFICE,
  UserDepartmentRole.RECEPTIONIST
);

await RBACService.upsertPermission(
  hotelId,
  UserRole.EMPLOYEE,
  ResourceType.GIGS,
  [Permission.VIEW_GIGS],
  UserDepartmentType.FRONT_OFFICE,
  UserDepartmentRole.RECEPTIONIST
);
```

### Scenario 2: Finance Manager Setup

```typescript
// Finance managers can manage payments and view reports

await RBACService.upsertPermission(
  hotelId,
  UserRole.MANAGER,
  ResourceType.PAYMENTS,
  [Permission.VIEW_PAYMENTS, Permission.PROCESS_PAYMENTS, Permission.REFUND_PAYMENTS],
  UserDepartmentType.FINANCE_AND_ACCOUNTS
);

await RBACService.upsertPermission(
  hotelId,
  UserRole.MANAGER,
  ResourceType.REPORTS,
  [Permission.VIEW_REPORTS, Permission.GENERATE_REPORTS],
  UserDepartmentType.FINANCE_AND_ACCOUNTS
);
```

## Best Practices

1. **Principle of Least Privilege**: Grant only necessary permissions
2. **Department-Specific Rules**: Use `departmentType` and `departmentRole` for fine-grained control
3. **Seeding**: Always seed default permissions when a new hotel is created
4. **Audit**: Log permission changes for compliance
5. **Testing**: Test permission rules thoroughly before deployment
6. **Priority**: Use priority field when rules overlap
7. **Caching**: Consider caching user permissions for better performance

## Troubleshooting

### User doesn't have expected permission

1. Check if permission rule exists: `GET /rbac/hotel/:hotelId/role?role=MANAGER`
2. Verify rule is active: `isActive` should be `true`
3. Check cascade lookup: Try with less specific criteria
4. Verify hotelId matches

### Permission check always returns false

1. Ensure `isActive: true` in rule
2. Check exact role, departmentType, departmentRole match
3. Verify resourceType matches
4. Check if permission is included in the array

### Performance issues

1. Ensure indexes are created (automatic with model)
2. Use specific role/dept queries instead of `find({})`
3. Implement permission caching at application level
4. Monitor MongoDB query performance

## Migration Guide

### From Simple Role-Based to RBAC

```typescript
// Before: Simple middleware
router.get('/roster', authorizeRoles('MANAGER'), handler);

// After: Fine-grained permissions
router.get('/roster',
  authorize({
    resourceType: ResourceType.ROSTER,
    permissions: [Permission.VIEW_ROSTER]
  }),
  handler
);

// Seed permissions matching old rules
await RBACService.upsertPermission(
  hotelId,
  UserRole.MANAGER,
  ResourceType.ROSTER,
  [Permission.VIEW_ROSTER, Permission.CREATE_ROSTER, ...],
);
```

## Support

For issues or questions about the RBAC system, please check:
1. MongoDB indexes are created
2. hotelId is properly set in user context
3. Permission rules are properly seeded
4. User roles match defined enums
