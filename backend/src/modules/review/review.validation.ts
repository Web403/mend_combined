import mongoose from "mongoose";
import { ReviewErrors } from "./review.error";
import { REVIEW_RATING_MAX, REVIEW_RATING_MIN } from "./review.model";

/**
 * Pure validation / normalisation helpers for review payloads.
 *
 * Nothing here touches the database, which keeps the rules exhaustively
 * unit-testable and guarantees the same behaviour whether a value arrives from
 * a mobile client, a dashboard or a crafted raw HTTP request.
 */

/** Hard cap on a single review/feedback text field. */
export const MAX_REVIEW_TEXT_LENGTH = 2000;

// Exact integer string only — rejects "4.5", "4abc", "0x4", "1e1", " 4 5 ".
const INTEGER_STRING = /^[+-]?\d+$/;

/**
 * Validates an optional 1–5 integer rating.
 *
 * Accepted: `undefined`, `null`, `""` (field omitted), an in-range integer
 * number, or an exact integer string such as `"4"`.
 * Rejected: NaN, Infinity, floats, out-of-range values, booleans, arrays,
 * objects and strings that merely look numeric.
 */
export function parseOptionalRating(
  value: unknown,
  field: string,
): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  let numeric: number;

  if (typeof value === "number") {
    numeric = value;
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!INTEGER_STRING.test(trimmed)) {
      throw ReviewErrors.validationFailed(
        `${field} must be a whole number between ${REVIEW_RATING_MIN} and ${REVIEW_RATING_MAX}`,
      );
    }
    numeric = Number(trimmed);
  } else {
    // boolean, array, object, …
    throw ReviewErrors.validationFailed(
      `${field} must be a whole number between ${REVIEW_RATING_MIN} and ${REVIEW_RATING_MAX}`,
    );
  }

  if (!Number.isFinite(numeric) || Number.isNaN(numeric)) {
    throw ReviewErrors.validationFailed(`${field} must be a valid number`);
  }

  if (!Number.isInteger(numeric)) {
    throw ReviewErrors.validationFailed(`${field} must be a whole number`);
  }

  if (numeric < REVIEW_RATING_MIN || numeric > REVIEW_RATING_MAX) {
    throw ReviewErrors.validationFailed(
      `${field} must be between ${REVIEW_RATING_MIN} and ${REVIEW_RATING_MAX}`,
    );
  }

  return numeric;
}

/**
 * Removes markup that could execute in a downstream HTML consumer while leaving
 * ordinary prose intact.
 *
 * Only angle-bracket constructs that start with `/` or an ASCII letter are
 * treated as tags, so text such as "rating < 3 and service > expectations"
 * survives. `javascript:` URIs and inline `on*=` handlers are neutralised even
 * when they appear outside a tag.
 */
export function stripUnsafeMarkup(text: string): string {
  return (
    text
      // Drop <script>/<style> blocks together with their body.
      .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, " ")
      // Drop any remaining HTML-ish tag.
      .replace(/<\s*\/?\s*[a-z][^<>]*>/gi, " ")
      // Neutralise event handlers and script URIs left in plain text.
      .replace(/\bon[a-z]+\s*=/gi, " ")
      .replace(/javascript\s*:/gi, " ")
      .replace(/data\s*:\s*text\/html/gi, " ")
  );
}

/**
 * Validates and normalises an optional free-text review field.
 *
 * Trims, normalises line endings, removes control characters (newlines and tabs
 * are preserved so genuine multi-line feedback survives), strips unsafe markup
 * and enforces the length cap. A value that is empty or whitespace-only is
 * treated as "not provided" rather than stored as an empty string.
 */
export function normalizeOptionalText(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw ReviewErrors.validationFailed(`${field} must be a string`);
  }

  const cleaned = stripUnsafeMarkup(
    value
      // Keep \n and \t, drop every other control character (incl. \0, ANSI).
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .replace(/\r\n?/g, "\n"),
  )
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (cleaned.length === 0) {
    return undefined;
  }

  if (cleaned.length > MAX_REVIEW_TEXT_LENGTH) {
    throw ReviewErrors.validationFailed(
      `${field} must be at most ${MAX_REVIEW_TEXT_LENGTH} characters`,
    );
  }

  return cleaned;
}

/**
 * Guards every client-supplied identifier before it reaches a query, so a
 * malformed value produces a clean 400 instead of a leaked driver CastError.
 */
export function assertObjectId(value: string, field: string): string {
  if (!mongoose.isValidObjectId(value)) {
    throw ReviewErrors.invalidId(field);
  }
  return value;
}

/** True when the value is present and a structurally valid ObjectId. */
export function isObjectId(value: unknown): value is string {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}
