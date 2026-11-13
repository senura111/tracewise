/**
 * Main-thread side of the Python runtime: owns the worker, enforces the time
 * limit, answers input() requests and stops programs.
 *
 * Stopping: first ask nicely through the shared interrupt buffer (raises
 * KeyboardInterrupt and keeps Python loaded). If the program hasn't stopped
 * within HARD_STOP_DELAY_MS (e.g. stuck inside a long C-level call), kill the
 * worker and load a fresh one.
 */
import type { OutputStream, RunOptions, RunResult, RunStatus, Runner, RuntimeState } from "../types";
import { DEFAULT_OUTPUT_LIMITS } from "./outputLimit";
import {
  INPUT_BUFFER_BYTES,
  INPUT_READY,
  INPUT_STOP,
  SIGINT,
  type FromWorker,
  type ToWorker,
  type WorkerOutcome,
} from "./protocol";

export const PYODIDE_VERSION = "314.0.7";
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
export const DEFAULT_TIME_LIMIT_MS = 5000;
const HARD_STOP_DELAY_MS = 1000;

interface ActiveRun {
  id: number;
  options: RunOptions;
  timeLimitMs: number;
  resolve: (result: RunResult) => void;
  stopReason: "user" | "timeout" | null;
  waitingForInput: boolean;
  /** Time-limit budget left; the clock pauses while waiting for input. */
  budgetMs: number;
  clockStartedAt: number;
  clock?: ReturnType<typeof setTimeout>;
  hardStop?: ReturnType<typeof setTimeout>;
  startedAt: number;
}

export class PythonRunner implements Runner {
  private worker: Worker | null = null;
  private state: RuntimeState = { status: "idle" };
  private listeners = new Set<() => void>();
  private loading: Promise<void> | null = null;
  private pendingLoad: { resolve: () => void; reject: (error: Error) => void } | null = null;
  private active: ActiveRun | null = null;
  private nextId = 1;

  // Shared memory exists only when the page is cross-origin isolated.
  private readonly interrupt: Uint8Array | null;
  private readonly inputState: Int32Array | null;
  private readonly inputData: Uint8Array | null;

  constructor() {
    const shared = typeof SharedArrayBuffer !== "undefined" && globalThis.crossOriginIsolated === true;
    this.interrupt = shared ? new Uint8Array(new SharedArrayBuffer(1)) : null;
    this.inputState = shared ? new Int32Array(new SharedArrayBuffer(8)) : null;
    this.inputData = shared ? new Uint8Array(new SharedArrayBuffer(INPUT_BUFFER_BYTES)) : null;
  }

  // ---- State for React (useSyncExternalStore) --------------------------------

  getState = (): RuntimeState => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private setState(state: RuntimeState) {
    this.state = state;
    for (const listener of this.listeners) listener();
  }

  // ---- Loading ---------------------------------------------------------------

  load(): Promise<void> {
    if (this.loading) return this.loading;
    this.setState({ status: "loading" });

    // A hard stop leaves the interrupt flag set; clear it so the new worker
    // doesn't hit a KeyboardInterrupt while it's still starting up.
    if (this.interrupt) this.interrupt[0] = 0;
    if (this.inputState) Atomics.store(this.inputState, 0, 0);

    this.loading = new Promise<void>((resolve, reject) => {
      this.pendingLoad = { resolve, reject };
      const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
      this.worker = worker;
      worker.addEventListener("message", (event: MessageEvent<FromWorker>) => this.onMessage(worker, event.data));
      worker.addEventListener("error", (event) => this.onWorkerError(worker, event.message));
      this.post({
        type: "init",
        indexURL: INDEX_URL,
        interrupt: (this.interrupt?.buffer as SharedArrayBuffer | undefined) ?? null,
        inputState: (this.inputState?.buffer as SharedArrayBuffer | undefined) ?? null,
        inputData: (this.inputData?.buffer as SharedArrayBuffer | undefined) ?? null,
      });
    });
    // Let a failed load be retried.
    this.loading.catch(() => {
      this.loading = null;
    });
    return this.loading;
  }

  private post(message: ToWorker) {
    this.worker?.postMessage(message);
  }

  private failLoad(message: string) {
    this.worker?.terminate();
    this.worker = null;
    this.setState({ status: "failed", error: message });
    this.pendingLoad?.reject(new Error(message));
    this.pendingLoad = null;
  }

  // ---- Running ---------------------------------------------------------------

  async run(code: string, options: RunOptions): Promise<RunResult> {
    if (this.active) throw new Error("A program is already running.");
    await this.load();

    return new Promise<RunResult>((resolve) => {
      const timeLimitMs = options.timeLimitMs ?? DEFAULT_TIME_LIMIT_MS;
      const run: ActiveRun = {
        id: this.nextId++,
        options,
        timeLimitMs,
        resolve,
        stopReason: null,
        waitingForInput: false,
        budgetMs: timeLimitMs,
        clockStartedAt: 0,
        startedAt: performance.now(),
      };
      this.active = run;
      if (this.interrupt) this.interrupt[0] = 0;
      this.post({
        type: "run",
        id: run.id,
        code,
        mode: options.mode,
        stdin: options.stdin ?? "",
        limits: DEFAULT_OUTPUT_LIMITS,
      });
      this.startClock(run);
    });
  }

  provideInput(line: string) {
    const run = this.active;
    if (!run?.waitingForInput || !this.inputState || !this.inputData) return;
    const bytes = new TextEncoder().encode(line).subarray(0, this.inputData.length);
    this.inputData.set(bytes);
    Atomics.store(this.inputState, 1, bytes.length);
    Atomics.store(this.inputState, 0, INPUT_READY);
    Atomics.notify(this.inputState, 0);
    run.waitingForInput = false;
    this.startClock(run);
  }

  stop() {
    this.requestStop("user");
  }

  private startClock(run: ActiveRun) {
    run.clockStartedAt = performance.now();
    run.clock = setTimeout(() => this.requestStop("timeout"), Math.max(run.budgetMs, 0));
  }

  private pauseClock(run: ActiveRun) {
    clearTimeout(run.clock);
    run.budgetMs -= performance.now() - run.clockStartedAt;
  }

  private requestStop(reason: "user" | "timeout") {
    const run = this.active;
    if (!run || run.stopReason) return;
    run.stopReason = reason;
    clearTimeout(run.clock);

    if (!this.interrupt) {
      this.hardStop(run);
      return;
    }
    this.interrupt[0] = SIGINT;
    if (this.inputState) {
      // Wake the worker if it's waiting for input.
      Atomics.store(this.inputState, 0, INPUT_STOP);
      Atomics.notify(this.inputState, 0);
    }
    run.hardStop = setTimeout(() => this.hardStop(run), HARD_STOP_DELAY_MS);
  }

  /** Kills the worker, settles the run, and starts loading a fresh worker. */
  private hardStop(run: ActiveRun, status?: RunStatus) {
    if (this.active !== run) return;
    this.restartWorker();
    this.finish(run, {
      status: status ?? (run.stopReason === "timeout" ? "timeout" : "stopped"),
      durationMs: performance.now() - run.startedAt,
      restarted: true,
    });
  }

  private restartWorker() {
    this.worker?.terminate();
    this.worker = null;
    this.loading = null;
    this.pendingLoad = null;
    void this.load().catch(() => {});
  }

  private finish(run: ActiveRun, result: Omit<RunResult, "timeLimitMs">) {
    clearTimeout(run.clock);
    clearTimeout(run.hardStop);
    if (this.active === run) this.active = null;
    run.resolve({ ...result, timeLimitMs: run.timeLimitMs });
  }

  // ---- Worker messages -----------------------------------------------------------

  private onMessage(worker: Worker, message: FromWorker) {
    if (worker !== this.worker) return; // a terminated worker's late message

    switch (message.type) {
      case "ready":
        this.setState({ status: "ready", version: message.version });
        this.pendingLoad?.resolve();
        this.pendingLoad = null;
        return;
      case "load-error":
        this.failLoad(message.message);
        return;
    }

    const run = this.active;
    if (!run || run.id !== message.id) return;

    switch (message.type) {
      case "output":
        run.options.onOutput?.(message.stream as OutputStream, message.text);
        break;
      case "input-request":
        if (run.stopReason) break;
        this.pauseClock(run);
        run.waitingForInput = true;
        run.options.onInputRequest?.(message.prompt);
        break;
      case "done":
        this.finish(run, { ...toResult(message.outcome, run), durationMs: message.durationMs, restarted: false });
        break;
    }
  }

  private onWorkerError(worker: Worker, message: string) {
    if (worker !== this.worker) return;
    if (this.pendingLoad) {
      this.failLoad(message || "The Python worker failed to start.");
      return;
    }
    const run = this.active;
    if (run) this.hardStop(run, "crashed");
    else this.restartWorker();
  }
}

function toResult(outcome: WorkerOutcome, run: ActiveRun): Pick<RunResult, "status" | "error" | "inputLinesProvided"> {
  switch (outcome.kind) {
    case "ok":
      return { status: "ok" };
    case "error":
      return { status: "error", error: outcome.error };
    case "interrupted":
      return { status: run.stopReason === "timeout" ? "timeout" : "stopped" };
    case "output-limit":
      return { status: "output-limit" };
    case "input-exhausted":
      return { status: "input-exhausted", inputLinesProvided: outcome.linesProvided };
    case "input-unavailable":
      return { status: "input-unavailable" };
    case "crashed":
      return { status: "crashed", error: { type: "InternalError", message: outcome.message, line: null, traceback: "" } };
  }
}

let shared: PythonRunner | null = null;

/** One runtime per page, shared by every challenge. */
export function getPythonRunner(): PythonRunner {
  if (!shared) {
    shared = new PythonRunner();
    if (import.meta.env.DEV) (globalThis as { __tracewisePython?: PythonRunner }).__tracewisePython = shared;
  }
  return shared;
}
