import { Response } from "express";
import { AuthenticatedRequest } from "../../core/middleware/auth.middleware";
import { errorResponse, successResponse } from "../../core/utils/ApiResponse";
import { ReviewService } from "./review.service";

const service = new ReviewService();

export class ReviewController {
  async createReview(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.roles[0];

      const dto = {
        userId: userId,
        postedBy: userRole,
        ...req.body,
      };
      const review = await service.createReview(dto);
      return res.status(201).json(successResponse(review, "Review added"));
    } catch (error: any) {
      res.status(error.httpStatus).json(errorResponse(error.message));
    }
  }

  async getUserPostedGigReviews(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id as string;

      const reviews = await service.getUserPostedGigReviews(userId);

      return res.status(200).json(successResponse(reviews));
    } catch (error: any) {
      res.status(error.httpStatus).json(errorResponse(error.message));
    }
  }

  async getUserFeedbackGigReviews(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id as string;

      const reviews = await service.getUserFeedbackGigReviews(userId);

      return res.status(200).json(successResponse(reviews));
    } catch (error: any) {
      res.status(error.httpStatus).json(errorResponse(error.message));
    }
  }

  async getGigReviewsForHotel(req: AuthenticatedRequest, res: Response) {
    try {
      const hotelId = req.user?.hotelId as string;

      const reviews = await service.getGigReviewsForHotel(hotelId);

      return res.status(200).json(successResponse(reviews));
    } catch (error: any) {
      return res.status(error.httpStatus).json(errorResponse(error.message));
    }
  }

  async getHotelsWithReviews(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const searchQuery = req.query.search as string | undefined;

        const reviews = await service.getHotelsWithReviews(searchQuery);

        return res.status(200).json(successResponse(reviews));
    } catch (error: any) {
        return res
            .status(error.httpStatus)
            .json(errorResponse(error.message));
    }
}

  async getGigReviewsPostedByHotel(req: AuthenticatedRequest, res: Response) {
    try {
      const hotelId = req.user?.hotelId as string;
      const reviews = await service.getGigReviewsPostedByHotel(hotelId);
      return res.status(200).json(successResponse(reviews));
    } catch (error: any) {
      return res.status(error.httpStatus).json(errorResponse(error.message));
    }
  }
}
