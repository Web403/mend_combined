// ─────────────────────────────────────────────────────────────────────────────
// shared/enums/wellbeing.enum.ts
// ─────────────────────────────────────────────────────────────────────────────

export enum FatigueRisk {
  LOW      = "LOW",      // fatigueScore 0–39
  MODERATE = "MODERATE", // fatigueScore 40–64
  HIGH     = "HIGH",     // fatigueScore 65–84
  CRITICAL = "CRITICAL", // fatigueScore 85–100
}
