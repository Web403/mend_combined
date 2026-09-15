import mongoose, { Schema, model } from "mongoose";
import { IUser } from "../../shared/interfaces";
import { IdType, UserAvailability, UserProfession, UserRole, UserStatus, YearsOfExperience } from "../../shared/enums";
import { AuthRole } from "../../shared/enums/common";
import { UserDepartmentRole, UserDepartmentType } from "../../shared/enums/user";

const UserSchema = new Schema<IUser>(
  {
    id: { type: String, required: true, unique: true, index: true },
    hotelId: { type: mongoose.Types.ObjectId, ref: "Hotel", index: true },
    schemaVersion: { type: Number, default: 1 },
    email: { type: String, required: true },
    phone: String,
    whatsappNumber: String,
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(UserRole), required: true },
    paymentId: { type: String },
    subscriptionAmount: { type: Number },
    authRole: { type: String, default: AuthRole.USER },
    password: { type: String },
    profession: { type: String, enum: Object.values(UserProfession) },
    availability: { type: String, enum: Object.values(UserAvailability) },
    previousVenues: [String],
    idType: { type: String, enum: Object.values(IdType) },
    idNumber: String,
    yearsOfExperience: { type: String, enum: Object.values(YearsOfExperience) },
    departmentType: {
      type: String, enum: Object.values(UserDepartmentType)
    },
    departmentRole: { type: String, enum: Object.values(UserDepartmentRole) },
    profile: {
      firstName: { type: String, required: true },
      middleName: { type: String },
      lastName: { type: String, required: true },
      dob: { type: Date, required: true },
      gender: { type: String },
      location: {
        street: String,
        city: { type: String },
        state: { type: String },
        country: { type: String },
        pinCode: Number
      },
      department: String
    },
    status: { type: String, enum: Object.values(UserStatus), default: UserStatus.ACTIVE },
    mfaEnabled: { type: Boolean, default: false },
    initialPaymentDone: { type: Boolean, default: false }
  },
  { timestamps: true }
);

UserSchema.index({ hotelId: 1, email: 1 }, { unique: true });

export const UserModel = model<IUser>("User", UserSchema);