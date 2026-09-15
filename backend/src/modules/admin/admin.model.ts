import { Schema, model } from "mongoose";
import { IAdmin } from "../../shared/interfaces/admin.d";
import { AdminRole, AdminStatus } from "../../shared/enums/admin";

const AdminSchema = new Schema<IAdmin>(
  {
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: Object.values(AdminRole),
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: Object.values(AdminStatus),
      default: AdminStatus.ACTIVE,
      index: true
    },

    profile: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      profilePicture: String
    },

    lastLogin: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },

    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String }
  },
  { timestamps: true }
);

AdminSchema.index({ hotelId: 1, email: 1 }, { unique: true, sparse: true });
AdminSchema.index({ email: 1 }, { unique: true, sparse: true }); // for MENDADMIN (no hotelId)
AdminSchema.index({ role: 1, status: 1 });

export const AdminModel = model<IAdmin>("Admin", AdminSchema);
