// ─────────────────────────────────────────────────────────────────────────────
// shared/stores/hotel-geo-zone.store.ts
//
// Single source of truth for looking up a hotel's HotelGeoZone at runtime.
//
// Architecture note:
//   This is intentionally a thin facade.  The actual data lives in the Hotel
//   collection (managed by hotel/hotel-geo.helper.ts).  The store caches zones
//   in memory with a short TTL so repeated clock-in calls in the same minute
//   don't hammer the DB, while still picking up admin changes quickly.
// ─────────────────────────────────────────────────────────────────────────────

import type { HotelGeoZone } from "../interfaces/geo.interface";
import { HotelModel } from "../../modules/hotel/hotel.model";
import mongoose from "mongoose";

// ── Simple TTL cache ──────────────────────────────────────────────────────────

interface CacheEntry {
  zone: HotelGeoZone;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 1 minute
const cache = new Map<string, CacheEntry>();

// ── Replace this loader with your actual Hotel DB query ──────────────────────

async function loadFromDb(hotelId: mongoose.Types.ObjectId): Promise<HotelGeoZone | null> {
  // Example (swap for your real Hotel model):
  //
    const hotel = await HotelModel.findById(hotelId).lean();

    if (hotel && hotel.location?.codePointAttr) {
      const { lat, lng } = hotel.location?.codePointAttr;
      return {
        hotelId,
        centre: { lat, lng },
        attendanceRadius: hotel.location?.pincode ? 500 : 100, // custom radius or default
      };
    }

    return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export const HotelGeoZoneStore = {
  async get(hotelId: mongoose.Types.ObjectId): Promise<HotelGeoZone | null> {
    const cached = cache.get(hotelId.toString());
    if (cached && cached.expiresAt > Date.now()) {
      return cached.zone;
    }

    const zone = await loadFromDb(hotelId);
    if (zone) {
      cache.set((hotelId.toString()), { zone, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return zone;
  },

  /** Call after an admin updates a hotel's geo zone so the cache is busted. */
  invalidate(hotelId: mongoose.Types.ObjectId): void {
    cache.delete(hotelId.toString());
  },

  /** Exposed for tests — clears the entire cache. */
  _clearAll(): void {
    cache.clear();
  },
};