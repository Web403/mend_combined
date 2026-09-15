// ─────────────────────────────────────────────────────────────────────────────
// modules/gigs/gig.service.ts
//
// Implements Gig lifecycle business logic:
//   Requirement 3  — Create a Gig
//   Requirement 4  — Publish a Gig
//   Requirement 5  — Close and Cancel a Gig
//   Requirement 6  — Update a Gig
//   Requirement 7  — Browse Gigs (Public Marketplace)
//   Requirement 9  — Block Hotel from Posting Gigs (admin)
//   Requirement 12 — Hotel Gig Dashboard
//   Requirement 14 — Block Hotel from Posting Gigs
//   Requirement 15 — GIG EmploymentType
//   Requirement 16 — Gig Expiry
// ─────────────────────────────────────────────────────────────────────────────

import { nanoid } from "nanoid";
import { GigRepository } from "./gig.repository";
import { AppError } from "../../core/middleware/error.middleware";
import { HotelModel } from "../hotel/hotel.model";
import {
  GigStatus,
  RateUnit,
  EmploymentType,
  CertificationLevel,
} from "../../shared/enums/recruitment";
import type {
  IGig,
  CreateGigDto,
  UpdateGigDto,
  GigResponseDto,
  GigListOptions,
} from "../../shared/interfaces/gigs.d";
import { extractHours } from "../../core/utils/pattern.helper";

// ── Unsafe shift pattern detection (reused from recruitment module, FR60) ─────

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

// ── Service ───────────────────────────────────────────────────────────────────

export class GigService {
  private gigRepo = new GigRepository();

  // ── DTO mapper ──────────────────────────────────────────────────────────────

  private toDto(gig: IGig): GigResponseDto {
    return {
      id: gig.id,
      hotelId: gig.hotelId,
      title: gig.title,
      description: gig.description,
      department: gig.department,
      slots: gig.slots,
      filledSlots: gig.filledSlots,
      startAt:
        gig.startAt instanceof Date ? gig.startAt.toISOString() : gig.startAt,
      endAt: gig.endAt instanceof Date ? gig.endAt.toISOString() : gig.endAt,
      rateAmount: gig.rateAmount,
      rateUnit: gig.rateUnit,
      certificationRequired: gig.certificationRequired,
      requiredSkills: gig.requiredSkills,
      status: gig.status,
      postedBy: gig.postedBy,
      bookingCount: gig.bookingCount,
      blockReason: gig.blockReason,
      employmentType: gig.employmentType,
      createdAt: gig.createdAt.toISOString(),
      updatedAt: gig.updatedAt.toISOString(),
    };
  }

  // ── Create (Requirements 3.1–3.11) ──────────────────────────────────────────

  async createGig(
    hotelId: any,
    postedBy: string,
    dto: CreateGigDto,
  ): Promise<GigResponseDto> {
    // Requirement 3.8 — hotel must not be blocked
    await this.assertHotelNotBlocked(hotelId);

    // Validate fields
    this.validateCreateDto(dto);

    // Requirement 3.9 — compliance engine shift/recovery check
    if (dto.shiftPolicy && dto.recoveryPolicy) {
      const unsafeReason = detectUnsafeShiftPattern(
        dto.shiftPolicy,
        dto.recoveryPolicy,
      );
      if (unsafeReason) throw new AppError(unsafeReason, 422);
    }

    const gig = await this.gigRepo.create({
      id: `GIG_${nanoid(10)}`,
      hotelId,
      schemaVersion: 1,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? "",
      department: dto.department,
      slots: dto.slots,
      filledSlots: 0,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      rateAmount: dto.rateAmount,
      rateUnit: dto.rateUnit,
      certificationRequired:
        dto.certificationRequired ?? CertificationLevel.NONE,
      requiredSkills: dto.requiredSkills ?? [],
      status: GigStatus.DRAFT, // Requirement 3.1
      postedBy,
      bookingCount: 0,
      employmentType: EmploymentType.GIG, // Requirement 15.3
    });

    return this.toDto(gig);
  }

  // ── Publish (Requirements 4.1–4.5) ──────────────────────────────────────────

  async publishGig(hotelId: string, gigId: string): Promise<GigResponseDto> {
    const gig = await this.gigRepo.findByIdAndHotel(hotelId, gigId);
    if (!gig) throw new AppError("Gig not found.", 404);

    // Requirement 4.2
    if (gig.status === GigStatus.CANCELLED && gig.blockReason) {
      throw new AppError(
        `This Gig is blocked and cannot be published. Reason: ${gig.blockReason}`,
        403,
      );
    }

    // Requirement 4.3
    if (gig.status === GigStatus.OPEN) {
      throw new AppError("Gig is already published.", 400);
    }

    // Requirement 4.4
    if (gig.status === GigStatus.CLOSED || gig.status === GigStatus.CANCELLED) {
      throw new AppError(
        "A closed or cancelled Gig cannot be re-published.",
        400,
      );
    }

    // Requirement 4.5 — re-assert hotel not blocked before publishing
    await this.assertHotelNotBlocked(hotelId);

    const updated = await this.gigRepo.update(hotelId, gigId, {
      status: GigStatus.OPEN,
    });
    if (!updated) throw new AppError("Gig not found.", 404);
    return this.toDto(updated);
  }

  // ── Close (Requirements 5.1, 5.4) ───────────────────────────────────────────

  async closeGig(hotelId: string, gigId: string): Promise<GigResponseDto> {
    const gig = await this.gigRepo.findByIdAndHotel(hotelId, gigId);
    if (!gig) throw new AppError("Gig not found.", 404);

    // Requirement 5.4
    if (gig.status === GigStatus.CLOSED) {
      throw new AppError("Gig is already closed.", 400);
    }

    if (gig.status !== GigStatus.OPEN && gig.status !== GigStatus.FULL) {
      throw new AppError("Only open or full Gigs can be closed.", 400);
    }

    const updated = await this.gigRepo.update(hotelId, gigId, {
      status: GigStatus.CLOSED,
    });
    if (!updated) throw new AppError("Gig not found.", 404);
    return this.toDto(updated);
  }

  // ── Cancel (Requirements 5.2, 5.3, 5.5) ────────────────────────────────────

  async cancelGig(
    hotelId: string,
    gigId: string,
    cancelBookingsFn: (gigId: string) => Promise<number>,
  ): Promise<GigResponseDto> {
    const gig = await this.gigRepo.findByIdAndHotel(hotelId, gigId);
    if (!gig) throw new AppError("Gig not found.", 404);

    // Requirement 5.5
    if (gig.status === GigStatus.CANCELLED || gig.status === GigStatus.CLOSED) {
      throw new AppError(
        "Gig cannot be cancelled from its current status.",
        400,
      );
    }

    // Requirement 5.2 — allowed from DRAFT, OPEN, or FULL
    if (
      gig.status !== GigStatus.DRAFT &&
      gig.status !== GigStatus.OPEN &&
      gig.status !== GigStatus.FULL
    ) {
      throw new AppError(
        "Gig cannot be cancelled from its current status.",
        400,
      );
    }

    // Requirement 5.3 — cascade-cancel all CONFIRMED bookings
    await cancelBookingsFn(gigId);

    const updated = await this.gigRepo.update(hotelId, gigId, {
      status: GigStatus.CANCELLED,
    });
    if (!updated) throw new AppError("Gig not found.", 404);
    return this.toDto(updated);
  }

  // ── Update (Requirements 6.1–6.4) ───────────────────────────────────────────

  async updateGig(
    hotelId: string,
    gigId: string,
    dto: UpdateGigDto,
  ): Promise<GigResponseDto> {
    const gig = await this.gigRepo.findByIdAndHotel(hotelId, gigId);
    if (!gig) throw new AppError("Gig not found.", 404);

    // Requirement 6.4 — only DRAFT gigs can be edited
    if (gig.status !== GigStatus.DRAFT) {
      throw new AppError("Only draft Gigs can be edited.", 400);
    }

    const payload: Partial<IGig> = {};

    if (dto.title !== undefined) {
      const trimmed = dto.title.trim();
      if (trimmed.length < 3 || trimmed.length > 120) {
        throw new AppError("title must be between 3 and 120 characters.", 400);
      }
      payload.title = trimmed;
    }

    if (dto.description !== undefined)
      payload.description = dto.description.trim();
    if (dto.department !== undefined) payload.department = dto.department;
    if (dto.rateUnit !== undefined) payload.rateUnit = dto.rateUnit;
    if (dto.certificationRequired !== undefined)
      payload.certificationRequired = dto.certificationRequired;
    if (dto.requiredSkills !== undefined)
      payload.requiredSkills = dto.requiredSkills;

    if (dto.rateAmount !== undefined) {
      if (dto.rateAmount < 0)
        throw new AppError("rateAmount must be >= 0.", 400);
      payload.rateAmount = dto.rateAmount;
    }

    // Requirement 6.2 — slots cannot drop below filledSlots
    if (dto.slots !== undefined) {
      if (dto.slots < 1) throw new AppError("slots must be at least 1.", 400);
      if (dto.slots < gig.filledSlots) {
        throw new AppError(
          "slots cannot be less than the number of confirmed bookings.",
          400,
        );
      }
      payload.slots = dto.slots;
    }

    // Requirement 6.3 — re-validate endAt > startAt if either date changes
    if (dto.startAt !== undefined || dto.endAt !== undefined) {
      const newStart = dto.startAt ? new Date(dto.startAt) : gig.startAt;
      const newEnd = dto.endAt ? new Date(dto.endAt) : gig.endAt;
      if (newEnd <= newStart) {
        throw new AppError("endAt must be after startAt.", 400);
      }
      if (dto.startAt) payload.startAt = newStart;
      if (dto.endAt) payload.endAt = newEnd;
    }

    const updated = await this.gigRepo.update(hotelId, gigId, payload);
    if (!updated) throw new AppError("Gig not found.", 404);
    return this.toDto(updated);
  }

  // ── Read: public marketplace (Requirements 7.1–7.7, 16.1) ──────────────────

  async getPublicListings(
    options: GigListOptions = {},
  ): Promise<{ gigs: GigResponseDto[]; pagination: object }> {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 25, 100); // Requirement 7.7, 16.1

    const { gigs, total } = await this.gigRepo.findPublicListings({
      ...options,
      page,
      limit,
    })

    return {
      gigs: gigs.map((g) => this.toDto(g)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Read: hotel dashboard (Requirements 12.1, 12.4–12.5, 16.3) ─────────────

  async getHotelGigs(
    hotelId: string,
    options: GigListOptions = {},
  ): Promise<{ gigs: GigResponseDto[]; pagination: object }> {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 25, 100); // Requirement 12.5

    const { gigs, total } = await this.gigRepo.findByHotel(hotelId, {
      ...options,
      page,
      limit,
    });

    return {
      gigs: gigs.map((g) => this.toDto(g)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Read: gig stats (Requirement 12.3) ──────────────────────────────────────

  async getGigStats(
    hotelId: string,
  ): Promise<{ countByStatus: { status: string; count: number }[] }> {
    const countByStatus = await this.gigRepo.countByStatus(hotelId);
    return { countByStatus };
  }

  // ── Read: single gig ────────────────────────────────────────────────────────

  async getGigById(gigId: string): Promise<GigResponseDto> {
    const gig = await this.gigRepo.findById(gigId);
    if (!gig) throw new AppError("Gig not found.", 404);
    return this.toDto(gig);
  }

  // ── Admin: block hotel gigs (Requirements 14.1–14.3) ────────────────────────

  async blockHotelGigs(
    hotelId: string,
    reason: string,
  ): Promise<{ blocked: number }> {
    // Requirement 14.2 — reason must be non-empty
    if (!reason?.trim()) {
      throw new AppError("A reason is required when blocking a hotel.", 400);
    }

    const blocked = await this.gigRepo.blockAllForHotel(hotelId, reason.trim());
    return { blocked };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async assertHotelNotBlocked(hotelId: string): Promise<void> {
    const hotel = await HotelModel.findById(hotelId).lean();
    if (!hotel) throw new AppError("Hotel not found.", 404);

    if (hotel.isStriked) {
      throw new AppError(
        "This hotel is currently flagged and cannot post Gigs.",
        403,
      );
    }
  }

  private validateCreateDto(dto: CreateGigDto): void {
    // Requirement 3.2 — title 3–120 chars
    if (!dto.title?.trim()) throw new AppError("title is required.", 400);
    const title = dto.title.trim();
    if (title.length < 3 || title.length > 120) {
      throw new AppError("title must be between 3 and 120 characters.", 400);
    }

    // Requirement 3.3 — slots >= 1
    if (!dto.slots || dto.slots < 1) {
      throw new AppError("slots must be at least 1.", 400);
    }

    // Requirement 3.6 — rateAmount >= 0
    if (
      dto.rateAmount === undefined ||
      dto.rateAmount === null ||
      dto.rateAmount < 0
    ) {
      throw new AppError("rateAmount must be >= 0.", 400);
    }

    // Requirement 3.7 — rateUnit must be a valid RateUnit enum value
    if (!dto.rateUnit || !Object.values(RateUnit).includes(dto.rateUnit)) {
      throw new AppError(
        `rateUnit must be one of: ${Object.values(RateUnit).join(", ")}.`,
        400,
      );
    }

    // Requirement 3.4, 3.11 — startAt must be valid ISO 8601 and at least 1 hour in the future
    if (!dto.startAt) throw new AppError("startAt is required.", 400);
    const startAt = new Date(dto.startAt);
    if (isNaN(startAt.getTime()))
      throw new AppError("startAt is not a valid date.", 400);

    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    if (startAt < oneHourFromNow) {
      throw new AppError("startAt must be at least 1 hour in the future.", 400);
    }

    // Requirement 3.5, 3.10 — endAt must be strictly after startAt
    if (!dto.endAt) throw new AppError("endAt is required.", 400);
    const endAt = new Date(dto.endAt);
    if (isNaN(endAt.getTime()))
      throw new AppError("endAt is not a valid date.", 400);
    if (endAt <= startAt) {
      throw new AppError("endAt must be after startAt.", 400);
    }
  }
}
