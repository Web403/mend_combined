import mongoose from "mongoose";
import { IHotel } from "../../shared/interfaces";
import { MonthlyEvents, PrimaryPainPoint, PropertyType } from "../../shared/enums";
import { AuthRole } from "../../shared/enums/common";

const hotelSchema = new mongoose.Schema<IHotel>({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    contactPersonName: String,
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    paymentId: {
        type: String
    },
    subscriptionAmount: { type: Number },
    primaryPainPoint: { type: String, enum: Object.values(PrimaryPainPoint), required: true },
    location: {
        address: { type: String },
        city: { type: String },
        country: { type: String },
        state: { type: String },
        pincode: { type: Number },
        codePointAttr: { 
            type: {
                lat: { type: Number },
                lng: { type: Number }
            }
        }
    },
    propertyType: { type: String, enum: Object.values(PropertyType), required: true },
    monthlyEvents: { type: String, enum: Object.values(MonthlyEvents), required: true },
    staffStrength: { type: Number, required: true },
    subscriptionPlan: { type: String, default: "FREE" },
    subscriptionStatus: { type: String, enum: ["ACTIVE", "PAUSED", "EXPIRED"], default: "ACTIVE" },
    subscriptionExpiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    passwordHash: { type: String, required: true },
    isStriked: { type: Boolean, default: false },
    strikeReason: String,
    strikedAt: Date,
    strikedBy: String,
    password: { type: String },
    initialPaymentDone: { type: Boolean, default: false },
    authRole: { type: String, default: AuthRole.HOTEL }

}, { timestamps: true })

export const HotelModel = mongoose.model<IHotel>("Hotel", hotelSchema)
