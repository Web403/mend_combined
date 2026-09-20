import mongoose from "mongoose";
import { IReview } from "../../shared/interfaces";
import { ReviewListOptions } from "../../shared/interfaces/review";
import type { DuplicateReviewKey } from "./review.eligibility";
import { ReviewModel } from "./review.model";

export interface RevieweeListFilters {
    reviewRelationship?: string;
    reviewType?: string;
}

/** Raw rows produced by the hotel rating summary aggregation. */
export interface HotelRatingSummaryRow {
    _id: string;
    totalReviews: number;
    ratedReviews: number;
    ratingSum: number;
    ratings: (number | null)[];
}

const MAX_LIMIT = 100;

export class ReviewRepository {
    // ── Existing behaviour, preserved exactly ─────────────────────────────────

    async create(data : Partial<IReview>) {
        return ReviewModel.create(data);
    }

    async findById(id:string){
        return ReviewModel.findById(id);
    }

    async findByUser( userId : string, options: ReviewListOptions = {}){
        
        const {page =1, limit = 25, sortBy = "createdAt", sortOrder=  "desc" , filters = {}} = options;
        const skip = (page -1) * limit;

        return ReviewModel.find({reviewType:filters.reviewType,userId}).sort(sortBy).skip(skip).limit(limit).lean();
    }

    async findByHotel(hotelId: string, options: ReviewListOptions = {}){
         
        const {page =1, limit = 25, sortBy = "createdAt", sortOrder=  "desc" , filters = {}} = options;
        const skip = (page -1) * limit;

        return ReviewModel.find({reviewType:filters.reviewType,hotelId}).sort(sortBy).skip(skip).limit(limit).lean();
    }

    async findHotelsWithReviews(searchQuery?: string) {
    const pipeline: any[] = [
        {
            $lookup: {
                from: "hotels",
                localField: "hotelId",
                foreignField: "_id",
                as: "hotel"
            }
        },
        {
            $unwind: "$hotel"
        }
    ];

    if (searchQuery) {
        pipeline.push({
            $match: {
                "hotel.name": {
                    $regex: searchQuery,
                    $options: "i"
                }
            }
        });
    }

    pipeline.push({
        $group: {
            _id: "$hotelId",
            hotelName: { $first: "$hotel.name" },
            reviews: { $push: "$$ROOT" }
        }
    });

    return ReviewModel.aggregate(pipeline);
}

    // ── Relationship-aware additions ──────────────────────────────────────────

    /**
     * Legacy "feedback I received" read path.
     *
     * Matches documents where the caller is the reviewer (`userId`) OR the
     * subject (`revieweeId`). The second branch is what makes hotel-side
     * feedback discoverable by the worker it describes now that `userId` always
     * holds the reviewer, while still returning every pre-existing document.
     */
    async findByUserOrReviewee(
        userId: string,
        options: ReviewListOptions = {},
    ) {
        const { page = 1, limit = 25, sortBy = "createdAt", filters = {} } = options;
        const skip = (page - 1) * limit;

        return ReviewModel.find({
            reviewType: filters.reviewType,
            $or: [
                { userId },
                { revieweeId: userId },
            ],
        })
            .sort(sortBy)
            .skip(skip)
            .limit(Math.min(limit, MAX_LIMIT))
            .lean();
    }

    /** Reviews *about* a subject (employee, manager, student or hotel). */
    async findByReviewee(
        revieweeId: string,
        options: ReviewListOptions = {},
    ) {
        const { page = 1, limit = 25, sortBy = "createdAt", filters = {} } = options;
        const skip = (page - 1) * limit;

        const query: Record<string, unknown> = { revieweeId };
        if (filters.reviewRelationship) {
            query.reviewRelationship = filters.reviewRelationship;
        }
        if (filters.hotelId) {
            query.hotelId = filters.hotelId;
        }
        if (filters.gigId) {
            query.gigId = filters.gigId;
        }

        const [reviews, total] = await Promise.all([
            ReviewModel.find(query)
                .sort(sortBy)
                .skip(skip)
                .limit(Math.min(limit, MAX_LIMIT))
                .lean(),
            ReviewModel.countDocuments(query),
        ]);

        return { reviews, total };
    }

    /**
     * Duplicate pre-check mirroring the partial unique index
     * (`userId + reviewRelationship + revieweeId + hotelId + gigId`).
     *
     * `gigId: null` deliberately matches documents where the field is absent,
     * which is how employment-scoped reviews are stored.
     */
    async findExistingRelationshipReview(key: DuplicateReviewKey) {
        return ReviewModel.findOne({
            userId: key.userId,
            reviewRelationship: key.reviewRelationship,
            revieweeId: key.revieweeId,
            hotelId: key.hotelId,
            gigId: key.gigId ?? null,
        })
            .select("_id id")
            .lean();
    }

    /**
     * Computes hotel rating statistics grouped by relationship.
     * Read-only: no aggregate is ever written back to the Hotel document, so
     * existing rating semantics are untouched.
     */
    async aggregateHotelRatingSummary(
        hotelId: string,
    ): Promise<HotelRatingSummaryRow[]> {
        if (!mongoose.isValidObjectId(hotelId)) {
            return [];
        }

        return ReviewModel.aggregate([
            { $match: { hotelId: new mongoose.Types.ObjectId(hotelId) } },
            {
                $group: {
                    _id: { $ifNull: ["$reviewRelationship", "LEGACY"] },
                    totalReviews: { $sum: 1 },
                    ratedReviews: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ["$rating", null] },
                                        { $gte: ["$rating", 1] },
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                    ratingSum: { $sum: { $ifNull: ["$rating", 0] } },
                    ratings: { $push: "$rating" },
                },
            },
            { $sort: { _id: 1 } },
        ]);
    }
}
