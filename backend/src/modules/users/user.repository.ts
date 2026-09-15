import { UserStatus, UserProfession, UserAvailability, YearsOfExperience } from "../../shared/enums";
import { UserModel } from "./user.model";
import { UserListOptions } from "../../shared/interfaces/user";
import { TaskStatus } from "../../shared/enums/task";
import mongoose, { Types } from "mongoose";
import { AttendanceModel } from "../attendance/attendance.model";
import { RosterModel } from "../rosters/roster.model";
import { WellbeingModel } from "../wellbeing/wellbeing.model";

export class UserRepository {
    async create(data: any) {
        return UserModel.create(data);
    }

    async updateUser(userId: string, update: any) {
        return UserModel.findOneAndUpdate(
            { id: userId },
            update,
            { new: true }
        );
    }

    async findUserById(userId: string) {
        return UserModel.findById(new mongoose.Types.ObjectId(userId));
    }

    async findUserByEmail(email: string) {
        return UserModel.findOne({ email });
    }

    async suspendUser(userId: string) {
        return UserModel.findOneAndUpdate(
            { id: userId },
            { status: UserStatus.SUSPENDED },
            { new: true }
        );
    }

    async deleteUser(userId: string) {
        return UserModel.findOneAndDelete({ id: userId });
    }

    async getUsersWithPagination(options: UserListOptions = {}) {
        const startTime = Date.now();

        try {
            const {
                page = 1,
                limit = 25,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                filters = {}
            } = options;

            const skip = (page - 1) * limit;

            // Build filter query
            const query: any = {};

            if (filters.status) {
                query.status = filters.status;
            }

            if (filters.profession) {
                query.profession = filters.profession;
            }

            if (filters.availability) {
                query.availability = filters.availability;
            }

            if (filters.yearsOfExperience) {
                query.yearsOfExperience = filters.yearsOfExperience;
            }

            if (filters.hotelId) {
                query.hotelId = filters.hotelId;
            }

            if (filters.departmentType) {
                query.departmentType = filters.departmentType;
            }

            if (filters.search) {
                query.$or = [
                    { email: { $regex: filters.search, $options: 'i' } },
                    { 'profile.firstName': { $regex: filters.search, $options: 'i' } },
                    { 'profile.lastName': { $regex: filters.search, $options: 'i' } },
                    { phone: { $regex: filters.search, $options: 'i' } }
                ];
            }

            // Build sort query
            const sort: any = {};
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

            const users = await UserModel
                .find(query)
                .select(
                    'id email paymentId subscriptionAmount profession availability previousVenues yearsOfExperience profile status initialPaymentDone createdAt updatedAt departmentType departmentRole'
                )
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean();

            const total = await UserModel.countDocuments(query);

            const executionTime = Date.now() - startTime;

            return {
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }

    async getUsersPerformance(hotelId?: string) {
        const matchStage: any = {};

        if (hotelId) {
            matchStage.hotelId = hotelId;
        }

        return UserModel.aggregate([
            {
                $match: matchStage,
            },

            // Attendance History
            {
                $lookup: {
                    from: "attendances",
                    let: {
                        userId: "$id",
                        hotelId: {
                            $toString: "$hotelId",
                        },
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ["$userId", "$$userId"],
                                        },
                                        {
                                            $eq: ["$hotelId", "$$hotelId"],
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                    as: "attendance",
                },
            },

            // Tasks
            {
                $lookup: {
                    from: "tasks",
                    let: {
                        userMongoId: "$_id",
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$$userMongoId", "$assignedTo"],
                                },
                                isDeleted: false,
                            },
                        },
                    ],
                    as: "tasks",
                },
            },

            {
                $addFields: {
                    totalAttendance: {
                        $size: "$attendance",
                    },

                    totalWorkingMinutes: {
                        $sum: "$attendance.workDurationMinutes",
                    },

                    attendanceViolations: {
                        $size: {
                            $filter: {
                                input: "$attendance",
                                as: "attendance",
                                cond: {
                                    $or: [
                                        "$$attendance.violationFlags.exceeds10Hours",
                                        "$$attendance.violationFlags.insufficientRecovery",
                                    ],
                                },
                            },
                        },
                    },

                    totalTasks: {
                        $size: "$tasks",
                    },

                    completedTasks: {
                        $size: {
                            $filter: {
                                input: "$tasks",
                                as: "task",
                                cond: {
                                    $eq: [
                                        "$$task.status",
                                        TaskStatus.COMPLETED,
                                    ],
                                },
                            },
                        },
                    },
                },
            },

            {
                $addFields: {
                    completionRate: {
                        $cond: [
                            {
                                $eq: ["$totalTasks", 0],
                            },
                            0,
                            {
                                $multiply: [
                                    {
                                        $divide: [
                                            "$completedTasks",
                                            "$totalTasks",
                                        ],
                                    },
                                    100,
                                ],
                            },
                        ],
                    },

                    averageWorkingHours: {
                        $cond: [
                            {
                                $eq: ["$totalAttendance", 0],
                            },
                            0,
                            {
                                $divide: [
                                    {
                                        $divide: [
                                            "$totalWorkingMinutes",
                                            "$totalAttendance",
                                        ],
                                    },
                                    60,
                                ],
                            },
                        ],
                    },
                },
            },

            // Overall Performance Score (100)
            {
                $addFields: {
                    performanceScore: {
                        $subtract: [
                            {
                                $add: [
                                    {
                                        $multiply: [
                                            "$completionRate",
                                            0.7,
                                        ],
                                    },
                                    {
                                        $multiply: [
                                            "$averageWorkingHours",
                                            3,
                                        ],
                                    },
                                ],
                            },
                            {
                                $multiply: [
                                    "$attendanceViolations",
                                    5,
                                ],
                            },
                        ],
                    },
                },
            },

            {
                $project: {
                    _id: 0,
                    userId: "$id",

                    employeeName: {
                        $concat: [
                            "$profile.firstName",
                            " ",
                            "$profile.lastName",
                        ],
                    },

                    department: "$departmentType",
                    role: "$departmentRole",
                    status: 1,

                    totalTasks: 1,
                    completedTasks: 1,
                    completionRate: {
                        $round: ["$completionRate", 2],
                    },

                    totalAttendance: 1,

                    averageWorkingHours: {
                        $round: [
                            "$averageWorkingHours",
                            2,
                        ],
                    },

                    attendanceViolations: 1,

                    performanceScore: {
                        $round: [
                            {
                                $max: [
                                    0,
                                    "$performanceScore",
                                ],
                            },
                            2,
                        ],
                    },
                },
            },

            {
                $sort: {
                    performanceScore: -1,
                    completedTasks: -1,
                },
            },
        ]);
    }

    async getUserWorkSummary(userId: Types.ObjectId) {
        const user = await UserModel.findById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        const [summary] = await UserModel.aggregate([
            {
                $match: { _id: userId }
            },
            {
                // Attendance records store userId as the custom string id
                $lookup: {
                    from: 'attendances',
                    localField: 'id',
                    foreignField: 'userId',
                    as: 'attendanceRecords'
                }
            },
            {
                // Tasks don't have a top-level userId — assignedTo is an array
                // of the user's Mongo _id
                $lookup: {
                    from: 'tasks',
                    localField: '_id',
                    foreignField: 'assignedTo',
                    as: 'taskRecords'
                }
            },
            {
                // Wellbeing collection name is "wellbeings" (from the
                // Wellbeing model), not "wellness"
                $lookup: {
                    from: 'wellbeings',
                    localField: 'id',
                    foreignField: 'userId',
                    as: 'wellnessRecords'
                }
            },
            {
                $addFields: {
                    activeTaskRecords: {
                        $filter: {
                            input: "$taskRecords",
                            as: "task",
                            cond: { $eq: ["$$task.isDeleted", false] }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    userId: "$id",
                    totalAttendance: { $size: "$attendanceRecords" },
                    totalWorkingMinutes: {
                        $sum: "$attendanceRecords.workDurationMinutes"
                    },
                    totalTasks: { $size: "$activeTaskRecords" },
                    completedTasks: {
                        $size: {
                            $filter: {
                                input: "$activeTaskRecords",
                                as: "task",
                                cond: { $eq: ["$$task.status", TaskStatus.COMPLETED] }
                            }
                        }
                    },
                    totalWellnessChecks: { $size: "$wellnessRecords" }
                }
            }
        ]);

        const today = new Date();
        const startOfToday = new Date(today);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);

        const [todayAttendance, nextShiftRecord, todayWellbeing] = await Promise.all([
            AttendanceModel.findOne({
                hotelId: String(user.hotelId),
                userId: user.id,
                clockIn: { $gte: startOfToday, $lte: endOfToday },
            })
                .sort({ clockIn: -1 })
                .lean(),
            RosterModel.findOne({
                hotelId: user.hotelId,
                employees: userId,
                date: { $gte: startOfToday },
            })
                .populate('shiftId', 'startTime endTime')
                .sort({ date: 1 })
                .lean(),
            WellbeingModel.findOne({
                hotelId: user.hotelId,
                userId: user.id,
                createdAt: { $gte: startOfToday, $lte: endOfToday },
            })
                .sort({ createdAt: -1 })
                .lean(),
        ]);

        const attendanceStatus = todayAttendance
            ? (todayAttendance.clockOut ? 'clocked_out' : 'clocked_in')
            : 'not_clocked_in';

        const todayWorkMinutes = todayAttendance?.workDurationMinutes ?? 0;
        const tenHoursWorkedToday = todayWorkMinutes >= 600;

        const nextShift = nextShiftRecord?.shiftId
            ? {
                date: nextShiftRecord.date,
                startTime: (nextShiftRecord.shiftId as any).startTime,
                endTime: (nextShiftRecord.shiftId as any).endTime,
            }
            : null;

        const wellbeingStatus = todayWellbeing?.alertStatus && todayWellbeing.alertStatus !== 'NONE'
            ? todayWellbeing.alertStatus
            : todayWellbeing?.fatigueRiskLevel || 'NONE';

        return {
            ...(summary || {}),
            attendanceStatus,
            todayAttendance: todayAttendance ? {
                clockIn: todayAttendance.clockIn,
                clockOut: todayAttendance.clockOut,
                workDurationMinutes: todayAttendance.workDurationMinutes,
            } : null,
            todayWorkMinutes,
            tenHoursWorkedToday,
            nextShift,
            wellbeingStatus,
        };
    }
}
