// ─────────────────────────────────────────────────────────────────────────────
// modules/recruitment/application.repository.ts
// ─────────────────────────────────────────────────────────────────────────────

import { ApplicationModel } from "./application.model";
import {
  IApplication,
  ApplicationListOptions,
} from "../../shared/interfaces/recruitment.d";
import { ApplicationStatus } from "../../shared/enums/recruitment";
import { Types } from "mongoose";

export class ApplicationRepository {
  // ── Write ───────────────────────────────────────────────────────────────────

  async create(data: Partial<IApplication>): Promise<IApplication> {
    return ApplicationModel.create(data);
  }

  async update(
    id: string,
    data: Partial<IApplication>,
  ): Promise<IApplication | null> {
    return ApplicationModel.findOneAndUpdate({ id }, data, {
      new: true,
    }).lean();
  }

  async delete(id: string): Promise<IApplication | null> {
    return ApplicationModel.findOneAndDelete({ id }).lean();
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<IApplication | null> {
    return ApplicationModel.findOne({ id }).lean();
  }

  async findByJobAndApplicant(
    jobId: string,
    applicantId: Types.ObjectId,
  ): Promise<IApplication | null> {
    return ApplicationModel.findOne({ jobId, applicantId }).lean();
  }

  /**
   * All applications for a specific job — recruiter view (FR56).
   * Sorted by rankScore descending for ranking (FR57).
   */
  async findByJob(
    jobId: string,
    options: ApplicationListOptions = {},
  ): Promise<{ applications: IApplication[]; total: number }> {
    const {
      page = 1,
      limit = 25,
      sortBy = "rankScore",
      sortOrder = "desc",
      filters = {},
    } = options;

    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = { jobId };

    if (filters.status) query.status = filters.status;

    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "desc" ? -1 : 1,
    };

    const [applications, total] = await Promise.all([
      ApplicationModel.find(query)
        .populate("applicantId")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      ApplicationModel.countDocuments(query),
    ]);

    return { applications: applications as IApplication[], total };
  }

  /**
   * All applications submitted by a candidate — candidate's own view (FR55).
   */
  async findByApplicant(
    applicantId: Types.ObjectId,
    options: ApplicationListOptions = {},
  ): Promise<{ applications: IApplication[]; total: number }> {
    const {
      page = 1,
      limit = 25,
      sortBy = "appliedAt",
      sortOrder = "desc",
      filters = {},
    } = options;

    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = { applicantId };

    if (filters.status) query.status = filters.status;
    if (filters.jobId) query.jobId = filters.jobId;

    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "desc" ? -1 : 1,
    };

    const [applications, total] = await Promise.all([
      ApplicationModel.find(query).sort(sort).skip(skip).limit(limit).lean(),
      ApplicationModel.countDocuments(query),
    ]);

    return { applications: applications as IApplication[], total };
  }

  /**
   * All applications for all jobs belonging to a hotel — hotel-wide view.
   */
  async findByHotel(
    jobHotelId: string,
    options: ApplicationListOptions = {},
  ): Promise<{ applications: IApplication[]; total: number }> {
    const {
      page = 1,
      limit = 25,
      sortBy = "appliedAt",
      sortOrder = "desc",
      filters = {},
    } = options;

    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = { jobHotelId };

    if (filters.status) query.status = filters.status;
    if (filters.jobId) query.jobId = filters.jobId;
    if (filters.applicantId) query.applicantId = filters.applicantId;

    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "desc" ? -1 : 1,
    };

    const [applications, total] = await Promise.all([
      ApplicationModel.find(query).sort(sort).skip(skip).limit(limit).lean(),
      ApplicationModel.countDocuments(query),
    ]);

    return { applications: applications as IApplication[], total };
  }

  async countByStatusForJob(jobId: string): Promise<any[]> {
    return ApplicationModel.aggregate([
      {
        $match: { jobId },
      },
      {
        $lookup: {
          from: "users", // collection name
          localField: "applicantId", // Application field
          foreignField: "_id", // User _id
          as: "applicant",
        },
      },
      {
        $unwind: "$applicant",
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          applicants: {
            $push: {
              id: "$applicant._id",
              firstName: "$applicant.profile.firstName",
              lastName: "$applicant.profile.lastName",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          status: "$_id",
          count: 1,
          applicants: 1,
        },
      },
    ]);
  }

  async countByStatusForHotel(
    jobHotelId: string,
  ): Promise<{ status: string; count: number }[]> {
    return ApplicationModel.aggregate([
      { $match: { jobHotelId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]);
  }
}
