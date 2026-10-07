import { GigApplicationModel } from "./gig-application.model";
import { GigApplicationStatus } from "../../shared/enums/recruitment";
import {
  GigApplicationListOptions,
  IGigApplication,
} from "../../shared/interfaces/gigs.d";

const MAX_LIMIT = 100;

export class GigApplicationRepository {
  async create(data: Partial<IGigApplication>): Promise<IGigApplication> {
    return GigApplicationModel.create(data);
  }

  async findById(id: string): Promise<IGigApplication | null> {
    return GigApplicationModel.findOne({ id }).lean();
  }

  async findByGigAndApplicant(
    gigId: string,
    applicantId: string,
  ): Promise<IGigApplication | null> {
    return GigApplicationModel.findOne({ gigId, applicantId }).lean();
  }

  async update(
    id: string,
    data: Partial<IGigApplication>,
  ): Promise<IGigApplication | null> {
    return GigApplicationModel.findOneAndUpdate({ id }, data, {
      new: true,
      runValidators: true,
    }).lean();
  }

  async updateIfStatus(
    id: string,
    status: GigApplicationStatus,
    data: Partial<IGigApplication>,
  ): Promise<IGigApplication | null> {
    return GigApplicationModel.findOneAndUpdate(
      { id, status },
      data,
      { new: true, runValidators: true },
    ).lean();
  }

  async reapplyWithdrawn(
    id: string,
    data: Partial<IGigApplication>,
  ): Promise<IGigApplication | null> {
    return GigApplicationModel.findOneAndUpdate(
      { id, status: GigApplicationStatus.WITHDRAWN },
      {
        $set: data,
        $unset: {
          reviewedAt: 1,
          reviewedBy: 1,
          recruiterNotes: 1,
          bookingId: 1,
          blockReason: 1,
        },
      },
      { new: true, runValidators: true },
    ).lean();
  }

  async revertApproval(id: string): Promise<void> {
    await GigApplicationModel.updateOne(
      { id, status: GigApplicationStatus.APPROVED },
      {
        $set: { status: GigApplicationStatus.APPLIED },
        $unset: {
          reviewedAt: 1,
          reviewedBy: 1,
          recruiterNotes: 1,
          bookingId: 1,
        },
      },
    );
  }

  async clearBlock(id: string): Promise<IGigApplication | null> {
    return GigApplicationModel.findOneAndUpdate(
      { id },
      { $set: { isBlocked: false }, $unset: { blockReason: 1 } },
      { new: true },
    ).lean();
  }

  async updatePendingForOrganizerAndApplicant(
    organizerId: string,
    applicantId: string,
    data: {
      priorityVote?: -1 | 0 | 1;
      isBlocked?: boolean;
      blockReason?: string | null;
    },
  ): Promise<number> {
    const set: Record<string, unknown> = {};
    const unset: Record<string, number> = {};
    if (data.priorityVote !== undefined) set.priorityVote = data.priorityVote;
    if (data.isBlocked !== undefined) set.isBlocked = data.isBlocked;
    if (data.blockReason === null) unset.blockReason = 1;
    else if (data.blockReason !== undefined) set.blockReason = data.blockReason;

    const update: Record<string, unknown> = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;

    const result = await GigApplicationModel.updateMany(
      {
        organizerId,
        applicantId,
        status: GigApplicationStatus.APPLIED,
      },
      update,
    );
    return result.modifiedCount;
  }

  async findByGig(
    gigId: string,
    options: GigApplicationListOptions = {},
  ): Promise<{ applications: IGigApplication[]; total: number }> {
    const { page = 1, filters = {} } = options;
    const limit = Math.min(Math.max(options.limit ?? 25, 1), MAX_LIMIT);
    const skip = (Math.max(page, 1) - 1) * limit;
    const query: Record<string, unknown> = { gigId };

    if (filters.status) query.status = filters.status;
    if (filters.applicantId) query.applicantId = filters.applicantId;

    const [applications, total] = await Promise.all([
      GigApplicationModel.find(query)
        .sort({ priorityVote: -1, appliedAt: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .populate(
          "applicantId",
          "id email phone profession availability yearsOfExperience profile.firstName profile.lastName status",
        )
        .lean(),
      GigApplicationModel.countDocuments(query),
    ]);

    return { applications: applications as IGigApplication[], total };
  }

  async findByApplicant(
    applicantId: string,
    options: GigApplicationListOptions = {},
  ): Promise<{ applications: IGigApplication[]; total: number }> {
    const { page = 1, filters = {} } = options;
    const limit = Math.min(Math.max(options.limit ?? 25, 1), MAX_LIMIT);
    const skip = (Math.max(page, 1) - 1) * limit;
    const query: Record<string, unknown> = { applicantId };

    if (filters.status) query.status = filters.status;

    const [applications, total] = await Promise.all([
      GigApplicationModel.find(query)
        .sort({ appliedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      GigApplicationModel.countDocuments(query),
    ]);

    return { applications: applications as IGigApplication[], total };
  }

  async deleteById(id: string): Promise<void> {
    await GigApplicationModel.deleteOne({ id });
  }
}
