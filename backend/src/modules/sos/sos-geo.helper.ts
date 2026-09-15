// ─────────────────────────────────────────────────────────────────────────────
// modules/sos/sos-geo.helper.ts
//
// Geo logic specific to SOS events.
// Called by the SOS service when a staff member triggers an alert.
//
// SRS references:
//   FR20 – Staff shall trigger SOS/Helpdesk in the case of complaints or emergency
//   FR21 – System shall capture live location during SOS
//   FR22 – System shall notify manager instantly
//   FR23 – System shall support escalation chain
// ─────────────────────────────────────────────────────────────────────────────

import { GeoService } from "../../shared/services/geo.service";
import { GEO_DEFAULTS } from "../../shared/constants/geo.constants";
import type {
  Coordinates,
  CoordinatesWithAccuracy,
  HotelGeoZone,
  SosLocationSnapshot,
} from "../../shared/interfaces/geo.interface";

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface SosTriggerGeoPayload {
  userId: string;
  hotelId: string;
  coords: CoordinatesWithAccuracy;
}

// ── Helper ────────────────────────────────────────────────────────────────────

export class SosGeoHelper {
  /**
   * Builds a location snapshot for an SOS event (FR21).
   *
   * Unlike attendance validation, SOS never *blocks* on bad GPS — a staff
   * member in distress should always be able to trigger an alert. Instead,
   * `isFresh` lets the notification service decide whether to show the
   * coordinates to the manager or display a "location unavailable" warning.
   */
  static buildSnapshot(
    payload: SosTriggerGeoPayload,
    hotelZone?: HotelGeoZone,
  ): SosLocationSnapshot {
    const { coords, userId, hotelId } = payload;

    const sanitised = GeoService.sanitiseCoordinates(coords);
    const capturedAt = coords.capturedAt ?? Date.now();
    const isFresh = GeoService.isSosLocationFresh(capturedAt);

    // Best-effort distance from hotel centre (useful for manager dispatch)
    let distanceFromHotel: number | undefined;
    if (sanitised && hotelZone) {
      distanceFromHotel = GeoService.distance(sanitised, hotelZone.centre).metres;
    }

    return {
      userId,
      hotelId,
      coordinates: sanitised
        ? { ...sanitised, accuracy: coords.accuracy, capturedAt }
        : { lat: 0, lng: 0, accuracy: undefined, capturedAt },
      isFresh,
      distanceFromHotel,
      recordedAt: new Date().toISOString(),
    };
  }

  /**
   * Formats an SOS snapshot for the manager push notification payload (FR22).
   * Returns a compact object — the notification service handles the actual send.
   */
  static formatForAlert(snapshot: SosLocationSnapshot): {
    locationText: string;
    mapsLink: string | null;
    distanceText: string | null;
    isFresh: boolean;
  } {
    const { coordinates, isFresh, distanceFromHotel } = snapshot;

    const hasCoords = coordinates.lat !== 0 || coordinates.lng !== 0;

    return {
      locationText: hasCoords && isFresh
        ? GeoService.formatCoords(coordinates)
        : "Location unavailable",

      // Deep-link to Google Maps for the manager
      mapsLink: hasCoords && isFresh
        ? `https://maps.google.com/?q=${coordinates.lat},${coordinates.lng}`
        : null,

      distanceText: distanceFromHotel != null
        ? GeoService.distance(coordinates, coordinates).display // pre-computed
        : null,

      isFresh,
    };
  }

  /**
   * Determines whether a follow-up location poll is needed (FR21 live tracking).
   * The SOS service calls this on each poll tick to decide whether to re-snapshot.
   */
  static shouldPoll(lastSnapshot: SosLocationSnapshot): boolean {
    const lastCaptured = lastSnapshot.coordinates.capturedAt ?? 0;
    return Date.now() - lastCaptured >= GEO_DEFAULTS.SOS_LOCATION_POLL_INTERVAL_MS;
  }
}