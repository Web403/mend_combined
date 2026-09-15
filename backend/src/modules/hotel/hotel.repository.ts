import mongoose from "mongoose";
import { HotelModel } from "./hotel.model";
import { EmailService } from "../../core/utils/EmailService";
import { UserModel } from "../users/user.model";
import { AttendanceModel } from "../attendance/attendance.model";
import { JobModel } from "../recruitment/job.model";
import { CertificateModel } from "../lms/certificate/certificate.model";
import { JobStatus } from "../../shared/enums/recruitment";
import { UserRole, UserStatus } from "../../shared/enums/user";
import { CertificateStatus } from "../../shared/enums/lms.enum";

export class HotelRepository {
    private buildHotelSelector(hotelId: string) {
        const clauses: any[] = [{ id: hotelId }];
        if (mongoose.isValidObjectId(hotelId)) {
            clauses.push({ _id: new mongoose.Types.ObjectId(hotelId) });
        }
        return { $or: clauses };
    }

    async create(data: any) {
        return HotelModel.create(data);
    }

    async updateData(hotelId: string, update: any) {
        return HotelModel.findOneAndUpdate(this.buildHotelSelector(hotelId), update, { new: true });
    }

    async findById(hotelId: string) {
        return HotelModel.findOne(this.buildHotelSelector(hotelId)).lean();
    }

    async findHotelById(hotelId: string) {
        return this.findById(hotelId);
    }

    async findHotelByPhone(phone: string) {
        return HotelModel.findOne({ phoneNumber: phone });
    }

    async findHotelByEmail(email: string) {
        return HotelModel.findOne({ email });
    }

    async delete(hotelId: string) {
        return HotelModel.findOneAndDelete(this.buildHotelSelector(hotelId));
    }

    async findAll(options: any) {
        const {
            page = 1,
            limit = 25,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            search,
            primaryPainPoint,
            initialPaymentDone,
            city,
            subscriptionPlan,
            subscriptionStatus,
            isActive,
        } = options;

        const query: any = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phoneNumber: { $regex: search, $options: 'i' } },
            ];
        }

        if (primaryPainPoint) {
            query.primaryPainPoint = primaryPainPoint;
        }

        if (initialPaymentDone !== undefined) {
            query.initialPaymentDone = initialPaymentDone;
        }

        if (city) {
            query['location.city'] = city;
        }

        if (subscriptionPlan) {
            query.subscriptionPlan = subscriptionPlan;
        }

        if (subscriptionStatus) {
            query.subscriptionStatus = subscriptionStatus;
        }

        if (isActive !== undefined) {
            query.isActive = isActive;
        }

        const skip = (page - 1) * limit;
        const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const [data, total] = await Promise.all([
            HotelModel.find(query)
                .select('-passwordHash -paymentId -authRole -password -createdAt -updatedAt')
                .sort(sort)
                .skip(skip)
                .limit(limit),
            HotelModel.countDocuments(query),
        ]);

        return {
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    private buildHotelIdSelector(hotel: any): Record<string, unknown> {
        const ids: any[] = [];

        // Prefer using ObjectId(s) only to avoid Mongoose casting errors when
        // hotel id strings (like "hotel__abc123") cannot be cast to ObjectId.
        if (hotel?._id) {
            if (typeof hotel._id === 'string') {
                if (mongoose.isValidObjectId(hotel._id)) {
                    ids.push(new mongoose.Types.ObjectId(hotel._id));
                }
            } else {
                ids.push(hotel._id);
            }
        }

        // If the hotel.id happens to be a valid ObjectId string, include it too.
        if (hotel?.id && typeof hotel.id === 'string' && mongoose.isValidObjectId(hotel.id)) {
            ids.push(new mongoose.Types.ObjectId(hotel.id));
        }

        // If we don't have any valid ObjectId to query by, return a safe
        // predicate that matches nothing to prevent casting errors.
        if (ids.length === 0) {
            return { $expr: { $eq: [1, 0] } };
        }

        return { hotelId: { $in: ids } };
    }

    async countActiveEmployees(hotel: any): Promise<number> {
        const filter: any = this.buildHotelIdSelector(hotel);
        filter.status = UserStatus.ACTIVE;
        filter.role = { $in: [UserRole.EMPLOYEE, UserRole.PROFESSIONAL, UserRole.STUDENT] };
        return UserModel.countDocuments(filter);
    }

    async countActiveManagers(hotel: any): Promise<number> {
        const filter: any = this.buildHotelIdSelector(hotel);
        filter.status = UserStatus.ACTIVE;
        filter.role = UserRole.MANAGER;
        return UserModel.countDocuments(filter);
    }

    async countAttendanceToday(hotel: any): Promise<number> {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const filter: any = this.buildHotelIdSelector(hotel);
        filter.clockIn = { $gte: startOfDay, $lt: endOfDay };

        return AttendanceModel.countDocuments(filter);
    }

    async getAttendanceSummary(hotel: any): Promise<{
        total: number;
        geoValidated: number;
        exceeds10Hours: number;
        insufficientRecovery: number;
    }> {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const filter: any = this.buildHotelIdSelector(hotel);
        filter.clockIn = { $gte: startOfDay, $lt: endOfDay };

        const [result] = await AttendanceModel.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    geoValidated: {
                        $sum: {
                            $cond: ["$geoValidated", 1, 0],
                        },
                    },
                    exceeds10Hours: {
                        $sum: {
                            $cond: [{ $eq: ["$violationFlags.exceeds10Hours", true] }, 1, 0],
                        },
                    },
                    insufficientRecovery: {
                        $sum: {
                            $cond: [{ $eq: ["$violationFlags.insufficientRecovery", true] }, 1, 0],
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    total: 1,
                    geoValidated: 1,
                    exceeds10Hours: 1,
                    insufficientRecovery: 1,
                },
            },
        ]);

        return result || {
            total: 0,
            geoValidated: 0,
            exceeds10Hours: 0,
            insufficientRecovery: 0,
        };
    }

    async getComplianceScore(hotel: any): Promise<number> {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const filter: any = this.buildHotelIdSelector(hotel);
        filter.clockIn = { $gte: startOfDay, $lt: endOfDay };

        const [result] = await AttendanceModel.aggregate([
            { $match: filter },
            {
                $project: {
                    compliant: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$geoValidated", true] },
                                    { $eq: ["$violationFlags.exceeds10Hours", false] },
                                    { $eq: ["$violationFlags.insufficientRecovery", false] },
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    compliant: { $sum: "$compliant" },
                },
            },
            {
                $project: {
                    _id: 0,
                    total: 1,
                    compliant: 1,
                },
            },
        ]);

        if (!result || result.total === 0) {
            return 100;
        }

        return Math.round((result.compliant / result.total) * 100);
    }

    async countOpenJobs(hotel: any): Promise<number> {
        const filter: any = this.buildHotelIdSelector(hotel);
        filter.status = JobStatus.OPEN;
        return JobModel.countDocuments(filter);
    }
}
