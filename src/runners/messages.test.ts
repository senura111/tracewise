import { describe, expect, it } from "vitest";
import { describeResult, formatDuration } from "./messages";
import type { RunResult } from "./types";

const base: RunResult = { status: "ok", durationMs: 42, restarted: false, timeLimitMs: 5000 };

describe("formatDuration", () => {
  it("shows two decimals under a second and one above", () => {
    expect(formatDuration(42)).toBe("0.04 s");
    expect(formatDuration(1530)).toBe("1.5 s");
  });
});

describe("describeResult", () => {
  it("reports success with the running time", () => {
    expect(describeResult(base)).toEqual({ tone: "ok", text: "Finished in 0.04 s." });
  });

  it("names the error and its line, with the right article", () => {
    const result: RunResult = {
      ...base,
      status: "error",
      error: { type: "IndexError", message: "list index out of range", line: 4, traceback: "" },
    };
    expect(describeResult(result).text).toBe("Stopped with an IndexError on line 4.");
  });

  it("explains a timeout in terms of loops", () => {
    const text = describeResult({ ...base, status: "timeout" }).text;
    expect(text).toMatch(/^Stopped after 5 seconds/);
    expect(text).toMatch(/loop/);
  });

  it("explains running out of test input", () => {
    const text = describeResult({ ...base, status: "input-exhausted", inputLinesProvided: 1 }).text;
    expect(text).toContain("(1 line)");
    expect(text).toContain("input()");
  });

  it("mentions a restart when one happened", () => {
    expect(describeResult({ ...base, status: "stopped", restarted: true }).text).toMatch(/restart/);
  });
});
