/**
 * Runs Python programs in Node through the pyodide npm package, in the same
 * "test mode" the website uses: input() reads from the given stdin, prompts are
 * dropped, and errors are cleaned up the same way.
 */
import { loadPyodide } from "pyodide";
import { BOOTSTRAP, INPUT_EXHAUSTED } from "../src/runners/python/bootstrap.ts";
import { parsePythonTraceback } from "../src/runners/python/errors.ts";
import { splitInputLines } from "../src/runners/python/input.ts";
import type { CodeError } from "../src/runners/types.ts";

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

export type TestRun = (
  | { status: "ok"; output: string }
  | { status: "error"; output: string; error: CodeError }
  | { status: "input-exhausted" | "step-limit"; output: string }
) & {
  /** C++: warnings from a successful compile */
  warnings?: CodeError[];
};

export async function createHarness() {
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
  py.registerJsModule("_tracewise", { read_line: () => inputQueue.shift() ?? INPUT_EXHAUSTED });
  py.runPython(BOOTSTRAP);
  py.runPython(STEP_LIMIT_SETUP);

  return function run(code: string, stdin = ""): TestRun {
    stdout = "";
    inputQueue = splitInputLines(stdin);
    const globals = py.runPython("dict(__name__='__main__')");
    try {
      py.runPython(`_tracewise_limit_steps(${STEP_LIMIT})`);
      py.runPython(code, { globals, filename: "main.py" });
      return { status: "ok", output: stdout };
    } catch (error) {
      const type = (error as { type?: string }).type ?? "Error";
      if (type === "TracewiseNoInput") return { status: "input-exhausted", output: stdout };
      if (type === "TracewiseStepLimit") return { status: "step-limit", output: stdout };
      return { status: "error", output: stdout, error: parsePythonTraceback(String((error as Error).message), type) };
    } finally {
      py.runPython("import sys\nsys.settrace(None)\nsys.stdout.flush()");
      globals.destroy();
    }
  };
}
