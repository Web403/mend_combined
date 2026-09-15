import { IReview } from "../../shared/interfaces";
import { ReviewListOptions } from "../../shared/interfaces/review";
import { ReviewModel } from "./review.model";

export class ReviewRepository {
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

} 