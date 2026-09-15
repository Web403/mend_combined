// ─────────────────────────────────────────────────────────────────────────────
// modules/recruitment/job.repository.ts
// ─────────────────────────────────────────────────────────────────────────────

import { JobModel } from "./job.model";
import { IJob, JobListOptions } from "../../shared/interfaces/recruitment.d";
import { JobStatus } from "../../shared/enums/recruitment";

export class JobRepository {
  // ── Write ───────────────────────────────────────────────────────────────────

  async create(data: Partial<IJob>): Promise<IJob> {
    return JobModel.create(data);
  }

  async update(
    hotelId: string,
    jobId: string,
    data: Partial<IJob>
  ): Promise<IJob | null> {
    return JobModel.findOneAndUpdate(
      { hotelId, id: jobId },
      data,
      { new: true }
    ).lean();
  }

  async delete(hotelId: string, jobId: string): Promise<IJob | null> {
    return JobModel.findOneAndDelete({ hotelId, id: jobId }).lean();
  }

  async incrementApplicationCount(
    jobId: string,
    delta: 1 | -1
  ): Promise<void> {
    await JobModel.updateOne({ id: jobId }, { $inc: { applicationCount: delta } });
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  async findById(jobId: string): Promise<IJob | null> {
    return JobModel.findOne({ id: jobId }).lean();
  }

  async findByIdAndHotel(hotelId: string, jobId: string): Promise<IJob | null> {
    return JobModel.findOne({ hotelId, id: jobId }).lean();
  }

  /**
   * Public marketplace listing — returns OPEN jobs across all hotels.
   * Candidates browse this (FR53, FR54).
   */
  async findPublicListings(
    options: JobListOptions = {}
  ): Promise<{ jobs: IJob[]; total: number }> {
    const {
      page = 1,
      limit = 25,
      sortBy = "createdAt",
      sortOrder = "desc",
      filters = {},
    } = options;

    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { status: JobStatus.OPEN };

    if (filters.department)           query.department = filters.department;
    if (filters.employmentType)       query.employmentType = filters.employmentType;
    if (filters.certificationRequired) query.certificationRequired = filters.certificationRequired;

    if (filters.search) {
      query.$or = [
        { title:       { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
      ];
    }

    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "desc" ? -1 : 1,
    };

    const [jobs, total] = await Promise.all([
      JobModel.find(query).sort(sort).skip(skip).limit(limit).lean().populate("hotelId","name"),
      JobModel.countDocuments(query),
    ]);

    return { jobs: jobs as IJob[], total };
  }

  /**
   * Hotel's own job listings — all statuses visible to the hotel.
   */
  async findByHotel(
    hotelId: string,
    options: JobListOptions = {}
  ): Promise<{ jobs: IJob[]; total: number }> {
    const {
      page = 1,
      limit = 25,
      sortBy = "createdAt",
      sortOrder = "desc",
      filters = {},
    } = options;

    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { hotelId };

    if (filters.status)               query.status = filters.status;
    if (filters.department)           query.department = filters.department;
    if (filters.employmentType)       query.employmentType = filters.employmentType;
    if (filters.certificationRequired) query.certificationRequired = filters.certificationRequired;

    if (filters.search) {
      query.$or = [
        { title:       { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
      ];
    }

    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "desc" ? -1 : 1,
    };

    const [jobs, total] = await Promise.all([
      JobModel.find(query).sort(sort).skip(skip).limit(limit).lean().populate("hotelId","name"),
      JobModel.countDocuments(query),
    ]);

    return { jobs: jobs as IJob[], total };
  }

  async countByStatus(
    hotelId: string
  ): Promise<{ status: string; count: number }[]> {
    return JobModel.aggregate([
      { $match: { hotelId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]);
  }
}
