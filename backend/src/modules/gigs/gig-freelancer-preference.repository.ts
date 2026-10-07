import { GigFreelancerPreferenceModel } from "./gig-freelancer-preference.model";
import { IGigFreelancerPreference } from "../../shared/interfaces/gigs.d";

export class GigFreelancerPreferenceRepository {
  async find(
    organizerId: string,
    workerId: string,
  ): Promise<IGigFreelancerPreference | null> {
    return GigFreelancerPreferenceModel.findOne({ organizerId, workerId }).lean();
  }

  async clearBlock(
    organizerId: string,
    workerId: string,
  ): Promise<IGigFreelancerPreference | null> {
    return GigFreelancerPreferenceModel.findOneAndUpdate(
      { organizerId, workerId, isBlocked: true },
      {
        $set: { isBlocked: false },
        $unset: { blockReason: 1, blockedAt: 1, blockedBy: 1 },
      },
      { new: true },
    ).lean();
  }

  async upsert(
    organizerId: string,
    hotelId: string,
    workerId: string,
    data: Partial<IGigFreelancerPreference>,
  ): Promise<IGigFreelancerPreference> {
    const preference = await GigFreelancerPreferenceModel.findOneAndUpdate(
      { organizerId, workerId },
      {
        $set: data,
        $setOnInsert: { organizerId, hotelId, workerId },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();

    if (!preference) {
      throw new Error("Unable to save freelancer preference.");
    }
    return preference;
  }
}
