import { nanoid } from "nanoid";
import { AppError } from "../../core/middleware/error.middleware";
import { BookingStatus, GigApplicationStatus, GigStatus } from "../../shared/enums/recruitment";
import { UserRole, UserStatus } from "../../shared/enums/user";
import type {
  ApplyToGigDto,
  GigApplicationListOptions,
  GigApplicationResponseDto,
  GigFreelancerPreferenceResponseDto,
  IGig,
  IGigApplication,
  IGigFreelancerPreference,
} from "../../shared/interfaces/gigs.d";
import { UserModel } from "../users/user.model";
import { BookingRepository } from "./booking.repository";
import { GigApplicationRepository } from "./gig-application.repository";
import { GigFreelancerPreferenceRepository } from "./gig-freelancer-preference.repository";
import { GigRepository } from "./gig.repository";

const GIG_WORKER_ROLES = [UserRole.STUDENT, UserRole.PROFESSIONAL];

export interface GigApplicationServiceDependencies {
  gigRepo: Pick<GigRepository, "findById" | "findByIdAndHotel" | "reserveSlot" | "releaseSlot" | "update">;
  applicationRepo: Pick<
    GigApplicationRepository,
    | "create"
    | "findById"
    | "findByGigAndApplicant"
    | "reapplyWithdrawn"
    | "updateIfStatus"
    | "update"
    | "updatePendingForOrganizerAndApplicant"
    | "findByGig"
    | "findByApplicant"
    | "revertApproval"
    | "clearBlock"
  >;
  preferenceRepo: Pick<
    GigFreelancerPreferenceRepository,
    "find" | "upsert" | "clearBlock"
  >;
  bookingRepo: Pick<
    BookingRepository,
    "hasOutstandingWorkerRating" | "create" | "deleteByApplicationId"
  >;
  findApplicant: (id: string) => Promise<{ role: string; status?: string } | null>;
}

export class GigApplicationService {
  private gigRepo: GigApplicationServiceDependencies["gigRepo"];
  private applicationRepo: GigApplicationServiceDependencies["applicationRepo"];
  private preferenceRepo: GigApplicationServiceDependencies["preferenceRepo"];
  private bookingRepo: GigApplicationServiceDependencies["bookingRepo"];
  private findApplicant: GigApplicationServiceDependencies["findApplicant"];

  constructor(deps: Partial<GigApplicationServiceDependencies> = {}) {
    this.gigRepo = deps.gigRepo ?? new GigRepository();
    this.applicationRepo = deps.applicationRepo ?? new GigApplicationRepository();
    this.preferenceRepo = deps.preferenceRepo ?? new GigFreelancerPreferenceRepository();
    this.bookingRepo = deps.bookingRepo ?? new BookingRepository();
    this.findApplicant =
      deps.findApplicant ??
      (async (id) =>
        UserModel.findById(id).select("role status").lean() as any);
  }

  private toDto(
    application: IGigApplication,
    forOrganizer = false,
  ): GigApplicationResponseDto {
    return {
      id: application.id,
      hotelId: application.hotelId,
      gigId: application.gigId,
      gigHotelId: application.gigHotelId,
      applicantId: application.applicantId as any,
      status: application.status,
      coverNote: application.coverNote,
      recruiterNotes: forOrganizer ? application.recruiterNotes : undefined,
      appliedAt: this.asIso(application.appliedAt),
      reviewedAt: application.reviewedAt
        ? this.asIso(application.reviewedAt)
        : undefined,
      reviewedBy: forOrganizer ? application.reviewedBy : undefined,
      bookingId: application.bookingId,
      priorityVote: forOrganizer ? application.priorityVote ?? 0 : 0,
      isBlocked: forOrganizer ? application.isBlocked ?? false : false,
      blockReason: forOrganizer ? application.blockReason : undefined,
      createdAt: this.asIso(application.createdAt),
      updatedAt: this.asIso(application.updatedAt),
    };
  }

  private toPreferenceDto(
    preference: IGigFreelancerPreference,
  ): GigFreelancerPreferenceResponseDto {
    return {
      workerId: preference.workerId,
      vote: preference.vote ?? 0,
      isBlocked: preference.isBlocked ?? false,
      blockReason: preference.blockReason,
      blockedAt: preference.blockedAt
        ? this.asIso(preference.blockedAt)
        : undefined,
    };
  }

  async applyToGig(
    applicantId: string,
    gigId: string,
    dto: ApplyToGigDto = {},
  ): Promise<GigApplicationResponseDto> {
    const applicant = await this.findApplicant(applicantId);
    if (!applicant) throw new AppError("Freelancer not found.", 404);
    if (!GIG_WORKER_ROLES.includes(applicant.role as UserRole)) {
      throw new AppError("Only freelancers can apply to a gig.", 403);
    }
    if (applicant.status && applicant.status !== UserStatus.ACTIVE) {
      throw new AppError("This account is not active.", 403);
    }

    if (await this.bookingRepo.hasOutstandingWorkerRating(applicantId)) {
      throw new AppError(
        "Rate the caterer for your completed gig before applying to another gig.",
        409,
      );
    }

    const gig = await this.gigRepo.findById(gigId);
    if (!gig) throw new AppError("Gig not found.", 404);
    if (gig.status !== GigStatus.OPEN) {
      throw new AppError("This gig is not accepting applications.", 400);
    }
    if (gig.startAt <= new Date()) {
      throw new AppError("This gig has already started.", 400);
    }
    if (gig.filledSlots >= gig.slots) {
      throw new AppError("This gig is fully staffed.", 409);
    }
    if (String(gig.postedBy) === applicantId) {
      throw new AppError("You cannot apply to your own gig.", 403);
    }

    if (dto.coverNote !== undefined && typeof dto.coverNote !== "string") {
      throw new AppError("coverNote must be a string.", 400);
    }
    const coverNote = dto.coverNote?.trim();
    if (coverNote && coverNote.length > 2000) {
      throw new AppError("coverNote cannot exceed 2000 characters.", 400);
    }

    const organizerId = String(gig.postedBy);
    const [preference, hotelPreference] = await Promise.all([
      this.preferenceRepo.find(organizerId, applicantId),
      organizerId === String(gig.hotelId)
        ? Promise.resolve(null)
        : this.preferenceRepo.find(String(gig.hotelId), applicantId),
    ]);
    if (preference?.isBlocked || hotelPreference?.isBlocked) {
      throw new AppError(
        "This caterer / event manager has blocked your applications to their gigs.",
        403,
      );
    }

    const existing = await this.applicationRepo.findByGigAndApplicant(
      gigId,
      applicantId,
    );
    const applicationData: Partial<IGigApplication> = {
      hotelId: gig.hotelId,
      schemaVersion: 1,
      gigId,
      gigHotelId: gig.hotelId,
      organizerId,
      applicantId: applicantId as any,
      status: GigApplicationStatus.APPLIED,
      coverNote,
      appliedAt: new Date(),
      priorityVote: preference?.vote ?? hotelPreference?.vote ?? 0,
      isBlocked: false,
    };

    if (existing) {
      if (existing.status !== GigApplicationStatus.WITHDRAWN) {
        throw new AppError("You have already applied to this gig.", 409);
      }
      const reapplied = await this.applicationRepo.reapplyWithdrawn(
        existing.id,
        applicationData,
      );
      if (!reapplied) {
        throw new AppError("This application can no longer be resubmitted.", 409);
      }
      return this.toDto(reapplied);
    }

    try {
      const application = await this.applicationRepo.create({
        id: `GAPP_${nanoid(10)}`,
        ...applicationData,
      });
      return this.toDto(application);
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new AppError("You have already applied to this gig.", 409);
      }
      throw error;
    }
  }

  async withdrawApplication(
    applicantId: string,
    applicationId: string,
  ): Promise<GigApplicationResponseDto> {
    const application = await this.applicationRepo.findById(applicationId);
    if (!application) throw new AppError("Application not found.", 404);
    if (application.applicantId.toString() !== applicantId) {
      throw new AppError("Forbidden.", 403);
    }
    if (application.status !== GigApplicationStatus.APPLIED) {
      throw new AppError("Only pending applications can be withdrawn.", 400);
    }

    const updated = await this.applicationRepo.updateIfStatus(
      applicationId,
      GigApplicationStatus.APPLIED,
      { status: GigApplicationStatus.WITHDRAWN },
    );
    if (!updated) throw new AppError("Application status changed; retry.", 409);
    return this.toDto(updated);
  }

  async getMyApplications(
    applicantId: string,
    options: GigApplicationListOptions = {},
  ): Promise<{ applications: GigApplicationResponseDto[]; pagination: object }> {
    const page = Math.max(options.page ?? 1, 1);
    const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
    const { applications, total } = await this.applicationRepo.findByApplicant(
      applicantId,
      { ...options, page, limit },
    );
    return {
      applications: applications.map((application) => this.toDto(application)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getApplicationsForGig(
    actorId: string,
    hotelId: string,
    gigId: string,
    canManageAllTenantGigs: boolean,
    options: GigApplicationListOptions = {},
  ): Promise<{ applications: GigApplicationResponseDto[]; pagination: object }> {
    await this.getManagedGig(actorId, hotelId, gigId, canManageAllTenantGigs);
    const page = Math.max(options.page ?? 1, 1);
    const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
    const { applications, total } = await this.applicationRepo.findByGig(
      gigId,
      { ...options, page, limit },
    );
    return {
      applications: applications.map((application) => this.toDto(application, true)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async approveApplication(
    actorId: string,
    hotelId: string,
    applicationId: string,
    canManageAllTenantGigs: boolean,
  ): Promise<GigApplicationResponseDto> {
    const application = await this.applicationRepo.findById(applicationId);
    if (!application) throw new AppError("Application not found.", 404);
    const gig = await this.getManagedGig(
      actorId,
      hotelId,
      application.gigId,
      canManageAllTenantGigs,
    );
    if (application.status !== GigApplicationStatus.APPLIED) {
      throw new AppError("Only pending applications can be approved.", 400);
    }

    const [actorPreference, gigOrganizerPreference] = await Promise.all([
      this.preferenceRepo.find(actorId, application.applicantId.toString()),
      this.preferenceRepo.find(
        application.organizerId,
        application.applicantId.toString(),
      ),
    ]);
    if (
      application.isBlocked ||
      actorPreference?.isBlocked ||
      gigOrganizerPreference?.isBlocked
    ) {
      throw new AppError("Unblock this freelancer before approving them.", 403);
    }
    if (gig.status !== GigStatus.OPEN || gig.startAt <= new Date()) {
      throw new AppError("This gig is no longer accepting hires.", 400);
    }

    const reservedGig = await this.gigRepo.reserveSlot(gig.id, gig.slots);
    if (!reservedGig) {
      throw new AppError("No gig slots remain; the gig is fully staffed.", 409);
    }

    let transitioned = false;
    let bookingCreated = false;
    try {
      const approved = await this.applicationRepo.updateIfStatus(
        applicationId,
        GigApplicationStatus.APPLIED,
        {
          status: GigApplicationStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedBy: actorId,
        },
      );
      if (!approved) {
        throw new AppError("This application has already been reviewed.", 409);
      }
      transitioned = true;

      const booking = await this.bookingRepo.create({
        id: `BKG_${nanoid(10)}`,
        hotelId: gig.hotelId,
        schemaVersion: 1,
        gigId: gig.id,
        gigHotelId: gig.hotelId,
        workerId: application.applicantId,
        applicationId: application.id,
        status: BookingStatus.CONFIRMED,
        confirmedAt: new Date(),
      });
      bookingCreated = true;

      const linked = await this.applicationRepo.update(approved.id, {
        bookingId: booking.id,
      });
      if (!linked) throw new AppError("Unable to link the booking.", 500);

      if (reservedGig.filledSlots >= reservedGig.slots) {
        await this.gigRepo.update(hotelId, gig.id, { status: GigStatus.FULL });
      }
      return this.toDto(linked, true);
    } catch (error) {
      if (bookingCreated) {
        await this.bookingRepo.deleteByApplicationId(application.id);
      }
      if (transitioned) {
        await this.applicationRepo.revertApproval(applicationId);
      }
      const releasedGig = await this.gigRepo.releaseSlot(gig.id);
      if (
        releasedGig?.status === GigStatus.FULL &&
        releasedGig.filledSlots < releasedGig.slots
      ) {
        await this.gigRepo.update(hotelId, gig.id, { status: GigStatus.OPEN });
      }
      throw error;
    }
  }

  async rejectApplication(
    actorId: string,
    hotelId: string,
    applicationId: string,
    canManageAllTenantGigs: boolean,
    recruiterNotes?: string,
  ): Promise<GigApplicationResponseDto> {
    const application = await this.applicationRepo.findById(applicationId);
    if (!application) throw new AppError("Application not found.", 404);
    await this.getManagedGig(
      actorId,
      hotelId,
      application.gigId,
      canManageAllTenantGigs,
    );
    if (application.status !== GigApplicationStatus.APPLIED) {
      throw new AppError("Only pending applications can be rejected.", 400);
    }
    if (recruiterNotes !== undefined && typeof recruiterNotes !== "string") {
      throw new AppError("recruiterNotes must be a string.", 400);
    }
    const notes = recruiterNotes?.trim();
    if (notes && notes.length > 2000) {
      throw new AppError("recruiterNotes cannot exceed 2000 characters.", 400);
    }

    const updated = await this.applicationRepo.updateIfStatus(
      applicationId,
      GigApplicationStatus.APPLIED,
      {
        status: GigApplicationStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedBy: actorId,
        recruiterNotes: notes,
      },
    );
    if (!updated) throw new AppError("This application has already been reviewed.", 409);
    return this.toDto(updated, true);
  }

  async voteForFreelancer(
    actorId: string,
    hotelId: string,
    applicationId: string,
    vote: number,
    canManageAllTenantGigs: boolean,
  ): Promise<GigFreelancerPreferenceResponseDto> {
    if (!Number.isInteger(vote) || ![-1, 0, 1].includes(vote)) {
      throw new AppError("vote must be -1 (down), 0 (clear), or 1 (up).", 400);
    }
    const application = await this.applicationRepo.findById(applicationId);
    if (!application) throw new AppError("Application not found.", 404);
    await this.getManagedGig(
      actorId,
      hotelId,
      application.gigId,
      canManageAllTenantGigs,
    );

    const preference = await this.preferenceRepo.upsert(
      actorId,
      hotelId,
      application.applicantId.toString(),
      { vote: vote as -1 | 0 | 1 },
    );
    await this.applicationRepo.updatePendingForOrganizerAndApplicant(
      actorId,
      application.applicantId.toString(),
      {
        priorityVote: vote as -1 | 0 | 1,
        isBlocked: preference.isBlocked,
        blockReason: preference.blockReason ?? null,
      },
    );
    if (application.organizerId !== actorId) {
      await this.applicationRepo.update(applicationId, {
        priorityVote: vote as -1 | 0 | 1,
      });
    }
    return this.toPreferenceDto(preference);
  }

  async blockFreelancer(
    actorId: string,
    hotelId: string,
    applicationId: string,
    reason: string,
    canManageAllTenantGigs: boolean,
  ): Promise<GigFreelancerPreferenceResponseDto> {
    const trimmedReason = typeof reason === "string" ? reason.trim() : "";
    if (!trimmedReason) {
      throw new AppError("A reason is required when blocking a freelancer.", 400);
    }
    if (trimmedReason.length > 1000) {
      throw new AppError("reason cannot exceed 1000 characters.", 400);
    }
    const application = await this.applicationRepo.findById(applicationId);
    if (!application) throw new AppError("Application not found.", 404);
    await this.getManagedGig(
      actorId,
      hotelId,
      application.gigId,
      canManageAllTenantGigs,
    );

    const preference = await this.preferenceRepo.upsert(
      actorId,
      hotelId,
      application.applicantId.toString(),
      {
        isBlocked: true,
        blockReason: trimmedReason,
        blockedAt: new Date(),
        blockedBy: actorId,
      },
    );
    await this.applicationRepo.updatePendingForOrganizerAndApplicant(
      actorId,
      application.applicantId.toString(),
      {
        isBlocked: true,
        blockReason: trimmedReason,
      },
    );
    await this.applicationRepo.update(applicationId, {
      isBlocked: true,
      blockReason: trimmedReason,
    });
    return this.toPreferenceDto(preference);
  }

  async unblockFreelancer(
    actorId: string,
    hotelId: string,
    applicationId: string,
    canManageAllTenantGigs: boolean,
  ): Promise<GigFreelancerPreferenceResponseDto> {
    const application = await this.applicationRepo.findById(applicationId);
    if (!application) throw new AppError("Application not found.", 404);
    await this.getManagedGig(
      actorId,
      hotelId,
      application.gigId,
      canManageAllTenantGigs,
    );

    const preference = await this.preferenceRepo.clearBlock(
      actorId,
      application.applicantId.toString(),
    );
    if (!preference) {
      throw new AppError("This freelancer is not blocked by your account.", 404);
    }
    await this.applicationRepo.updatePendingForOrganizerAndApplicant(
      actorId,
      application.applicantId.toString(),
      { isBlocked: false, blockReason: null },
    );
    await this.applicationRepo.clearBlock(applicationId);
    return this.toPreferenceDto(preference);
  }

  private async getManagedGig(
    actorId: string,
    hotelId: string,
    gigId: string,
    canManageAllTenantGigs: boolean,
  ): Promise<IGig> {
    const gig = await this.gigRepo.findByIdAndHotel(hotelId, gigId);
    if (!gig) throw new AppError("Gig not found.", 404);
    if (!canManageAllTenantGigs && String(gig.postedBy) !== actorId) {
      throw new AppError("You can manage only gigs posted by your account.", 403);
    }
    return gig;
  }

  private asIso(date: Date | string): string {
    return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
  }
}
