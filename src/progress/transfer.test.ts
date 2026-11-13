import { describe, expect, it } from "vitest";
import type { ProgressData } from "./store";
import { exportFileName, exportProgress, readImport } from "./transfer";

const data: ProgressData = {
  version: 1,
  challenges: {
    a: { python: { attempts: 1, hintsShown: 0, walkthroughShown: false, solvedAt: "2026-11-14T10:00:00.000Z" } },
    b: { python: { attempts: 0, hintsShown: 1, walkthroughShown: false, code: "x = 1" } },
  },
  activity: ["2026-11-14"],
};

describe("export and import", () => {
  it("round-trips through the exported file", () => {
    const text = exportProgress(data, new Date(2026, 10, 14));
    const result = readImport(text);
    expect(result).toEqual({ ok: true, data, summary: { solved: 1, withCode: 1 } });
  });

  it("names the file after today's date", () => {
    expect(exportFileName(new Date(2026, 10, 14, 23, 0))).toBe("tracewise-progress-2026-11-14.json");
  });

  it("refuses files that aren't JSON", () => {
    expect(readImport("hello")).toMatchObject({ ok: false, error: expect.stringMatching(/valid JSON/) });
  });

  it("refuses other JSON", () => {
    expect(readImport('{"name": "something else"}')).toMatchObject({ ok: false, error: expect.stringMatching(/doesn't look like/) });
  });

  it("explains files from a newer version", () => {
    expect(readImport('{"version": 2, "challenges": {}}')).toMatchObject({ ok: false, error: expect.stringMatching(/newer version/) });
  });
});
