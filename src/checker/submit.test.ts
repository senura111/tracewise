import { describe, expect, it } from "vitest";
import type { TestCase } from "../content/types";
import type { RunOptions, RunResult, RunStatus } from "../runners/types";
import { submitCode, testNames, type TestRunner } from "./submit";

const TESTS: TestCase[] = [
  { input: "1\n", output: "one\n", visible: true },
  { input: "2\n", output: "two\n", visible: true },
  { input: "3\n", output: "three\n", visible: false },
];

/** Fake runner: maps each stdin to what the "program" prints and how it ends. */
function fakeRunner(behaviour: Record<string, { out?: string; status?: RunStatus }>) {
  const calls: RunOptions[] = [];
  const runner: TestRunner = {
    async run(_code, options) {
      calls.push(options);
      const { out = "", status = "ok" } = behaviour[options.stdin ?? ""] ?? {};
      if (out) options.onOutput?.("stdout", out);
      const result: RunResult = { status, durationMs: 1, restarted: false, timeLimitMs: options.timeLimitMs ?? 0 };
      if (status === "error") {
        result.error = { type: "NameError", message: "name 'x' is not defined", line: 3, traceback: "" };
      }
      if (status === "input-exhausted") result.inputLinesProvided = 1;
      return result;
    },
  };
  return { runner, calls };
}

describe("testNames", () => {
  it("numbers examples and hidden tests separately", () => {
    expect(testNames(TESTS)).toEqual(["Example 1", "Example 2", "Hidden test 1"]);
  });
});

describe("submitCode", () => {
  it("marks every test and reports a solve", async () => {
    const { runner, calls } = fakeRunner({ "1\n": { out: "one\n" }, "2\n": { out: "two\n" }, "3\n": { out: "three" } });
    const report = await submitCode(runner, "code", TESTS);
    expect(report).toMatchObject({ passed: 3, total: 3, solved: true, cancelled: false });
    expect(calls.every((c) => c.mode === "test" && c.timeLimitMs === 2000)).toBe(true);
  });

  it("records wrong output with a comparison", async () => {
    const { runner } = fakeRunner({ "1\n": { out: "one\n" }, "2\n": { out: "Two\n" }, "3\n": { out: "three\n" } });
    const report = await submitCode(runner, "code", TESTS);
    expect(report.passed).toBe(2);
    expect(report.solved).toBe(false);
    const failed = report.reports[1].outcome;
    expect(failed.status).toBe("failed");
    if (failed.status === "failed") expect(failed.comparison.note).toMatch(/capital letters/);
  });

  it("keeps the error for a test that raised one", async () => {
    const { runner } = fakeRunner({ "1\n": { status: "error" } });
    const report = await submitCode(runner, "code", TESTS);
    expect(report.reports[0].outcome).toMatchObject({ status: "error", error: { type: "NameError", line: 3 } });
  });

  it("skips the remaining tests after a timeout", async () => {
    const { runner, calls } = fakeRunner({ "1\n": { out: "one\n" }, "2\n": { status: "timeout" } });
    const report = await submitCode(runner, "code", TESTS);
    expect(calls).toHaveLength(2);
    expect(report.reports.map((r) => r.outcome.status)).toEqual(["passed", "timeout", "not-run"]);
    expect(report.reports[2].outcome).toEqual({ status: "not-run", reason: "timeout" });
  });

  it("reports running out of input", async () => {
    const { runner } = fakeRunner({ "1\n": { status: "input-exhausted" } });
    const report = await submitCode(runner, "code", TESTS);
    expect(report.reports[0].outcome).toEqual({ status: "input-exhausted", linesProvided: 1 });
  });

  it("stops when cancelled, marking the rest as not run", async () => {
    let cancelled = false;
    const { runner, calls } = fakeRunner({ "1\n": { out: "one\n" } });
    const report = await submitCode(runner, "code", TESTS, {
      onProgress: () => {
        cancelled = true;
      },
      isCancelled: () => cancelled,
    });
    expect(calls).toHaveLength(1);
    expect(report.cancelled).toBe(true);
    expect(report.reports.slice(1).map((r) => r.outcome)).toEqual([
      { status: "not-run", reason: "cancelled" },
      { status: "not-run", reason: "cancelled" },
    ]);
  });

  it("treats a Stop during a test as cancelling", async () => {
    const { runner } = fakeRunner({ "1\n": { status: "stopped" } });
    const report = await submitCode(runner, "code", TESTS);
    expect(report.cancelled).toBe(true);
    expect(report.reports.map((r) => r.outcome.status)).toEqual(["not-run", "not-run", "not-run"]);
  });
});
