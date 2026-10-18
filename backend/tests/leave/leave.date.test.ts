import {
  addDays,
  enumerateDays,
  inclusiveDayCount,
  parseDateOnly,
  todayInBusinessTimezone,
  toDateOnlyString,
} from "../../src/modules/leave/leave.date";

describe("leave.date", () => {
  describe("parseDateOnly", () => {
    it("parses YYYY-MM-DD to UTC midnight", () => {
      const d = parseDateOnly("2026-10-18", "fromDate");
      expect(d.toISOString()).toBe("2026-10-18T00:00:00.000Z");
    });

    it("trims surrounding whitespace", () => {
      expect(toDateOnlyString(parseDateOnly("  2026-01-05 ", "x"))).toBe("2026-01-05");
    });

    it.each([
      ["2026/10/18"],
      ["18-10-2026"],
      ["2026-10-18T00:00:00Z"],
      ["2026-1-5"],
      [""],
      ["not-a-date"],
    ])("rejects malformed value %p", (value) => {
      expect(() => parseDateOnly(value, "fromDate")).toThrow(/YYYY-MM-DD/);
    });

    it("rejects impossible calendar dates instead of rolling them over", () => {
      expect(() => parseDateOnly("2026-02-30", "fromDate")).toThrow(/valid date/);
      expect(() => parseDateOnly("2026-13-01", "fromDate")).toThrow(/valid date/);
      expect(() => parseDateOnly("2025-02-29", "fromDate")).toThrow(/valid date/);
    });

    it("accepts a leap day", () => {
      expect(toDateOnlyString(parseDateOnly("2028-02-29", "x"))).toBe("2028-02-29");
    });

    it("rejects non-string input", () => {
      expect(() => parseDateOnly(20261018, "fromDate")).toThrow(/YYYY-MM-DD/);
      expect(() => parseDateOnly(undefined, "fromDate")).toThrow(/YYYY-MM-DD/);
      expect(() => parseDateOnly({ $gt: "" }, "fromDate")).toThrow(/YYYY-MM-DD/);
    });
  });

  describe("day arithmetic", () => {
    it("counts inclusive days", () => {
      const from = parseDateOnly("2026-10-18", "f");
      expect(inclusiveDayCount(from, from)).toBe(1);
      expect(inclusiveDayCount(from, parseDateOnly("2026-10-24", "t"))).toBe(7);
    });

    it("counts correctly across a month and a leap February", () => {
      expect(inclusiveDayCount(parseDateOnly("2028-02-28", "f"), parseDateOnly("2028-03-01", "t"))).toBe(3);
    });

    it("enumerates every day inclusively", () => {
      const days = enumerateDays(parseDateOnly("2026-10-30", "f"), parseDateOnly("2026-11-02", "t"));
      expect(days.map(toDateOnlyString)).toEqual([
        "2026-10-30",
        "2026-10-31",
        "2026-11-01",
        "2026-11-02",
      ]);
    });

    it("returns nothing when the range is inverted", () => {
      expect(enumerateDays(parseDateOnly("2026-10-02", "f"), parseDateOnly("2026-10-01", "t"))).toEqual([]);
    });

    it("addDays moves by whole calendar days", () => {
      expect(toDateOnlyString(addDays(parseDateOnly("2026-12-31", "x"), 1))).toBe("2027-01-01");
    });
  });

  describe("todayInBusinessTimezone (Asia/Kolkata)", () => {
    it("uses the Indian calendar date, not the UTC date", () => {
      // 2026-10-18 20:00 UTC is already 2026-10-19 01:30 in India.
      const now = new Date("2026-10-18T20:00:00.000Z");
      expect(toDateOnlyString(todayInBusinessTimezone(now))).toBe("2026-10-19");
    });

    it("keeps the same date before IST midnight", () => {
      // 2026-10-18 18:00 UTC is 2026-10-18 23:30 in India.
      const now = new Date("2026-10-18T18:00:00.000Z");
      expect(toDateOnlyString(todayInBusinessTimezone(now))).toBe("2026-10-18");
    });

    it("returns UTC midnight so it compares directly with stored dates", () => {
      const today = todayInBusinessTimezone(new Date("2026-10-18T06:00:00.000Z"));
      expect(today.getUTCHours()).toBe(0);
      expect(today.getUTCMinutes()).toBe(0);
    });
  });
});
