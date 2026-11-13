/**
 * Marks a program against a challenge's tests: runs each test in test mode,
 * compares the output, and reports per-test outcomes.
 */
import type { TestCase } from "../content/types";
import type { CodeError, RunOptions, RunResult } from "../runners/types";
import { splitInputLines } from "../runners/python/input";
import { compareOutput, type Comparison } from "./compare";

export const TEST_TIME_LIMIT_MS = 2000;

export type TestOutcome =
  | { status: "passed" }
  | { status: "failed"; comparison: Comparison }
  | { status: "error"; error: CodeError }
  | { status: "timeout" }
  | { status: "input-exhausted"; linesProvided: number }
  | { status: "output-limit" }
  | { status: "crashed" }
  | { status: "not-run"; reason: SkipReason };

/** Why the remaining tests weren't run. */
export type SkipReason = "timeout" | "cancelled" | "compile-error";

export interface TestReport {
  name: string;
  test: TestCase;
  outcome: TestOutcome;
  /** What the program printed to stdout */
  output: string;
}

export interface SubmissionReport {
  reports: TestReport[];
  passed: number;
  total: number;
  solved: boolean;
  cancelled: boolean;
}

/** The part of a Runner that marking needs (makes it easy to fake in tests). */
export interface TestRunner {
  run(code: string, options: RunOptions): Promise<RunResult>;
}

/** "Example 1", "Example 2", "Hidden test 1", ... in test order. */
export function testNames(tests: TestCase[]): string[] {
  let example = 0;
  let hidden = 0;
  return tests.map((t) => (t.visible ? `Example ${++example}` : `Hidden test ${++hidden}`));
}

export interface SubmitOptions {
  /** Called after each test with the reports so far */
  onProgress?: (reports: TestReport[]) => void;
  /** Checked between tests; true stops marking */
  isCancelled?: () => boolean;
  timeLimitMs?: number;
}

export async function submitCode(
  runner: TestRunner,
  code: string,
  tests: TestCase[],
  { onProgress, isCancelled = () => false, timeLimitMs = TEST_TIME_LIMIT_MS }: SubmitOptions = {},
): Promise<SubmissionReport> {
  const names = testNames(tests);
  const reports: TestReport[] = [];
  let skipReason: SkipReason | null = null;

  for (const [i, test] of tests.entries()) {
    if (!skipReason && isCancelled()) skipReason = "cancelled";
    if (skipReason) {
      reports.push({ name: names[i], test, outcome: { status: "not-run", reason: skipReason }, output: "" });
      continue;
    }

    let output = "";
    const result = await runner.run(code, {
      mode: "test",
      stdin: test.input,
      timeLimitMs,
      onOutput: (stream, text) => {
        if (stream === "stdout") output += text;
      },
    });

    const outcome = toOutcome(result, test, output);
    if (outcome.status === "not-run") skipReason = outcome.reason;
    // A program that never finishes would make every later test wait too.
    if (outcome.status === "timeout") skipReason = "timeout";
    // Code that doesn't compile fails every test the same way.
    if (outcome.status === "error" && outcome.error.type === "CompileError") skipReason = "compile-error";
    reports.push({ name: names[i], test, outcome, output });
    onProgress?.([...reports]);
  }

  const passed = reports.filter((r) => r.outcome.status === "passed").length;
  return {
    reports,
    passed,
    total: tests.length,
    solved: passed === tests.length,
    cancelled: skipReason === "cancelled",
  };
}

function toOutcome(result: RunResult, test: TestCase, output: string): TestOutcome {
  switch (result.status) {
    case "ok": {
      const comparison = compareOutput(test.output, output);
      if (comparison.passed) return { status: "passed" };
      // C++ doesn't stop when input runs out; the variable just keeps its old value.
      if (result.hitEndOfInput && !comparison.note) {
        const lines = splitInputLines(test.input).length;
        comparison.note =
          `Your program tried to read more input than this test gives (${lines} line${lines === 1 ? "" : "s"}). ` +
          "In C++ the extra reads silently fail and leave their variables unchanged, which can give odd results. " +
          "Read exactly the input the task describes.";
      }
      return { status: "failed", comparison };
    }
    case "error":
      return result.error ? { status: "error", error: result.error } : { status: "crashed" };
    case "timeout":
      return { status: "timeout" };
    case "stopped":
      return { status: "not-run", reason: "cancelled" };
    case "output-limit":
      return { status: "output-limit" };
    case "input-exhausted":
      return { status: "input-exhausted", linesProvided: result.inputLinesProvided ?? 0 };
    case "input-unavailable":
    case "crashed":
      return { status: "crashed" };
  }
}
