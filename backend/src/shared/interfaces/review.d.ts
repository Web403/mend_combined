import { Types } from "mongoose";
import { ReviewType, UserRole } from "../enums";

export interface IReview {
  id: string;
  hotelId: Types.ObjectId;
  gigId?: Types.ObjectId;
  jobId?: Types.ObjectId;
  rating?: number;
  feedbackRating?: string;
  review?: string;
  feedbackReview?: string;
  userId: Types.ObjectId;
  reviewType: ReviewType;
  postedBy: UserRole;
}

export interface ReviewListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: ReviewListFilters;
}

export interface ReviewListFilters {
  reviewType?: ReviewType;
  rating?: number;
  feedbackRating?: number;
  postedBy?: UserRole;
}
