import { nanoid } from "nanoid";
import { IReview } from "../../shared/interfaces";
import { ReviewRepository } from "./review.repository";
import { IdValidatorService } from "../../shared/services/id-validator.service";
import { ReviewType, UserRole } from "../../shared/enums";
import { ReviewErrors } from "./review.error";

export class ReviewService {
  private repo = new ReviewRepository();
  private idValidator = new IdValidatorService();

  async createReview(data: Partial<IReview>) {
    const hotel = await this.idValidator.validateHotelId(String(data.hotelId));
    const gig = await this.idValidator.validateGigSecondaryId(
      String(data.gigId),
    );
    const review = await this.repo.create({
      id: `review_${nanoid(8)}`,
      hotelId: hotel._id,
      gigId: gig._id,
      jobId: data.jobId,
      rating: data.rating,
      reviewType: data.reviewType,
      userId: data.userId,
      feedbackRating: data.feedbackRating,
      feedbackReview: data.feedbackReview,
      review: data.review,
      postedBy: data.postedBy,
    } as IReview);

    return review;
  }

  async getUserPostedGigReviews(userId: string) {
    const reviews = await this.repo.findByUser(userId, {
      filters: {
        postedBy: UserRole.STUDENT,
        reviewType: ReviewType.GIG,
      },
    });

    if (reviews.length == 0) {
      throw ReviewErrors.reviewsNotFound();
    }

    return reviews;
  }

  async getUserFeedbackGigReviews(userId: string) {
    const reviews = await this.repo.findByUser(userId, {
      filters: {
        postedBy: UserRole.MANAGER,
        reviewType: ReviewType.GIG,
      },
    });

    if (reviews.length == 0) {
      throw ReviewErrors.reviewsNotFound();
    }

    return reviews;
  }

  async getGigReviewsForHotel(hotelId: string) {
    const reviews = await this.repo.findByHotel(hotelId, {
      filters: {
        postedBy: UserRole.STUDENT,
        reviewType: ReviewType.GIG,
      },
    });

    if (reviews.length == 0) {
      throw ReviewErrors.reviewsNotFound();
    }

    return reviews;
  }

  async getHotelsWithReviews(searchQuery?: string) {
    // find hotels with search query and return list of hotels with reviews
    const hotels = await this.repo.findHotelsWithReviews(searchQuery);
    return hotels;
  }

  async getGigReviewsPostedByHotel(hotelId: string) {
    const reviews = await this.repo.findByHotel(hotelId, {
      filters: {
        postedBy: UserRole.HR,
        reviewType: ReviewType.GIG,
      },
    });
    if (reviews.length == 0) {
      throw ReviewErrors.reviewsNotFound();
    }

    return reviews;
  }
}
