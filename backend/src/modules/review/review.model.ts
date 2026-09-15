import mongoose, { model, Schema } from "mongoose";
import { IReview } from "../../shared/interfaces";
import { ReviewType, UserRole } from "../../shared/enums";

const ReviewSchema = new Schema<IReview>({

    id: { type: String, required: true, unique: true },
    hotelId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Hotel"
    },
    gigId: { type: mongoose.Schema.Types.ObjectId, ref: "Gig" },
    jobId: {type: mongoose.Schema.Types.ObjectId, ref:"Job"},
    rating: { type: Number },
    feedbackRating: { type: Number },
    review: { type: String },
    feedbackReview: { type: String },
    userId: { type: mongoose.Types.ObjectId, ref: "User" },
    reviewType: {type : String, enum: Object.values(ReviewType), required: true},
    postedBy: {type : String, enum: Object.values(UserRole), required: true}

})

export const ReviewModel = model<IReview>("Review", ReviewSchema);