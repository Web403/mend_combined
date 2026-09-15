import { Request, Response } from 'express';
import { UserService } from './user.service';
import { successResponse, errorResponse } from '../../core/utils/ApiResponse';
import { UserStatus, UserProfession, UserAvailability, YearsOfExperience } from '../../shared/enums';
import { AuthenticatedRequest } from '../../core/middleware/auth.middleware';
import { UserDepartmentType } from '../../shared/enums/user';

const service = new UserService();

export class UserController {
    async createUser(req: AuthenticatedRequest, res: Response) {
        try {
            req.body.hotelId = req.user?.hotelId || req.hotelId;
            const user = await service.createUser(req.body);
            res.status(201).json(successResponse(user, 'User created successfully'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    async createAdminUser(req: AuthenticatedRequest, res: Response) {
        try {
            const user = await service.createUser(req.body);
            res.status(201).json(successResponse(user, 'User created successfully'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    async updateUser(req: Request, res: Response) {
        try {
            const userId = req.params.id as string;
            const user = await service.updateUser(userId, req.body);
            res.json(successResponse(user, 'User updated successfully'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    async suspendUser(req: Request, res: Response) {
        try {
            const userId = req.params.id as string;
            const user = await service.suspendUser(userId);
            res.json(successResponse(user, 'User suspended successfully'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    async deleteUser(req: Request, res: Response) {
        try {
            const userId = req.params.id as string;
            await service.deleteUser(userId);
            res.json(successResponse(null, 'User deleted successfully'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    async getUsers(req: AuthenticatedRequest, res: Response) {
        try {

            const departmentType = req.user?.departmentType;
            const {
                page = '1',
                limit = '10',
                sortBy = 'createdAt',
                sortOrder,
                status,
                profession,
                availability,
                yearsOfExperience,
                search
            } = req.query;


            const hotelId =
                (req.query.hotelId as string | undefined) ??
                req.user?.hotelId ??
                req.user?.id;


            const options = {
                page: parseInt(page as string, 10),
                limit: parseInt(limit as string, 10),
                sortBy: sortBy as string,
                sortOrder: sortOrder as 'asc' | 'desc',
                filters: {
                    ...(departmentType && { departmentType: departmentType as UserDepartmentType }),
                    ...(status && { status: status as UserStatus }),
                    ...(profession && { profession: profession as UserProfession }),
                    ...(availability && { availability: availability as UserAvailability }),
                    ...(yearsOfExperience && { yearsOfExperience: yearsOfExperience as YearsOfExperience }),
                    ...(search && { search: search as string }),
                    ...(hotelId && { hotelId })
                }
            };

            const result = await service.getUsersWithPagination(options);
            res.json(successResponse(result.users, 'Users fetched successfully', result.pagination));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    async getUserById(req: Request, res: Response) {
        try {
            const userId = req.params.id as string;
            const user = await service.getUserById(userId);
            res.json(successResponse(user, 'User fetched successfully'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    async getUsersPerformance(req: AuthenticatedRequest, res: Response) {
        try {
            const departmentType = req.user?.departmentType;
            const hotelId = (req.user?.hotelId as string) || (req.query.hotelId as string) || (req.user?.id as string);

            const performanceData = await service.getUsersPerformance(hotelId);
            res.json(successResponse(performanceData, 'Users performance data fetched successfully'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    async getUserWorkSummary(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = (req.query?.userId as string) || (req.user?.id as string);
            const workSummary = await service.getUserWorkSummary(userId);
            res.json(successResponse(workSummary, 'User work summary fetched successfully'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }
}
