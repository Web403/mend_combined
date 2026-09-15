import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../../core/utils/ApiResponse';
import { HotelService } from './hotel.service';
import { AuthenticatedRequest } from '../../core/middleware/auth.middleware';

const service = new HotelService();

export class HotelController {
    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            const tokens = await service.login(email, password);
            res.json(successResponse(tokens));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    async createHotel(req: AuthenticatedRequest, res: Response) {
        try {
            const hotel = await service.createHotel(req.body);
            res.status(201).json(successResponse(hotel, 'Hotel created successfully'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    async getHotels(req: AuthenticatedRequest, res: Response) {
        try {
            const {
                page = '1',
                limit = '25',
                sortBy = 'createdAt',
                sortOrder = 'desc',
                search,
            } = req.query;

            const options = {
                page: Number(page) || 1,
                limit: Number(limit) || 25,
                sortBy: sortBy as string,
                sortOrder: sortOrder as string,
                search: search as string | undefined,
                primaryPainPoint: req.query.primaryPainPoint as string | undefined,
                city: req.query.city as string | undefined,
                subscriptionPlan: req.query.subscriptionPlan as string | undefined,
                subscriptionStatus: req.query.subscriptionStatus as string | undefined,
                isActive:
                    req.query.isActive === 'true'
                        ? true
                        : req.query.isActive === 'false'
                            ? false
                            : undefined,
                initialPaymentDone:
                    req.query.initialPaymentDone === 'true'
                        ? true
                        : req.query.initialPaymentDone === 'false'
                            ? false
                            : undefined,
            };

            const hotels = await service.getHotels(options);
            res.json(successResponse(hotels, 'Hotels retrieved successfully'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    async getHotelById(req: AuthenticatedRequest, res: Response) {
        try {
            const hotelId = String(req.params.hotelId);
            const hotel = await service.getHotelById(hotelId);
            res.json(successResponse(hotel, 'Hotel profile retrieved successfully'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    async updateHotel(req: AuthenticatedRequest, res: Response) {
        try {
            const hotelId = String(req.params.hotelId);
            const hotel = await service.updateHotel(hotelId, req.body);
            res.json(successResponse(hotel, 'Hotel updated successfully'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    async updateHotelStatus(req: AuthenticatedRequest, res: Response) {
        try {
            const hotelId = String(req.params.hotelId);
            const isActive = req.body.isActive;
            if (typeof isActive !== 'boolean') {
                res.status(400).json(errorResponse('isActive must be a boolean'));
                return;
            }

            const hotel = await service.setHotelStatus(hotelId, isActive);
            res.json(successResponse(hotel, 'Hotel status updated successfully'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    async updateSubscription(req: AuthenticatedRequest, res: Response) {
        try {
            const hotelId = String(req.params.hotelId);
            const hotel = await service.updateSubscription(hotelId, req.body);
            res.json(successResponse(hotel, 'Hotel subscription updated successfully'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    async getHotelAnalytics(req: AuthenticatedRequest, res: Response) {
        try {
            const hotelId = String(req.params.hotelId);
            const analytics = await service.getHotelAnalytics(hotelId);
            res.json(successResponse(analytics, 'Hotel analytics retrieved successfully'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    async deleteHotel(req: AuthenticatedRequest, res: Response) {
        try {
            const hotelId = String(req.params.hotelId);
            await service.deleteHotel(hotelId);
            res.json(successResponse(null, 'Hotel deleted successfully'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    private ensureHotelScope(req: AuthenticatedRequest, hotelId: string) {
        const isMendAdmin = req.user?.roles?.includes('MENDADMIN');
        if (!isMendAdmin && req.user?.hotelId && String(req.user.hotelId) !== hotelId) {
            throw new Error('Forbidden: cannot manage users for another hotel');
        }
    }

    async createHotelUser(req: AuthenticatedRequest, res: Response) {
        try {
            const hotelId = String(req.params.hotelId);
            this.ensureHotelScope(req, hotelId);
            const result = await service.createHotelUsers(hotelId, req.body);
            res.status(201).json(successResponse(result, 'Hotel user creation completed'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    async bulkCreateHotelUsers(req: AuthenticatedRequest, res: Response) {
        try {
            const hotelId = String(req.params.hotelId);
            this.ensureHotelScope(req, hotelId);

            if (req.file) {
                const result = await service.createHotelUsersFromFile(hotelId, req.file);
                res.status(201).json(successResponse(result, 'Bulk hotel user upload completed'));
                return;
            }

            const payload = req.body;
            if (!payload || (Array.isArray(payload) && payload.length === 0)) {
                throw new Error('Request body must contain user data or a file upload');
            }

            const result = await service.createHotelUsers(hotelId, payload);
            res.status(201).json(successResponse(result, 'Bulk hotel user creation completed'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }

    async promoteHotelUser(req: AuthenticatedRequest, res: Response) {
        try {
            const hotelId = String(req.params.hotelId);
            this.ensureHotelScope(req, hotelId);
            const userId = String(req.params.userId);
            const promoted = await service.promoteHotelUser(hotelId, userId, req.body);
            res.json(successResponse(promoted, 'User role updated successfully'));
        } catch (error: any) {
            res.status(400).json(errorResponse(error.message));
        }
    }
}
