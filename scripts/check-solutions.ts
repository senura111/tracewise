/**
 * Checks every challenge's content using real Python (Pyodide in Node):
 *   - each reference solution passes all of its tests
 *   - each starter does NOT already pass all of its tests
 *
 * Uses the same input() rules and output comparison as the website.
 * Run with: npm run check:solutions
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPyodide } from "pyodide";
import { compareOutput } from "../src/checker/compare.ts";
import { testNames } from "../src/checker/submit.ts";
import type { Challenge, Language } from "../src/content/types.ts";
import { BOOTSTRAP, INPUT_EXHAUSTED } from "../src/runners/python/bootstrap.ts";
import { splitInputLines } from "../src/runners/python/input.ts";
import { loadAllChallenges } from "../vite-plugin-challenges.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Node has no Stop button: a Python-level step budget catches runaway loops instead.
const STEP_LIMIT = 5_000_000;
const STEP_LIMIT_SETUP = String.raw`
import sys

class TracewiseStepLimit(BaseException):
    pass

def _tracewise_limit_steps(limit):
    count = 0
    def tracer(frame, event, arg):
        nonlocal count
        count += 1
        if count > limit:
            raise TracewiseStepLimit()
        return tracer
    sys.settrace(tracer)
`;

type TestRun =
  | { status: "ok"; output: string }
  | { status: "error"; output: string; message: string }
  | { status: "input-exhausted" | "step-limit"; output: string };

const py = await loadPyodide();
const decoder = new TextDecoder();
let stdout = "";
let inputQueue: string[] = [];

py.setStdout({
  isatty: true,
  write: (buffer: Uint8Array) => {
    stdout += decoder.decode(buffer, { stream: true });
    return buffer.length;
  },
});
py.setStderr({ isatty: true, write: (buffer: Uint8Array) => buffer.length });
// Test mode: prompts are dropped and input comes from the test.
py.registerJsModule("_tracewise", { read_line: () => inputQueue.shift() ?? INPUT_EXHAUSTED });
py.runPython(BOOTSTRAP);
py.runPython(STEP_LIMIT_SETUP);

function runTest(code: string, stdin: string): TestRun {
  stdout = "";
  inputQueue = splitInputLines(stdin);
  const globals = py.runPython("dict(__name__='__main__')");
  try {
    py.runPython(`_tracewise_limit_steps(${STEP_LIMIT})`);
    py.runPython(code, { globals, filename: "main.py" });
    return { status: "ok", output: stdout };
  } catch (error) {
    const type = (error as { type?: string }).type;
    if (type === "TracewiseNoInput") return { status: "input-exhausted", output: stdout };
    if (type === "TracewiseStepLimit") return { status: "step-limit", output: stdout };
    const lastLine = String((error as Error).message).trimEnd().split("\n").at(-1) ?? "";
    return { status: "error", output: stdout, message: lastLine };
  } finally {
    py.runPython("import sys\nsys.settrace(None)\nsys.stdout.flush()");
    globals.destroy();
  }
}

/** Returns a description of each failing test (empty if all pass). */
function failures(code: string, challenge: Challenge): string[] {
  const names = testNames(challenge.tests);
  return challenge.tests.flatMap((test, i) => {
    const run = runTest(code, test.input);
    if (run.status === "error") return [`${names[i]}: ${run.message}`];
    if (run.status === "input-exhausted") return [`${names[i]}: asked for more input than the test gives`];
    if (run.status === "step-limit") return [`${names[i]}: didn't finish (possible infinite loop)`];
    const comparison = compareOutput(test.output, run.output);
    if (comparison.passed) return [];
    const line = comparison.firstDifference ?? 0;
    return [
      `${names[i]}: line ${line + 1}: expected ${JSON.stringify(comparison.expected[line] ?? "(nothing)")}, ` +
        `got ${JSON.stringify(comparison.actual[line] ?? "(nothing)")}`,
    ];
  });
}

const challenges = await loadAllChallenges(path.join(ROOT, "challenges"));
const languages: Language[] = ["python"];
const problems: string[] = [];

for (const challenge of challenges) {
  for (const language of languages) {
    const variant = challenge.variants[language];
    if (!variant) continue;

    const solutionFailures = failures(variant.solution, challenge);
    const starterPasses = failures(variant.starter, challenge).length === 0;
    const ok = solutionFailures.length === 0 && !starterPasses;

    console.log(`${ok ? "✓" : "✗"} ${challenge.id} (${language}): ${challenge.tests.length} tests`);
    for (const failure of solutionFailures) {
      console.log(`    solution fails ${failure}`);
      problems.push(`${challenge.id}/${language}`);
    }
    if (starterPasses) {
      console.log("    starter code already passes every test");
      problems.push(`${challenge.id}/${language}`);
    }
  }
}

if (problems.length > 0) {
  console.error(`\n${new Set(problems).size} challenge(s) need attention.`);
  process.exit(1);
}
console.log(`\nAll ${challenges.length} challenges OK.`);
