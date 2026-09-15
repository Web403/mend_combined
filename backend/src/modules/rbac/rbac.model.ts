import { Schema, model } from "mongoose";
import { IRBACPermission } from "../../shared/interfaces/rbac.d";
import { Permission, ResourceType } from "../../shared/enums/rbac";
import { UserRole, UserDepartmentType, UserDepartmentRole } from "../../shared/enums/user";

const RBACPermissionSchema = new Schema<IRBACPermission>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      index: true,
    },

    departmentType: {
      type: String,
      enum: Object.values(UserDepartmentType),
      sparse: true,
      index: true,
    },

    departmentRole: {
      type: String,
      enum: Object.values(UserDepartmentRole),
      sparse: true,
      index: true,
    },

    permissions: {
      type: [String],
      enum: Object.values(Permission),
      required: true,
      default: [],
    },

    resourceType: {
      type: String,
      enum: Object.values(ResourceType),
      required: true,
      index: true,
    },

    description: String,

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    priority: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Composite index for efficient permission lookup
RBACPermissionSchema.index({
  hotelId: 1,
  role: 1,
  departmentType: 1,
  departmentRole: 1,
  resourceType: 1,
  isActive: 1,
});

// Index for quick active permission lookup
RBACPermissionSchema.index({
  hotelId: 1,
  isActive: 1,
  resourceType: 1,
});

// Index for user-specific permission lookup
RBACPermissionSchema.index({
  hotelId: 1,
  role: 1,
  resourceType: 1,
  isActive: 1,
});

export const RBACPermissionModel = model<IRBACPermission>(
  "RBACPermission",
  RBACPermissionSchema
);
