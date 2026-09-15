# RBAC Implementation Quick Start Guide

## What's Implemented

You now have a complete **restaurant-independent Role-Based Access Control (RBAC) system** that allows:
- Fine-grained permission management per restaurant
- Control based on role, department type, and department role
- Full admin dashboard integration for permission management
- No code changes needed to modify permissions

## Architecture Overview

```
┌─────────────────────────────────────────┐
│   Admin Dashboard (CRUD Permissions)    │
└──────────────┬──────────────────────────┘
               │
               ▼
        ┌─────────────────┐
        │ RBAC Controller │
        │   (HTTP API)    │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │  RBAC Service   │
        │ (Business Logic)│
        └────────┬────────┘
                 │
                 ▼
        ┌──────────────────────┐
        │ RBAC Repository      │
        │ (MongoDB Operations) │
        └────────┬─────────────┘
                 │
                 ▼
        ┌──────────────────────┐
        │ RBACPermission Model │
        │  (MongoDB Schema)     │
        └──────────────────────┘

Route Authorization Flow:
┌────────────┐
│  Request   │
└─────┬──────┘
      │
      ▼
┌──────────────────┐
│ Auth Middleware  │ (validates JWT, sets req.user)
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ RBAC Middleware      │ (checks permissions)
│ authorize()          │
└────────┬─────────────┘
         │
    ┌────┴──────┐
    │            │
   YES          NO
    │            │
    ▼            ▼
┌────────┐   ┌─────────────┐
│Handler │   │ 403 Forbidden│
└────────┘   └─────────────┘
```

## Database Schema

### RBACPermission Collection

```typescript
{
  _id: ObjectId,
  hotelId: ObjectId,                    // Restaurant identifier
  role: "ADMIN" | "MANAGER" | ...,      // User role
  departmentType?: "FRONT_OFFICE" | ..., // Optional: Department
  departmentRole?: "MANAGER" | ...,      // Optional: Specific role in department
  permissions: ["CREATE_USERS", "EDIT_ROSTER", ...],  // Allowed actions
  resourceType: "USERS" | "ROSTER" | ...,            // Resource category
  description: "Admin has full access to user management",
  isActive: true,
  priority: 0,
  createdAt: Date,
  updatedAt: Date
}
```

## Available Permissions (73 total)

```
Core: CREATE, READ, UPDATE, DELETE, LIST, EXPORT
Users: VIEW_USERS, CREATE_USERS, EDIT_USERS, DELETE_USERS, ASSIGN_ROLES
Roster: VIEW_ROSTER, CREATE_ROSTER, EDIT_ROSTER, DELETE_ROSTER, PUBLISH_ROSTER
Attendance: VIEW_ATTENDANCE, MARK_ATTENDANCE, EDIT_ATTENDANCE, APPROVE_ATTENDANCE
Shifts: VIEW_SHIFT, CREATE_SHIFT, EDIT_SHIFT, DELETE_SHIFT
Gigs: VIEW_GIGS, CREATE_GIGS, EDIT_GIGS, DELETE_GIGS
Bookings: VIEW_BOOKINGS, CREATE_BOOKINGS, EDIT_BOOKINGS, CANCEL_BOOKINGS
Payments: VIEW_PAYMENTS, PROCESS_PAYMENTS, REFUND_PAYMENTS
Reports: VIEW_REPORTS, GENERATE_REPORTS
Jobs: VIEW_JOBS, POST_JOBS, EDIT_JOBS, DELETE_JOBS
Applications: VIEW_APPLICATIONS, MANAGE_APPLICATIONS
Tasks: VIEW_TASKS, CREATE_TASKS, EDIT_TASKS, DELETE_TASKS, ASSIGN_TASKS
Courses: VIEW_COURSES, CREATE_COURSES, EDIT_COURSES, DELETE_COURSES, ENROLL_COURSES
Admin: MANAGE_RBAC, MANAGE_ADMINS, VIEW_AUDIT_LOG
```

## Resource Types (16 total)

```
USERS, ROSTER, ATTENDANCE, SHIFT, GIGS, BOOKINGS, PAYMENTS,
REPORTS, SETTINGS, JOBS, APPLICATIONS, TASKS, COURSES, RBAC,
ADMINS, AUDIT_LOG
```

## Admin API Endpoints

### 1. Get Available Options (For Dropdowns in UI)
```bash
GET /rbac/available-options

Response:
{
  "data": {
    "permissions": ["CREATE", "READ", "UPDATE", ...],
    "resourceTypes": ["USERS", "ROSTER", ...],
    "roles": ["ADMIN", "MANAGER", ...],
    "departmentTypes": ["FRONT_OFFICE", "KITCHEN", ...],
    "departmentRoles": ["MANAGER", "RECEPTIONIST", ...]
  }
}
```

### 2. Get All Permissions for a Hotel
```bash
GET /rbac/hotel/{hotelId}
Authorization: Bearer <token with MANAGE_RBAC permission>

Response:
{
  "data": [
    {
      "_id": "...",
      "role": "MANAGER",
      "departmentType": "FRONT_OFFICE",
      "resourceType": "ROSTER",
      "permissions": ["VIEW_ROSTER", "CREATE_ROSTER"],
      "isActive": true
    },
    ...
  ]
}
```

### 3. Get Permissions by Role and Department
```bash
GET /rbac/hotel/{hotelId}/role?role=MANAGER&departmentType=FRONT_OFFICE&departmentRole=RECEPTIONIST

Response: [permission objects matching criteria]
```

### 4. Create/Update Permission Rule
```bash
POST /rbac/hotel/{hotelId}/permission
Authorization: Bearer <token with MANAGE_RBAC permission>

Body:
{
  "role": "MANAGER",
  "resourceType": "ROSTER",
  "permissions": ["VIEW_ROSTER", "CREATE_ROSTER", "EDIT_ROSTER"],
  "departmentType": "FRONT_OFFICE",      // Optional
  "departmentRole": "FRONT_OFFICE_MANAGER", // Optional
  "description": "Front office managers can manage rosters"
}
```

### 5. Delete Permission Rule
```bash
DELETE /rbac/permission/{id}
Authorization: Bearer <token with MANAGE_RBAC permission>
```

### 6. Enable/Disable Permission
```bash
PATCH /rbac/permission/{id}/enable
PATCH /rbac/permission/{id}/disable
Authorization: Bearer <token with MANAGE_RBAC permission>
```

### 7. Clone Permissions Between Roles
```bash
POST /rbac/hotel/{hotelId}/clone-permissions
Authorization: Bearer <token with MANAGE_RBAC permission>

Body:
{
  "sourceRole": "MANAGER",
  "targetRole": "SUPERVISOR"
}

Response:
{
  "data": { "count": 8 },
  "message": "8 permissions cloned successfully"
}
```

### 8. Check Permission
```bash
GET /rbac/hotel/{hotelId}/check?role=MANAGER&resourceType=ROSTER&action=CREATE_ROSTER

Response:
{
  "data": { "hasPermission": true },
  "message": "Permission check completed"
}
```

### 9. Get User's Effective Permissions
```bash
GET /rbac/hotel/{hotelId}/user-permissions?role=MANAGER&departmentType=FRONT_OFFICE

Response:
{
  "data": {
    "hotelId": "...",
    "role": "MANAGER",
    "permissions": [
      {
        "resourceType": "ROSTER",
        "allowedActions": ["VIEW_ROSTER", "CREATE_ROSTER", ...]
      },
      ...
    ]
  }
}
```

## Using in Routes

### Example 1: Basic Role Check (Backward Compatible)
```typescript
import { authorize } from '../../core/middleware/rbac.middleware';

router.get('/admin-only',
  authorize({ roles: ['ADMIN'] }),
  handler
);
```

### Example 2: Fine-Grained Permission Check
```typescript
import { authorize } from '../../core/middleware/rbac.middleware';
import { Permission, ResourceType } from '../../shared/enums/rbac';

router.post('/roster',
  authorize({
    resourceType: ResourceType.ROSTER,
    permissions: [Permission.CREATE_ROSTER]
  }),
  handler
);
```

### Example 3: Department-Specific Check
```typescript
router.get('/front-office-reports',
  authorize({
    departmentTypes: ['FRONT_OFFICE']
  }),
  handler
);
```

### Example 4: Multiple Rules (OR Logic)
```typescript
router.delete('/roster/:id',
  authorize(
    { roles: ['ADMIN'] },  // Admins can always delete
    {
      role: UserRole.MANAGER,
      departmentType: UserDepartmentType.FRONT_OFFICE,
      resourceType: ResourceType.ROSTER,
      permissions: [Permission.DELETE_ROSTER]  // Or managers in F.O. with permission
    }
  ),
  handler
);
```

### Example 5: Shorthand Helper
```typescript
import { authorizePermission } from '../../core/middleware/rbac.middleware';
import { Permission, ResourceType } from '../../shared/enums/rbac';

router.patch('/payment/:id',
  authorizePermission(ResourceType.PAYMENTS, Permission.PROCESS_PAYMENTS),
  handler
);
```

## Programmatic Usage

### In Services/Controllers
```typescript
import RBACService from '../../modules/rbac/rbac.service';
import { Permission, ResourceType } from '../../shared/enums/rbac';

// Check if user can perform action
const canCreate = await RBACService.hasPermission(
  hotelId,
  UserRole.MANAGER,
  UserDepartmentType.FRONT_OFFICE,
  UserDepartmentRole.RECEPTIONIST,
  ResourceType.ROSTER,
  Permission.CREATE_ROSTER
);

if (!canCreate) {
  throw new Error('User does not have permission to create rosters');
}

// Get all user permissions
const userPerms = await RBACService.getUserPermissions(
  hotelId,
  UserRole.MANAGER,
  UserDepartmentType.FRONT_OFFICE
);

// Create permission rule
await RBACService.upsertPermission(
  hotelId,
  UserRole.MANAGER,
  ResourceType.ROSTER,
  [Permission.VIEW_ROSTER, Permission.CREATE_ROSTER],
  UserDepartmentType.FRONT_OFFICE
);
```

## Initial Setup

### Step 1: Seed Default Permissions
```typescript
import { seedRBACPermissions } from './scripts/seed-rbac';

// When creating a new hotel
const hotel = await createHotel(...);
await seedRBACPermissions(hotel._id.toString());
```

### Step 2: Update Permission Rules via Admin API
Use the endpoints above to customize permissions for your needs.

### Step 3: Protect Routes
Update your route files to use the new authorize middleware with fine-grained permissions.

## Permission Lookup Algorithm

When checking permissions, the system tries matches in this order:

1. **Exact Match**: role + departmentType + departmentRole + resourceType
2. **Department Match**: role + departmentType + resourceType
3. **Position Match**: role + departmentRole + resourceType
4. **Role Match**: role + resourceType

This cascading approach allows:
- Specific overrides for individual positions
- Department-wide rules
- Role-wide defaults

**Example Lookup for Manager in Front Office as Receptionist:**

```
Looking for: ROSTER → CREATE permission

Try 1: MANAGER + FRONT_OFFICE + RECEPTIONIST + ROSTER → Not found
Try 2: MANAGER + FRONT_OFFICE + (any/none) + ROSTER → Found! ✓
```

## Restaurant Independence

Each permission is scoped to a specific `hotelId`:

```typescript
// Hotel A's MANAGER
await RBACService.upsertPermission(
  hotelA._id,
  UserRole.MANAGER,
  ResourceType.ROSTER,
  [Permission.VIEW_ROSTER]  // Limited access
);

// Hotel B's MANAGER  
await RBACService.upsertPermission(
  hotelB._id,
  UserRole.MANAGER,
  ResourceType.ROSTER,
  [Permission.VIEW_ROSTER, Permission.CREATE_ROSTER, Permission.EDIT_ROSTER] // More access
);
```

Same role, different permissions per restaurant.

## Troubleshooting

### User can't access endpoint despite having role
1. Check if RBAC permission rule exists for user's exact role + department + resource
2. Verify `isActive: true` on the permission
3. Check middleware chain in routes

### Permission check returns undefined
1. Ensure `hotelId` is in user JWT or database
2. Check that `role`, `resourceType`, and `action` match enum values exactly

### No permissions found for new hotel
1. Call `seedRBACPermissions(hotelId)` after creating hotel
2. Or manually create permission rules via API

## Performance Tips

1. **Cascade Lookup**: More specific rules (with departments) match faster
2. **Caching**: Consider caching user permissions in `req.user` after first check
3. **Indexing**: All necessary indexes are automatically created
4. **Queries**: Use specific role/department queries instead of find({})

## Next Steps

1. Register routes in admin panel UI
2. Create RBAC management dashboard
3. Add audit logging for permission changes
4. Implement permission caching layer
5. Add role templates for quick setup
