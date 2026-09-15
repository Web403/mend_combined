export class ReviewError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number = 400,
  ) {
    super(message);
    this.name = "ReviewError";
  }
}

export const ReviewErrors = {
  reviewNotFound: () =>
    new ReviewError(
      "REVIEW_NOT_FOUND",
      "Unable to find the requested review",
      404,
    ),

  reviewsNotFound: () => new ReviewError("NO_REVIEWS", "No reviews found", 404),
} as const;
