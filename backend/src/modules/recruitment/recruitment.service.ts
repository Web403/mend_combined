// ─────────────────────────────────────────────────────────────────────────────
// modules/recruitment/recruitment.service.ts
//
// Implements:
//   FR53 — Hotels post job openings
//   FR54 — Job listings display shift/recovery/certification policy
//   FR55 — Candidates apply via app
//   FR56 — Recruiters shortlist candidates
//   FR57 — Candidate ranking (rankScore from passport data)
//   FR58 — Rating system (post-hire star rating)
//   FR59 — Prevent exploitative job posts (shift/recovery policy validation)
//   FR60 — Flag unsafe shift patterns
//   FR61 — Block non-compliant hotels from hiring
//   FR62 — Recruitment audit trail (status history on application)
// ─────────────────────────────────────────────────────────────────────────────

import { nanoid } from "nanoid";
import { JobRepository } from "./job.repository";
import { ApplicationRepository } from "./application.repository";
import { AppError } from "../../core/middleware/error.middleware";
import { PassportModel } from "../passport/passport.model";
import { HotelModel } from "../hotel/hotel.model";
import {
  JobStatus,
  ApplicationStatus,
  CertificationLevel,
} from "../../shared/enums/recruitment";
import type {
  ApplyJobDto,
  ApplicationListOptions,
  ApplicationResponseDto,
  CreateJobDto,
  IApplication,
  IJob,
  JobListOptions,
  JobResponseDto,
  RateApplicationDto,
  ReviewApplicationDto,
  UpdateJobDto,
} from "../../shared/interfaces/recruitment.d";
import { extractHours } from "../../core/utils/pattern.helper";
import { Types } from "mongoose";

// ── Valid application status transitions (FR62 — audit trail) ─────────────────
const VALID_APPLICATION_TRANSITIONS: Record<
  ApplicationStatus,
  ApplicationStatus[]
> = {
  [ApplicationStatus.APPLIED]: [
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.UNDER_REVIEW]: [
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.SHORTLISTED]: [
    ApplicationStatus.HIRED,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.REJECTED]: [],
  [ApplicationStatus.HIRED]: [],
  [ApplicationStatus.WITHDRAWN]: [],
};

// ── Unsafe shift pattern detection (FR60) ────────────────────────────────────

function detectUnsafeShiftPattern(
  shiftPolicy: string,
  recoveryPolicy: string,
): string | null {
  // Other unsafe patterns
  const unsafePatterns = [
    /no\s+break/i,
    /24\s*\/\s*7/i,
    /split\s+shift.*no\s+gap/i,
    /no\s+rest/i,
  ];

  for (const pattern of unsafePatterns) {
    if (pattern.test(shiftPolicy) || pattern.test(recoveryPolicy)) {
      return "Unsafe shift or recovery policy detected.";
    }
  }

  // Validate shift duration
  const shiftHours = extractHours(shiftPolicy);
  if (shiftHours !== null && shiftHours > 10) {
    return `Shift duration is ${shiftHours} hours. Maximum allowed is 10 hours.`;
  }

  // Validate recovery duration
  const recoveryHours = extractHours(recoveryPolicy);
  if (recoveryHours !== null && recoveryHours < 14) {
    return `Recovery period is ${recoveryHours} hours. Minimum required is 14 hours.`;
  }

  return null;
}

// ── Rank score computation (FR57) ────────────────────────────────────────────
/**
 * Computes a 0–100 rank score for a candidate based on their Mend Passport.
 * Higher efficiency score and more certifications = higher rank.
 */
async function computeRankScore(applicantId: Types.ObjectId): Promise<number> {
  const passport = await PassportModel.findById(applicantId).lean();
  if (!passport) return 0;

  // Efficiency score contributes 60 points (already 0–100, scaled to 60)
  const efficiencyPoints = Math.min((passport.efficiencyScore ?? 0) * 0.6, 60);

  // Each certification contributes 10 points, capped at 30
  const certPoints = Math.min((passport.certifications?.length ?? 0) * 10, 30);

  // Career progression contributes up to 10 points
  const careerPoints = Math.min(
    (passport.careerProgression?.length ?? 0) * 5,
    10,
  );

  return Math.round(efficiencyPoints + certPoints + careerPoints);
}

// ── Service ───────────────────────────────────────────────────────────────────

export class RecruitmentService {
  private jobRepo = new JobRepository();
  private appRepo = new ApplicationRepository();

  // ── DTO mappers ─────────────────────────────────────────────────────────────

  private toJobDto(job: IJob): JobResponseDto {
    return {
      id: job.id,
      hotelId: job.hotelId,
      title: job.title,
      description: job.description,
      department: job.department,
      employmentType: job.employmentType,
      vacancies: job.vacancies,
      shiftPolicy: job.shiftPolicy,
      recoveryPolicy: job.recoveryPolicy,
      certificationRequired: job.certificationRequired,
      requiredSkills: job.requiredSkills,
      experienceRequired: job.experienceRequired,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      status: job.status,
      expiresAt: job.expiresAt?.toISOString(),
      postedBy: job.postedBy,
      applicationCount: job.applicationCount,
      blockReason: job.blockReason,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }

  private toAppDto(
    app: IApplication,
    isRecruiter = false,
  ): ApplicationResponseDto {
    return {
      id: app.id,
      hotelId: app.hotelId,
      jobId: app.jobId,
      jobHotelId: app.jobHotelId,
      applicantId: app.applicantId,
      status: app.status,
      coverNote: app.coverNote,
      // Only expose recruiter notes to recruiters
      recruiterNotes: isRecruiter ? app.recruiterNotes : undefined,
      rankScore: app.rankScore,
      rating: app.rating,
      appliedAt:
        app.appliedAt instanceof Date
          ? app.appliedAt.toISOString()
          : app.appliedAt,
      reviewedAt:
        app.reviewedAt instanceof Date
          ? app.reviewedAt.toISOString()
          : app.reviewedAt,
      reviewedBy: app.reviewedBy,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
    };
  }

  // ── Job: Create (FR53, FR54, FR59, FR60) ────────────────────────────────────

  async createJob(
    hotelId: any,
    postedBy: string,
    dto: CreateJobDto,
  ): Promise<JobResponseDto> {
    // FR61 — Block non-compliant hotels from posting jobs
    await this.assertHotelNotBlocked(hotelId);

    this.validateJobDto(dto);

    // FR59 / FR60 — Detect exploitative or unsafe shift patterns
    const unsafeReason = detectUnsafeShiftPattern(
      dto.shiftPolicy,
      dto.recoveryPolicy,
    );
    if (unsafeReason) {
      throw new AppError(unsafeReason, 422);
    }

    const job = await this.jobRepo.create({
      id: `JOB_${nanoid(10)}`,
      hotelId,
      schemaVersion: 1,
      title: dto.title.trim(),
      description: dto.description.trim(),
      department: dto.department,
      employmentType: dto.employmentType,
      vacancies: dto.vacancies,
      shiftPolicy: dto.shiftPolicy.trim(),
      recoveryPolicy: dto.recoveryPolicy.trim(),
      certificationRequired: dto.certificationRequired,
      requiredSkills: dto.requiredSkills ?? [],
      experienceRequired: dto.experienceRequired ?? "",
      salaryMin: dto.salaryMin,
      salaryMax: dto.salaryMax,
      salaryCurrency: dto.salaryCurrency ?? "INR",
      status: JobStatus.DRAFT,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      postedBy,
      applicationCount: 0,
    });

    return this.toJobDto(job);
  }

  // ── Job: Publish (moves DRAFT → OPEN) ───────────────────────────────────────

  async publishJob(hotelId: string, jobId: string): Promise<JobResponseDto> {
    const job = await this.jobRepo.findByIdAndHotel(hotelId, jobId);
    if (!job) throw new AppError("Job not found.", 404);

    if (job.status === JobStatus.BLOCKED) {
      throw new AppError(
        `This job is blocked and cannot be published. Reason: ${job.blockReason ?? "compliance violation"}`,
        403,
      );
    }

    if (job.status === JobStatus.OPEN) {
      throw new AppError("Job is already published.", 400);
    }

    if (job.status === JobStatus.CLOSED) {
      throw new AppError(
        "A closed job cannot be re-published. Create a new posting.",
        400,
      );
    }

    // Re-check hotel compliance before publishing
    await this.assertHotelNotBlocked(hotelId);

    const updated = await this.jobRepo.update(hotelId, jobId, {
      status: JobStatus.OPEN,
    });
    return this.toJobDto(updated!);
  }

  // ── Job: Close ───────────────────────────────────────────────────────────────

  async closeJob(hotelId: string, jobId: string): Promise<JobResponseDto> {
    const job = await this.jobRepo.findByIdAndHotel(hotelId, jobId);
    if (!job) throw new AppError("Job not found.", 404);

    if (job.status === JobStatus.CLOSED) {
      throw new AppError("Job is already closed.", 400);
    }

    const updated = await this.jobRepo.update(hotelId, jobId, {
      status: JobStatus.CLOSED,
    });
    return this.toJobDto(updated!);
  }

  // ── Job: Update ──────────────────────────────────────────────────────────────

  async updateJob(
    hotelId: string,
    jobId: string,
    dto: UpdateJobDto,
  ): Promise<JobResponseDto> {
    const job = await this.jobRepo.findByIdAndHotel(hotelId, jobId);
    if (!job) throw new AppError("Job not found.", 404);

    if (job.status === JobStatus.BLOCKED) {
      throw new AppError("Blocked jobs cannot be edited.", 403);
    }

    if (job.status === JobStatus.CLOSED) {
      throw new AppError("Closed jobs cannot be edited.", 400);
    }

    const payload: Partial<IJob> = {};

    if (dto.title !== undefined) {
      if (!dto.title.trim()) throw new AppError("title cannot be blank.", 400);
      payload.title = dto.title.trim();
    }
    if (dto.description !== undefined)
      payload.description = dto.description.trim();
    if (dto.department !== undefined) payload.department = dto.department;
    if (dto.employmentType !== undefined)
      payload.employmentType = dto.employmentType;
    if (dto.vacancies !== undefined) {
      if (dto.vacancies < 1)
        throw new AppError("vacancies must be at least 1.", 400);
      payload.vacancies = dto.vacancies;
    }
    if (dto.shiftPolicy !== undefined)
      payload.shiftPolicy = dto.shiftPolicy.trim();
    if (dto.recoveryPolicy !== undefined)
      payload.recoveryPolicy = dto.recoveryPolicy.trim();
    if (dto.certificationRequired !== undefined)
      payload.certificationRequired = dto.certificationRequired;
    if (dto.requiredSkills !== undefined)
      payload.requiredSkills = dto.requiredSkills;
    if (dto.experienceRequired !== undefined)
      payload.experienceRequired = dto.experienceRequired;
    if (dto.salaryMin !== undefined) payload.salaryMin = dto.salaryMin;
    if (dto.salaryMax !== undefined) payload.salaryMax = dto.salaryMax;
    if (dto.salaryCurrency !== undefined)
      payload.salaryCurrency = dto.salaryCurrency;
    if (dto.expiresAt !== undefined)
      payload.expiresAt = new Date(dto.expiresAt);

    // Re-validate shift patterns if policies changed
    const newShift = payload.shiftPolicy ?? job.shiftPolicy;
    const newRecovery = payload.recoveryPolicy ?? job.recoveryPolicy;
    const unsafeReason = detectUnsafeShiftPattern(newShift, newRecovery);
    if (unsafeReason) throw new AppError(unsafeReason, 422);

    const updated = await this.jobRepo.update(hotelId, jobId, payload);
    if (!updated) throw new AppError("Job not found.", 404);

    return this.toJobDto(updated);
  }

  // ── Job: Delete ──────────────────────────────────────────────────────────────

  async deleteJob(hotelId: string, jobId: string): Promise<void> {
    const job = await this.jobRepo.findByIdAndHotel(hotelId, jobId);
    if (!job) throw new AppError("Job not found.", 404);

    if (job.status === JobStatus.OPEN && job.applicationCount > 0) {
      throw new AppError(
        "Cannot delete an open job that already has applications. Close it first.",
        400,
      );
    }

    await this.jobRepo.delete(hotelId, jobId);
  }

  // ── Job: Read ────────────────────────────────────────────────────────────────

  async getJobById(jobId: string): Promise<JobResponseDto> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) throw new AppError("Job not found.", 404);
    return this.toJobDto(job);
  }

  async getPublicListings(
    options: JobListOptions = {},
  ): Promise<{ jobs: JobResponseDto[]; pagination: object }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 25;

    const { jobs, total } = await this.jobRepo.findPublicListings({
      ...options,
      page,
      limit,
    });

    return {
      jobs: jobs.map((j) => this.toJobDto(j)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getHotelJobs(
    hotelId: string,
    options: JobListOptions = {},
  ): Promise<{ jobs: JobResponseDto[]; pagination: object }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 25;

    const { jobs, total } = await this.jobRepo.findByHotel(hotelId, {
      ...options,
      page,
      limit,
    });

    return {
      jobs: jobs.map((j) => this.toJobDto(j)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getJobStats(hotelId: string): Promise<{
    countByStatus: { status: string; count: number }[];
    applicationsByStatus: { status: string; count: number }[];
  }> {
    const [countByStatus, applicationsByStatus] = await Promise.all([
      this.jobRepo.countByStatus(hotelId),
      this.appRepo.countByStatusForHotel(hotelId),
    ]);
    return { countByStatus, applicationsByStatus };
  }

  // ── Application: Apply (FR55) ────────────────────────────────────────────────

  async applyToJob(
    applicantId: Types.ObjectId,
    jobId: string,
    dto: ApplyJobDto,
  ): Promise<ApplicationResponseDto> {
    // 1. Job must exist and be OPEN
    const job = await this.jobRepo.findById(jobId);
    
    if (!job) throw new AppError("Job not found.", 404);

    if (job.status !== JobStatus.OPEN) {
      throw new AppError("This job is not accepting applications.", 400);
    }

    // 2. Check expiry
    if (job.expiresAt && job.expiresAt < new Date()) {
      throw new AppError("This job posting has expired.", 400);
    }

    // 3. Prevent duplicate application
    const existing = await this.appRepo.findByJobAndApplicant(
      jobId,
      applicantId,
    );
    if (existing) {
      if (existing.status === ApplicationStatus.WITHDRAWN) {
        // Allow re-apply after withdrawal
        const reApplied = await this.appRepo.update(existing.id, {
          status: ApplicationStatus.APPLIED,
          coverNote: dto.coverNote?.trim(),
          appliedAt: new Date(),
          reviewedAt: undefined,
          reviewedBy: undefined,
          recruiterNotes: undefined,
        });
        return this.toAppDto(reApplied!);
      }
      throw new AppError("You have already applied to this job.", 409);
    }

    // 4. Compute rank score from passport (FR57)
    const rankScore = await computeRankScore(applicantId);

    // 5. Create application
    const application = await this.appRepo.create({
      id: `APP_${nanoid(10)}`,
      hotelId:job.hotelId,
      // hotelId: applicantId, // applicant's own hotelId for tenant scoping
      schemaVersion: 1,
      jobId,
      jobHotelId: job.hotelId.toString(),
      applicantId,
      status: ApplicationStatus.APPLIED,
      coverNote: dto.coverNote?.trim(),
      rankScore,
      appliedAt: new Date(),
    });

    // 6. Increment job application count
    await this.jobRepo.incrementApplicationCount(jobId, 1);

    return this.toAppDto(application);
  }

  // ── Application: Withdraw ────────────────────────────────────────────────────

  async withdrawApplication(
    applicantId: Types.ObjectId,
    applicationId: string,
  ): Promise<ApplicationResponseDto> {
    const app = await this.appRepo.findById(applicationId);
    if (!app) throw new AppError("Application not found.", 404);
    if (app.applicantId !== applicantId) throw new AppError("Forbidden.", 403);

    if (
      app.status === ApplicationStatus.HIRED ||
      app.status === ApplicationStatus.REJECTED
    ) {
      throw new AppError(
        `Cannot withdraw an application that is already ${app.status.toLowerCase()}.`,
        400,
      );
    }

    if (app.status === ApplicationStatus.WITHDRAWN) {
      throw new AppError("Application is already withdrawn.", 400);
    }

    const updated = await this.appRepo.update(applicationId, {
      status: ApplicationStatus.WITHDRAWN,
    });

    await this.jobRepo.incrementApplicationCount(app.jobId, -1);

    return this.toAppDto(updated!);
  }

  // ── Application: Review / Shortlist (FR56) ───────────────────────────────────

  async reviewApplication(
    reviewerId: string,
    applicationId: string,
    dto: ReviewApplicationDto,
  ): Promise<ApplicationResponseDto> {
    const app = await this.appRepo.findById(applicationId);
    if (!app) throw new AppError("Application not found.", 404);

    const currentStatus = app.status as ApplicationStatus;
    const allowedNext = VALID_APPLICATION_TRANSITIONS[currentStatus];

    if (!allowedNext.includes(dto.status)) {
      throw new AppError(
        `Invalid status transition: ${app.status} → ${dto.status}. Allowed: [${allowedNext.join(", ") || "none"}]`,
        400,
      );
    }

    const updated = await this.appRepo.update(applicationId, {
      status: dto.status,
      recruiterNotes: dto.recruiterNotes?.trim(),
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
    });

    return this.toAppDto(updated!, true);
  }

  // ── Application: Rate (FR58) ─────────────────────────────────────────────────

  async rateApplication(
    reviewerId: string,
    applicationId: string,
    dto: RateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new AppError("rating must be between 1 and 5.", 400);
    }

    const app = await this.appRepo.findById(applicationId);
    if (!app) throw new AppError("Application not found.", 404);

    if (app.status !== ApplicationStatus.HIRED) {
      throw new AppError("Only hired candidates can be rated.", 400);
    }

    const updated = await this.appRepo.update(applicationId, {
      rating: dto.rating,
      reviewedBy: reviewerId,
    });

    return this.toAppDto(updated!, true);
  }

  // ── Application: Read ────────────────────────────────────────────────────────

  async getApplicationById(
    applicationId: string,
    requesterId: string,
    isRecruiter: boolean,
  ): Promise<ApplicationResponseDto> {
    const app = await this.appRepo.findById(applicationId);
    if (!app) throw new AppError("Application not found.", 404);

    // Candidates can only see their own applications
    if (!isRecruiter && app.applicantId.toString() !== requesterId) {
      throw new AppError("Forbidden.", 403);
    }

    return this.toAppDto(app, isRecruiter);
  }

  async getApplicationsForJob(
    jobId: string,
    options: ApplicationListOptions = {},
  ): Promise<{ applications: ApplicationResponseDto[]; pagination: object }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 25;

    const { applications, total } = await this.appRepo.findByJob(jobId, {
      ...options,
      page,
      limit,
    });

    return {
      applications: applications.map((a) => this.toAppDto(a, true)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMyApplications(
    applicantId: Types.ObjectId,
    options: ApplicationListOptions = {},
  ): Promise<{ applications: ApplicationResponseDto[]; pagination: object }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 25;

    const { applications, total } = await this.appRepo.findByApplicant(
      applicantId,
      { ...options, page, limit },
    );

    return {
      applications: applications.map((a) => this.toAppDto(a, false)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getHotelApplications(
    jobHotelId: string,
    options: ApplicationListOptions = {},
  ): Promise<{ applications: ApplicationResponseDto[]; pagination: object }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 25;

    const { applications, total } = await this.appRepo.findByHotel(jobHotelId, {
      ...options,
      page,
      limit,
    });

    return {
      applications: applications.map((a) => this.toAppDto(a, true)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getApplicationStatsForJob(
    jobId: string,
  ): Promise<{ status: string; count: number }[]> {
    return this.appRepo.countByStatusForJob(jobId);
  }

  // ── Admin: Block hotel from hiring (FR61) ────────────────────────────────────

  async blockHotelJobs(
    hotelId: string,
    reason: string,
  ): Promise<{ blocked: number }> {
    if (!reason?.trim()) {
      throw new AppError("A reason is required when blocking a hotel.", 400);
    }

    const result = await JobModel_blockAll(hotelId, reason);
    return { blocked: result };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async assertHotelNotBlocked(hotelId: string): Promise<void> {
    const hotel = await HotelModel.findById(hotelId).lean();
    if (!hotel) throw new AppError("Hotel not found.", 404);

    if (hotel.isStriked) {
      throw new AppError(
        "This hotel is currently flagged and cannot post or publish job listings.",
        403,
      );
    }
  }

  private validateJobDto(dto: CreateJobDto): void {
    if (!dto.title?.trim()) throw new AppError("title is required.", 400);
    if (!dto.description?.trim())
      throw new AppError("description is required.", 400);
    if (!dto.department) throw new AppError("department is required.", 400);
    if (!dto.employmentType)
      throw new AppError("employmentType is required.", 400);
    if (!dto.shiftPolicy?.trim())
      throw new AppError("shiftPolicy is required.", 400);
    if (!dto.recoveryPolicy?.trim())
      throw new AppError("recoveryPolicy is required.", 400);
    if (!dto.certificationRequired)
      throw new AppError("certificationRequired is required.", 400);

    if (!dto.vacancies || dto.vacancies < 1) {
      throw new AppError("vacancies must be at least 1.", 400);
    }

    if (dto.salaryMin !== undefined && dto.salaryMax !== undefined) {
      if (dto.salaryMin > dto.salaryMax) {
        throw new AppError("salaryMin cannot be greater than salaryMax.", 400);
      }
    }

    if (dto.expiresAt) {
      const exp = new Date(dto.expiresAt);
      if (isNaN(exp.getTime()))
        throw new AppError("expiresAt is not a valid date.", 400);
      if (exp <= new Date())
        throw new AppError("expiresAt must be a future date.", 400);
    }
  }
}

// ── Module-level helper (avoids circular import) ──────────────────────────────
async function JobModel_blockAll(
  hotelId: string,
  reason: string,
): Promise<number> {
  const { JobModel } = await import("./job.model");
  const result = await JobModel.updateMany(
    { hotelId, status: { $in: [JobStatus.OPEN, JobStatus.DRAFT] } },
    { status: JobStatus.BLOCKED, blockReason: reason },
  );
  return result.modifiedCount;
}
