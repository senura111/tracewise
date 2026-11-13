/**
 * Web Worker that hosts Pyodide. Runs learner code synchronously; the main
 * thread stops it through the shared interrupt buffer and answers input()
 * through shared memory while this thread waits with Atomics.wait.
 */
import type { OutputStream, RunMode } from "../types";
import { parsePythonTraceback } from "./errors";
import { splitInputLines } from "./input";
import { DEFAULT_OUTPUT_LIMITS, OutputLimiter } from "./outputLimit";
import {
  INPUT_STOP,
  INPUT_WAITING,
  SIGINT,
  type FromWorker,
  type ToWorker,
  type WorkerOutcome,
} from "./protocol";
import { isPythonError, type LoadPyodide, type PyodideInterface } from "./pyodide-types";

// Sentinels returned by read_line(); the Python side turns them into exceptions.
const STOP = "\u0000stop";
const EXHAUSTED = "\u0000exhausted";
const UNAVAILABLE = "\u0000unavailable";

const BOOTSTRAP = String.raw`
import builtins, sys
from _tracewise import read_line as _read_line

class TracewiseNoInput(BaseException):
    """Raised when input() has nothing to read. Not an Exception subclass,
    so a learner's 'except Exception' can't swallow it."""

def _tracewise_input(prompt=""):
    sys.stdout.flush()
    sys.stderr.flush()
    line = _read_line(str(prompt))
    if line.startswith("\0"):
        if line == "\0stop":
            raise KeyboardInterrupt
        raise TracewiseNoInput(line[1:])
    return line

builtins.input = _tracewise_input
`;

const FLUSH_STREAMS = "import sys\nsys.stdout.flush()\nsys.stderr.flush()";
const OUTPUT_FLUSH_MS = 50;

const send = (message: FromWorker) => postMessage(message);

let pyodide: PyodideInterface | null = null;
let interrupt: Uint8Array | null = null;
let inputState: Int32Array | null = null;
let inputData: Uint8Array | null = null;

// State for the run in progress
let runId = 0;
let mode: RunMode = "run";
let inputQueue: string[] = [];
let inputLinesProvided = 0;
let limiter = new OutputLimiter(DEFAULT_OUTPUT_LIMITS);
let pending: { stream: OutputStream; text: string }[] = [];
let lastFlush = 0;
let waitedMs = 0;

// ---- Output --------------------------------------------------------------
// Python runs synchronously here, so timers can't fire mid-run; output is
// flushed from inside the write handler once enough time has passed.

function emit(stream: OutputStream, text: string) {
  if (!text) return;
  const last = pending.at(-1);
  if (last?.stream === stream) last.text += text;
  else pending.push({ stream, text });
  if (performance.now() - lastFlush > OUTPUT_FLUSH_MS) flushOutput();
}

function flushOutput() {
  for (const chunk of pending) send({ type: "output", id: runId, ...chunk });
  pending = [];
  lastFlush = performance.now();
}

function writer(stream: OutputStream) {
  const decoder = new TextDecoder();
  return {
    isatty: true, // line-buffered, so prints appear as they happen
    write(buffer: Uint8Array) {
      emit(stream, limiter.take(decoder.decode(buffer, { stream: true })));
      if (limiter.exceeded && interrupt) interrupt[0] = SIGINT;
      return buffer.length;
    },
  };
}

// ---- Input ---------------------------------------------------------------

function readLine(prompt: string): string {
  if (mode === "test") {
    // Prompts are dropped in test mode so they don't count as output.
    return inputQueue.shift() ?? EXHAUSTED;
  }
  if (!interrupt || !inputState || !inputData) return UNAVAILABLE;

  emit("stdout", limiter.take(prompt));
  flushOutput();

  Atomics.store(inputState, 0, INPUT_WAITING);
  // Stop may have been pressed just before we got here.
  if (interrupt[0] !== 0) return STOP;
  send({ type: "input-request", id: runId, prompt });

  const start = performance.now();
  Atomics.wait(inputState, 0, INPUT_WAITING);
  waitedMs += performance.now() - start;

  if (Atomics.load(inputState, 0) === INPUT_STOP) return STOP;
  const length = Atomics.load(inputState, 1);
  // TextDecoder can't read shared memory directly, so copy first.
  return new TextDecoder().decode(inputData.slice(0, length));
}

// ---- Lifecycle -----------------------------------------------------------

async function init(message: Extract<ToWorker, { type: "init" }>) {
  try {
    const { loadPyodide } = (await import(/* @vite-ignore */ `${message.indexURL}pyodide.mjs`)) as {
      loadPyodide: LoadPyodide;
    };
    const py = await loadPyodide({ indexURL: message.indexURL });

    if (message.interrupt) {
      interrupt = new Uint8Array(message.interrupt);
      interrupt[0] = 0;
      py.setInterruptBuffer(interrupt);
    }
    if (message.inputState && message.inputData) {
      inputState = new Int32Array(message.inputState);
      inputData = new Uint8Array(message.inputData);
    }

    py.setStdout(writer("stdout"));
    py.setStderr(writer("stderr"));
    // For code that reads sys.stdin directly instead of calling input()
    py.setStdin({
      stdin: () => {
        const line = readLine("");
        return line.startsWith("\u0000") ? null : `${line}\n`;
      },
    });
    py.registerJsModule("_tracewise", { read_line: readLine });
    py.runPython(BOOTSTRAP);

    pyodide = py;
    send({ type: "ready", version: String(py.runPython("import sys; sys.version.split()[0]")) });
  } catch (error) {
    send({ type: "load-error", message: error instanceof Error ? error.message : String(error) });
  }
}

function classify(error: unknown): WorkerOutcome {
  if (!isPythonError(error)) {
    return { kind: "crashed", message: error instanceof Error ? error.message : String(error) };
  }
  if (error.type === "KeyboardInterrupt") {
    return limiter.exceeded ? { kind: "output-limit" } : { kind: "interrupted" };
  }
  if (error.type === "TracewiseNoInput") {
    return /unavailable/.test(error.message)
      ? { kind: "input-unavailable" }
      : { kind: "input-exhausted", linesProvided: inputLinesProvided };
  }
  return { kind: "error", error: parsePythonTraceback(error.message, error.type) };
}

function run(message: Extract<ToWorker, { type: "run" }>) {
  const py = pyodide;
  if (!py) {
    send({ type: "done", id: message.id, outcome: { kind: "crashed", message: "Python is not loaded" }, durationMs: 0 });
    return;
  }

  runId = message.id;
  mode = message.mode;
  inputQueue = splitInputLines(message.stdin);
  inputLinesProvided = inputQueue.length;
  limiter = new OutputLimiter(message.limits);
  pending = [];
  lastFlush = performance.now();
  waitedMs = 0;
  if (interrupt) interrupt[0] = 0;

  // Fresh variables every run, so leftovers from an earlier run can't hide bugs.
  const globals = py.runPython("dict(__name__='__main__')") as { destroy(): void };
  const start = performance.now();
  let outcome: WorkerOutcome;
  try {
    py.runPython(message.code, { globals, filename: "main.py" });
    outcome = { kind: "ok" };
  } catch (error) {
    outcome = classify(error);
  } finally {
    if (interrupt) interrupt[0] = 0;
    try {
      py.runPython(FLUSH_STREAMS);
    } catch {
      // Nothing useful to do if flushing fails.
    }
    globals.destroy();
  }
  const durationMs = performance.now() - start - waitedMs;
  flushOutput();
  send({ type: "done", id: message.id, outcome, durationMs });
}

addEventListener("message", (event: MessageEvent<ToWorker>) => {
  const message = event.data;
  if (message.type === "init") void init(message);
  else if (message.type === "run") run(message);
});
