// ─────────────────────────────────────────────────────────────────────────────
// modules/passport/passport.service.ts
//
// Implements:
//   FR48 — Graduates/staff create professional profiles
//   FR49 — Profiles include skills, training, certifications, efficiency score,
//           compliance history
//   FR50 — System generates a Mend Passport credential
//   FR51 — Career progression history
// ─────────────────────────────────────────────────────────────────────────────

import { nanoid } from "nanoid";
import { PassportRepository } from "./passport.repository";
import { PassportModel } from "./passport.model";
import { AppError } from "../../core/middleware/error.middleware";
import { UserModel } from "../users/user.model";
import { HotelModel } from "../hotel/hotel.model";
import { logger } from "../../core/utils/logger";
import type {
  IPassport,
  UpsertPassportDto,
  PassportResponseDto,
} from "../../shared/interfaces/passport";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Generates a unique, human-readable Mend Passport credential number.
 * Format: MND-YYYYMMDD-XXXXXX  (e.g. MND-20260621-A3F9K2)
 */
function generateCredentialNumber(): string {
  const date   = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = nanoid(6).toUpperCase();
  return `MND-${date}-${suffix}`;
}

function mapToDto(p: IPassport): PassportResponseDto {
  return {
    id:                p.id,
    hotelId:           p.hotelId,
    userId:            p.userId,
    credentialNumber:  p.credentialNumber,
    skills:            p.skills,
    certifications:    p.certifications,
    efficiencyScore:   p.efficiencyScore,
    complianceHistory: p.complianceHistory,
    careerProgression: p.careerProgression,
    lastSyncedAt:      (p.lastSyncedAt as Date).toISOString(),
    createdAt:         (p.createdAt as Date).toISOString(),
    updatedAt:         (p.updatedAt as Date).toISOString(),
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export class PassportService {
  private readonly repo = new PassportRepository();

  // ── FR48, FR50 — Create passport ──────────────────────────────────────────

  async createPassport(
    hotelId: any,
    userId:  string
  ): Promise<PassportResponseDto> {
    const user = await UserModel.findOne({ id: userId }).lean();
    if (!user) throw new AppError("User not found.", 404);

    const existing = await this.repo.findByUserId(userId);
    if (existing) {
      throw new AppError(
        "A Mend Passport already exists for this user. Use PUT /passport/:userId to update it.",
        409
      );
    }

    // Generate a credential number guaranteed to be unique
    let credentialNumber = generateCredentialNumber();
    let collision        = await this.repo.findByCredentialNumber(credentialNumber);
    while (collision) {
      credentialNumber = generateCredentialNumber();
      collision        = await this.repo.findByCredentialNumber(credentialNumber);
    }

    // Pull live LMS certifications and task efficiency on creation (FR49)
    const { certifications, efficiencyScore } = await this.pullLiveData(hotelId, userId);

    const passport = await this.repo.create({
      id:                `passport_${nanoid(10)}`,
      hotelId,
      schemaVersion:     1,
      userId,
      credentialNumber,
      skills:            [],
      certifications,
      efficiencyScore,
      complianceHistory: [],
      careerProgression: [],
      lastSyncedAt:      new Date(),
    });

    logger.info("Mend Passport created", { userId, credentialNumber });

    return mapToDto(passport);
  }

  // ── FR49, FR51 — Update passport (skills + career) ─────────────────────────

  async updatePassport(
    userId: string,
    dto:    UpsertPassportDto
  ): Promise<PassportResponseDto> {
    const existing = await this.repo.findByUserId(userId);
    if (!existing) {
      throw new AppError(
        "No passport found for this user. Create one first via POST /passport.",
        404
      );
    }

    const updates: Partial<IPassport> = {};

    if (dto.skills !== undefined) {
      // Deduplicate and trim (FR49)
      updates.skills = [
        ...new Set(dto.skills.map((s) => s.trim()).filter(Boolean)),
      ];
    }

    if (dto.careerProgression !== undefined) {
      updates.careerProgression = dto.careerProgression.map((entry) => ({
        title: entry.title.trim(),
        hotel: entry.hotel?.trim(),
        from:  new Date(entry.from),
        to:    entry.to ? new Date(entry.to) : undefined,
      }));
    }

    const updated = await this.repo.update(userId, updates);
    if (!updated) throw new AppError("Passport update failed.", 500);

    return mapToDto(updated);
  }

  // ── Sync live data (certifications + efficiency score) ────────────────────

  async syncPassport(
    hotelId: string,
    userId:  string
  ): Promise<PassportResponseDto> {
    const existing = await this.repo.findByUserId(userId);
    if (!existing) throw new AppError("No passport found. Create one first.", 404);

    const { certifications, efficiencyScore } = await this.pullLiveData(hotelId, userId);

    const updated = await this.repo.update(userId, {
      certifications,
      efficiencyScore,
      lastSyncedAt: new Date(),
    });

    if (!updated) throw new AppError("Passport sync failed.", 500);
    return mapToDto(updated);
  }

  // ── FR49 — Get passport ────────────────────────────────────────────────────

  async getPassportByUser(userId: string): Promise<PassportResponseDto> {
    const passport = await this.repo.findByUserId(userId);
    if (!passport) throw new AppError("Passport not found for this user.", 404);
    return mapToDto(passport);
  }

  async getPassportByCredential(credentialNumber: string): Promise<PassportResponseDto> {
    const passport = await this.repo.findByCredentialNumber(credentialNumber);
    if (!passport) {
      throw new AppError("No passport found with this credential number.", 404);
    }
    return mapToDto(passport);
  }

  async getHotelPassports(
    hotelId: string,
    opts:    { page?: number; limit?: number } = {}
  ): Promise<{ passports: PassportResponseDto[]; total: number }> {
    const { passports, total } = await this.repo.findByHotel(hotelId, opts);
    return { passports: passports.map(mapToDto), total };
  }

  // ── Internal: append compliance history entry (FR49) ──────────────────────

  /**
   * Called after a hotel compliance evaluation.
   * Appends or updates the entry in the staff member's compliance history.
   * Fails silently — passport is supplementary, must not break the compliance flow.
   */
  async appendComplianceEntry(
    userId:  string,
    hotelId: string,
    score:   number
  ): Promise<void> {
    try {
      const passport = await this.repo.findByUserId(userId);
      if (!passport) return;

      const hotel     = await HotelModel.findOne({ id: hotelId }).select("name").lean();
      const hotelName = (hotel as any)?.name ?? hotelId;

      // Check if there's an open entry for this hotel (no `to` date)
      const openEntryIndex = passport.complianceHistory.findIndex(
        (h) => h.hotelId === hotelId && !h.to
      );

      if (openEntryIndex >= 0) {
        // Update the score on the existing open entry using a targeted update
        await PassportModel.updateOne(
          {
            userId,
            [`complianceHistory.${openEntryIndex}.hotelId`]: hotelId,
          },
          {
            $set: { [`complianceHistory.${openEntryIndex}.score`]: score },
          }
        );
      } else {
        // Push a new entry at the front of the array
        await this.repo.pushComplianceHistory(userId, {
          hotelId,
          hotelName,
          score,
          from: new Date(),
        });
      }
    } catch (err) {
      logger.error("appendComplianceEntry failed", { userId, hotelId, error: err });
    }
  }

  // ── Private: pull live data from LMS + tasks ──────────────────────────────

  /**
   * Fetches active LMS certificate numbers and computes the normalised
   * efficiency score from task completion data for a given user.
   *
   * Both operations are wrapped in try/catch independently so a failure
   * in one does not block the other.
   */
  private async pullLiveData(
    hotelId: string,
    userId:  string
  ): Promise<{ certifications: string[]; efficiencyScore: number }> {
    let certifications: string[] = [];
    let efficiencyScore          = 0;

    // ── LMS certificates (FR49) ──────────────────────────────────────────────
    try {
      const { CertificateModel } = await import(
        "../lms/certificate/certificate.model"
      );

      const certs = await CertificateModel.find({
        hotelId,
        userId,
        status: "ACTIVE",
      })
        .select("certificateNumber")
        .lean();

      certifications = certs.map((c: any) => c.certificateNumber as string);
    } catch (err) {
      logger.error("pullLiveData: failed to fetch LMS certificates", { userId, error: err });
    }

    // ── Task efficiency score (FR49) ─────────────────────────────────────────
    try {
      const { TaskModel } = await import("../tasks/task.model");

      // User OPH
      const userResult = await TaskModel.aggregate([
        {
          $match: {
            hotelId,
            assignedTo: userId,
            status:     "COMPLETED",
            isDeleted:  false,
          },
        },
        {
          $group: {
            _id:                  null,
            totalWeighted:        { $sum: "$weight" },
            totalDurationMinutes: { $sum: "$durationMinutes" },
          },
        },
      ]);

      if (userResult.length && userResult[0].totalDurationMinutes > 0) {
        const userOph =
          userResult[0].totalWeighted / (userResult[0].totalDurationMinutes / 60);

        // Hotel average OPH for normalisation (same formula as task service)
        const hotelResult = await TaskModel.aggregate([
          {
            $match: {
              hotelId,
              status:    "COMPLETED",
              isDeleted: false,
            },
          },
          {
            $group: {
              _id:                  null,
              totalWeighted:        { $sum: "$weight" },
              totalDurationMinutes: { $sum: "$durationMinutes" },
            },
          },
        ]);

        const hotelAvgOph =
          hotelResult.length && hotelResult[0].totalDurationMinutes > 0
            ? hotelResult[0].totalWeighted / (hotelResult[0].totalDurationMinutes / 60)
            : 2; // baseline fallback

        efficiencyScore = Math.min(100, Math.round((userOph / hotelAvgOph) * 50));
      }
    } catch (err) {
      logger.error("pullLiveData: failed to compute efficiency score", { userId, error: err });
    }

    return { certifications, efficiencyScore };
  }
}
