// ─────────────────────────────────────────────────────────────────────────────
// modules/sos/sos.service.ts
//
// Orchestrates SOS alert flows:
//   1. Trigger SOS alert with location capture
//   2. Notify managers instantly
//   3. Support escalation chain
//   4. Update status and resolve alerts
// ─────────────────────────────────────────────────────────────────────────────

import { SOSRepository } from "./sos.repository";
import { SosGeoHelper } from "./sos-geo.helper";
import { SOSErrors } from "./sos.errors";
import { HotelGeoZoneStore } from "../../shared/stores/hotel-geo-zone.store";
import { EmailService } from "../../core/utils/EmailService";
import type { ISOS } from "../../shared/interfaces";
import type { CoordinatesWithAccuracy } from "../../shared/interfaces/geo.interface";

export interface SosTriggerRequestDto {
  userId: string;
  hotelId: any;
  coords: CoordinatesWithAccuracy;
  message?: string;
}

export interface SosResponseDto {
  id: string;
  userId: string;
  location: ISOS["location"];
  status: string;
  escalationLevel: number;
  createdAt: Date;
  message?: string;
}

export class SOSService {
  private readonly repo = new SOSRepository();

  // ── Trigger SOS Alert ──────────────────────────────────────────────────────

  async triggerSOS(dto: SosTriggerRequestDto): Promise<SosResponseDto> {
    // 1. Build location snapshot
    const hotelZone = await HotelGeoZoneStore.get(dto.hotelId);
    const locationSnapshot = SosGeoHelper.buildSnapshot(dto, hotelZone || undefined);

    // 2. Create SOS record
    const sos = await this.repo.create({
      userId: dto.userId,
      hotelId: dto.hotelId,
      location: {
        type: "Point",
        coordinates: [locationSnapshot.coordinates.lng, locationSnapshot.coordinates.lat]
      },
      status: "OPEN",
      escalationLevel: 0
    });

    // 3. Notify managers (FR22)
    await this.notifyManagers(sos, dto.message);

    return this.mapToResponse(sos);
  }

  // ── Get SOS Alerts ─────────────────────────────────────────────────────────

  async getSOSAlerts(
    hotelId: string,
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SosResponseDto[]> {
    const alerts = await this.repo.findByHotelAndStatus(hotelId, status, limit, offset);
    return alerts.map(this.mapToResponse);
  }

  async getSOSById(id: string): Promise<SosResponseDto | null> {
    const sos = await this.repo.findById(id);
    return sos ? this.mapToResponse(sos) : null;
  }

  // ── Update Status ──────────────────────────────────────────────────────────

  async escalateSOS(id: string, newLevel: number): Promise<SosResponseDto> {
    const sos = await this.repo.findById(id);
    if (!sos) throw SOSErrors.sosNotFound(id);
    if (sos.status === "RESOLVED") throw SOSErrors.alreadyResolved(id);

    const updated = await this.repo.updateStatus(id, "ESCALATED", newLevel);
    if (!updated) throw SOSErrors.sosNotFound(id);

    // Notify higher management
    await this.notifyEscalation(updated);

    return this.mapToResponse(updated);
  }

  async resolveSOS(id: string): Promise<SosResponseDto> {
    const updated = await this.repo.updateStatus(id, "RESOLVED");
    if (!updated) throw SOSErrors.sosNotFound(id);

    return this.mapToResponse(updated);
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  private async notifyManagers(sos: ISOS, message?: string): Promise<void> {
    // TODO: Implement manager notification logic
    // This could involve sending emails, push notifications, etc.
    // For now, we'll use EmailService as a placeholder

    const subject = `SOS Alert Triggered - ${sos.id}`;
    const body = `
      SOS Alert Details:
      - ID: ${sos.id}
      - User: ${sos.userId}
      - Location: ${sos.location.coordinates.join(", ")}
      - Status: ${sos.status}
      - Message: ${message || "No message provided"}
    `;

    // EmailService.sendEmail(to, subject, body); // TODO: Get manager emails
  }

  private async notifyEscalation(sos: ISOS): Promise<void> {
    // TODO: Notify higher management about escalation
  }

  private mapToResponse(sos: ISOS): SosResponseDto {
    return {
      id: sos.id,
      userId: sos.userId,
      location: sos.location,
      status: sos.status,
      escalationLevel: sos.escalationLevel,
      createdAt: sos.createdAt,
    };
  }
}