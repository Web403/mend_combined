import { Types } from "mongoose";
import { MonthlyEvents, PrimaryPainPoint } from "../enums";
import { PropertyType } from "mongodb";
import { AuthRole } from "../enums/common";

export interface IHotel {

    _id: Types.ObjectId;
    id: string;
    name: string;
    contactPersonName?: string;
    email: string;
    phoneNumber: string;
    primaryPainPoint: PrimaryPainPoint;
    authRole: AuthRole.HOTEL;
    paymentId?: string;
    subscriptionAmount?: number;
    location: {
        address: string;
        city: string;
        country: string;
        state: string;
        pincode: number;
        codePointAttr: {
            lat: number;
            lng: number;
        };
    };
    propertyType: PropertyType;
    monthlyEvents: MonthlyEvents;
    staffStrength: number;
    subscriptionPlan?: string;
    subscriptionStatus?: string;
    subscriptionExpiresAt?: Date;
    isActive?: boolean;
    passwordHash: string;
    isStriked: boolean;
    strikeReason?: string;
    strikedAt?: Date;
    strikedBy?: string;
    password?: string;
    initialPaymentDone: boolean;
}
