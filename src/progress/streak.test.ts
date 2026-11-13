import { describe, expect, it } from "vitest";
import { bestStreak, currentStreak, logbookWeeks } from "./streak";

const today = new Date(2026, 10, 14, 10, 0); // Saturday 14 Nov 2026

describe("currentStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(currentStreak(["2026-11-12", "2026-11-13", "2026-11-14"], today)).toBe(3);
  });

  it("still counts a streak that reached yesterday", () => {
    expect(currentStreak(["2026-11-12", "2026-11-13"], today)).toBe(2);
  });

  it("is zero once a whole day was missed", () => {
    expect(currentStreak(["2026-11-11", "2026-11-12"], today)).toBe(0);
    expect(currentStreak([], today)).toBe(0);
  });

  it("crosses month boundaries", () => {
    expect(currentStreak(["2026-10-31", "2026-11-01"], new Date(2026, 10, 1))).toBe(2);
  });
});

describe("bestStreak", () => {
  it("finds the longest run anywhere", () => {
    expect(bestStreak(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-10", "2026-11-11"])).toBe(3);
    expect(bestStreak([])).toBe(0);
  });

  it("handles a run across the end of February", () => {
    expect(bestStreak(["2027-02-27", "2027-02-28", "2027-03-01"])).toBe(3);
  });
});

describe("logbookWeeks", () => {
  it("gives full Monday-to-Sunday weeks ending this week", () => {
    const weeks = logbookWeeks(["2026-11-09", "2026-11-14"], today, 2);
    expect(weeks).toHaveLength(2);
    expect(weeks[0][0].date).toBe("2026-11-02"); // Monday
    expect(weeks[1][6].date).toBe("2026-11-15"); // Sunday
    expect(weeks[1][0]).toMatchObject({ date: "2026-11-09", active: true });
    expect(weeks[1][5]).toMatchObject({ date: "2026-11-14", active: true, isToday: true, isFuture: false });
    expect(weeks[1][6].isFuture).toBe(true);
  });
});
