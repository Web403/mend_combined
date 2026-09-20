/**
 * Unit tests — rating and comment validation (§20, §21).
 *
 * Nothing here touches a database: these are the pure rules that guard every
 * review payload, whatever client produced it.
 */

import {
  MAX_REVIEW_TEXT_LENGTH,
  assertObjectId,
  normalizeOptionalText,
  parseOptionalRating,
  stripUnsafeMarkup,
} from "../../src/modules/review/review.validation";
import { ReviewError } from "../../src/modules/review/review.error";

const codeOf = (fn: () => unknown): string => {
  try {
    fn();
  } catch (error) {
    return (error as ReviewError).code;
  }
  return "<no error>";
};

describe("parseOptionalRating", () => {
  it("accepts integers inside the existing 1–5 convention", () => {
    expect(parseOptionalRating(1, "rating")).toBe(1);
    expect(parseOptionalRating(5, "rating")).toBe(5);
    expect(parseOptionalRating(3, "rating")).toBe(3);
  });

  it("accepts exact integer strings (form encoded clients)", () => {
    expect(parseOptionalRating("4", "rating")).toBe(4);
    expect(parseOptionalRating(" 5 ", "rating")).toBe(5);
  });

  it("treats an omitted rating as absent, not as zero", () => {
    expect(parseOptionalRating(undefined, "rating")).toBeUndefined();
    expect(parseOptionalRating(null, "rating")).toBeUndefined();
    expect(parseOptionalRating("", "rating")).toBeUndefined();
  });

  it.each([
    ["out of range high", 6],
    ["out of range low", 0],
    ["negative", -3],
    ["decimal", 4.5],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("rejects a numeric %s", (_label, value) => {
    expect(() => parseOptionalRating(value, "rating")).toThrow(ReviewError);
    expect(codeOf(() => parseOptionalRating(value, "rating"))).toBe(
      "REVIEW_VALIDATION_FAILED",
    );
  });

  it.each([
    ["decimal string", "4.5"],
    ["trailing text", "4stars"],
    ["leading text", "stars4"],
    ["hex", "0x4"],
    ["exponent", "1e1"],
    ["word", "excellent"],
    ["spaced digits", "4 5"],
  ])("rejects a string pretending to be a number (%s)", (_label, value) => {
    expect(() => parseOptionalRating(value, "rating")).toThrow(ReviewError);
  });

  it.each([
    ["boolean", true],
    ["array", [4]],
    ["object", { value: 4 }],
  ])("rejects a non-numeric %s", (_label, value) => {
    expect(() => parseOptionalRating(value, "rating")).toThrow(ReviewError);
  });

  it("names the offending field in the message", () => {
    expect(() => parseOptionalRating(9, "feedbackRating")).toThrow(
      /feedbackRating/,
    );
  });
});

describe("normalizeOptionalText", () => {
  it("preserves legitimate prose, punctuation and unicode", () => {
    const text =
      "Great hotel — the F&B team was supportive 👍 and I'd return. Rating 4 < 5.";
    expect(normalizeOptionalText(text, "review")).toBe(text);
  });

  it("preserves multi-line feedback", () => {
    const text = "Shift was smooth.\nBreaks were honoured.\n\tWould return.";
    expect(normalizeOptionalText(text, "review")).toBe(text);
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeOptionalText("   solid team   ", "review")).toBe("solid team");
  });

  it("treats empty and whitespace-only input as absent", () => {
    expect(normalizeOptionalText("", "review")).toBeUndefined();
    expect(normalizeOptionalText("    ", "review")).toBeUndefined();
    expect(normalizeOptionalText("\n\t  ", "review")).toBeUndefined();
  });

  it("rejects a review longer than the cap instead of truncating it", () => {
    const tooLong = "a".repeat(MAX_REVIEW_TEXT_LENGTH + 1);
    expect(() => normalizeOptionalText(tooLong, "review")).toThrow(
      new RegExp(`at most ${MAX_REVIEW_TEXT_LENGTH}`),
    );
  });

  it("rejects non-string input", () => {
    expect(() => normalizeOptionalText({ $gt: "" }, "review")).toThrow(ReviewError);
    expect(() => normalizeOptionalText(42, "review")).toThrow(ReviewError);
  });

  it("removes control characters but keeps newlines and tabs", () => {
    expect(normalizeOptionalText("bad\u0000text\u001b[31m\nsecond", "review")).toBe(
      "badtext[31m\nsecond",
    );
  });
});

describe("stripUnsafeMarkup (stored XSS prevention)", () => {
  it("removes script blocks together with their body", () => {
    expect(normalizeOptionalText("<script>alert('x')</script>hi", "review")).toBe(
      "hi",
    );
  });

  it("removes event-handler attributes and javascript: URIs", () => {
    const cleaned = normalizeOptionalText(
      'Great stay <img src=x onerror=alert(1)> see javascript:alert(2)',
      "review",
    )!;
    expect(cleaned).not.toMatch(/onerror\s*=/i);
    expect(cleaned).not.toMatch(/javascript\s*:/i);
    expect(cleaned).toMatch(/Great stay/);
  });

  it("removes ordinary HTML tags (trimming is normalizeOptionalText's job)", () => {
    expect(stripUnsafeMarkup("<b>bold</b> and <a href='x'>link</a>")).toBe(
      " bold  and  link ",
    );
    expect(normalizeOptionalText("<b>bold</b> text", "review")).toBe("bold text");
  });

  it("does not strip legitimate comparison text", () => {
    expect(stripUnsafeMarkup("rating < 3 and service > expectations")).toBe(
      "rating < 3 and service > expectations",
    );
  });
});

describe("assertObjectId", () => {
  it("accepts a valid ObjectId string", () => {
    const id = "507f1f77bcf86cd799439011";
    expect(assertObjectId(id, "hotelId")).toBe(id);
  });

  it.each([
    ["empty", ""],
    ["random text", "not-an-id"],
    ["object injection", '{"$gt":""}'],
  ])("rejects %s with a 400 rather than leaking a driver error", (_l, value) => {
    expect(() => assertObjectId(value, "hotelId")).toThrow(ReviewError);
    expect((() => {
      try {
        assertObjectId(value, "hotelId");
      } catch (error) {
        return (error as ReviewError).httpStatus;
      }
      return 0;
    })()).toBe(400);
  });
});
