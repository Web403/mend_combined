// ─────────────────────────────────────────────────────────────────────────────
// core/utils/resolve-hotel-id.ts
// Shared hotelId resolution logic for controllers.
//
// Rules:
//  - MENDADMIN (req.admin with MENDADMIN role) → global scope (undefined),
//    or a specific hotelId if the caller passes one via body / query.
//  - Hotel user (req.user) → hotelId is mandatory; resolved from
//    req.hotelId (set by tenantMiddleware) or req.user.hotelId (JWT claim).
//    Returns null when neither source provides a value — caller should 400.
// ─────────────────────────────────────────────────────────────────────────────

import { Request } from 'express';
import { AdminRole } from '../../shared/enums/admin';
import { getString } from './string.helper';

type ResolvedHotelId = string | undefined | null;
// undefined → MENDADMIN global scope (no filter)
// string    → scoped to this hotel
// null      → hotel user but hotelId missing → caller must return 400

export function resolveHotelId(req: Request, override?: string): ResolvedHotelId {
  const r = req as any;
  const isMendAdmin = r.admin?.roles?.includes(AdminRole.MENDADMIN);

  if (isMendAdmin) {
    // MENDADMIN can optionally target a specific hotel via body / query override
    return override || undefined;
  }

  // Hotel user — hotelId is required
  const hotelId = r.hotelId ?? r.user?.hotelId;
  return hotelId || null;
}

export function resolveLmsHotelId(req: Request): string {
  const r = req as any;

  const queryHotelId = getString(r.query?.hotelId ?? r.query?.['x-hotel-id']);
  if (queryHotelId) return queryHotelId;

  const userHotelId = getString(r.user?.hotelId);
  if (userHotelId) return userHotelId;

  const userId = getString(r.user?.id ?? r.user?._id);
  if (userId) return userId;

  return '';
}
