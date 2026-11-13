/**
 * Main-thread side of C++: a long-lived compiler worker (Clang) and a fresh
 * program worker for each run. Stopping a program just terminates its worker.
 */
import { DEFAULT_TIME_LIMIT_MS } from "../python/PythonRunner";
import { DEFAULT_OUTPUT_LIMITS } from "../python/outputLimit";
import { INPUT_BUFFER_BYTES, INPUT_READY } from "../python/protocol";
import type { OutputStream, RunOptions, RunResult, Runner, RuntimeState } from "../types";
import { hasMain } from "../../explain/cpp/helpers";
import { compileError, compileWarnings, runtimeError } from "./diagnostics";
import type { FromCompiler, FromProgram, ToCompiler, ToProgram } from "./protocol";

type CompileResult =
  | { ok: true; wasm: ArrayBuffer; stderr: string; ms: number }
  | { ok: false; stderr: string; crashed?: string };

interface ActiveRun {
  options: RunOptions;
  timeLimitMs: number;
  resolve: (result: RunResult) => void;
  stopReason: "user" | "timeout" | null;
  worker: Worker | null;
  waitingForInput: boolean;
  budgetMs: number;
  clockStartedAt: number;
  clock?: ReturnType<typeof setTimeout>;
  startedAt: number;
  warnings: RunResult["warnings"];
}

export class CppRunner implements Runner {
  private compiler: Worker | null = null;
  private state: RuntimeState = { status: "idle" };
  private listeners = new Set<() => void>();
  private loading: Promise<void> | null = null;
  private pendingLoad: { resolve: () => void; reject: (error: Error) => void } | null = null;
  private compiles = new Map<number, (result: CompileResult) => void>();
  private nextCompileId = 1;
  /** The last compile, so Submit compiles once and then runs every test. */
  private lastCompile: { code: string; result: Promise<CompileResult> } | null = null;
  private active: ActiveRun | null = null;

  private readonly inputState: Int32Array | null;
  private readonly inputData: Uint8Array | null;

  constructor() {
    const shared = typeof SharedArrayBuffer !== "undefined" && globalThis.crossOriginIsolated === true;
    this.inputState = shared ? new Int32Array(new SharedArrayBuffer(8)) : null;
    this.inputData = shared ? new Uint8Array(new SharedArrayBuffer(INPUT_BUFFER_BYTES)) : null;
  }

  // ---- State for React ---------------------------------------------------------

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

  // ---- Loading the compiler -------------------------------------------------------

  load(): Promise<void> {
    if (this.loading) return this.loading;
    this.setState({ status: "loading", progress: 0 });
    this.loading = new Promise<void>((resolve, reject) => {
      this.pendingLoad = { resolve, reject };
      const worker = new Worker(new URL("./compiler.worker.ts", import.meta.url), { type: "module" });
      this.compiler = worker;
      worker.addEventListener("message", (event: MessageEvent<FromCompiler>) => this.onCompilerMessage(event.data));
      worker.addEventListener("error", (event) => this.failLoad(event.message || "The C++ compiler failed to start."));
      worker.postMessage({ type: "init" } satisfies ToCompiler);
    });
    this.loading.catch(() => {
      this.loading = null;
    });
    return this.loading;
  }

  private failLoad(message: string) {
    this.compiler?.terminate();
    this.compiler = null;
    this.setState({ status: "failed", error: message });
    this.pendingLoad?.reject(new Error(message));
    this.pendingLoad = null;
    for (const resolve of this.compiles.values()) resolve({ ok: false, stderr: "", crashed: message });
    this.compiles.clear();
    this.lastCompile = null;
  }

  private onCompilerMessage(message: FromCompiler) {
    switch (message.type) {
      case "progress":
        this.setState({ status: "loading", progress: message.fraction });
        return;
      case "preparing":
        this.setState({ status: "loading", progress: 1, preparing: true });
        return;
      case "ready":
        this.setState({ status: "ready", version: "Clang 22" });
        this.pendingLoad?.resolve();
        this.pendingLoad = null;
        return;
      case "load-error":
        this.failLoad(message.message);
        return;
      case "compiled":
      case "compile-failed":
      case "compile-crashed": {
        const resolve = this.compiles.get(message.id);
        this.compiles.delete(message.id);
        if (!resolve) return;
        if (message.type === "compiled") resolve({ ok: true, wasm: message.wasm, stderr: message.stderr, ms: 0 });
        else if (message.type === "compile-failed") resolve({ ok: false, stderr: message.stderr });
        else resolve({ ok: false, stderr: "", crashed: message.message });
      }
    }
  }

  private compile(code: string): Promise<CompileResult> {
    if (this.lastCompile?.code === code) return this.lastCompile.result;
    const id = this.nextCompileId++;
    const result = new Promise<CompileResult>((resolve) => {
      this.compiles.set(id, resolve);
      this.compiler?.postMessage({ type: "compile", id, code } satisfies ToCompiler);
    });
    this.lastCompile = { code, result };
    return result;
  }

  // ---- Running ----------------------------------------------------------------------

  async run(code: string, options: RunOptions): Promise<RunResult> {
    if (this.active) throw new Error("A program is already running.");
    const timeLimitMs = options.timeLimitMs ?? DEFAULT_TIME_LIMIT_MS;

    return new Promise<RunResult>((resolve, reject) => {
      const run: ActiveRun = {
        options,
        timeLimitMs,
        resolve,
        stopReason: null,
        worker: null,
        waitingForInput: false,
        budgetMs: timeLimitMs,
        clockStartedAt: 0,
        startedAt: performance.now(),
        warnings: undefined,
      };
      this.active = run;
      options.onStatus?.("compiling");

      // Without main() Clang links happily and the program does nothing, so say so up front.
      if (!hasMain(code)) {
        this.finish(run, {
          status: "error",
          error: { type: "CompileError", message: "no main function", line: null, traceback: "" },
        });
        return;
      }

      this.load()
        .then(() => this.compile(code))
        .then((compiled) => {
          if (this.active !== run) return; // stopped while compiling
          if (!compiled.ok) {
            this.finish(run, compiled.crashed
              ? { status: "crashed", error: { type: "InternalError", message: compiled.crashed, line: null, traceback: "" } }
              : { status: "error", error: compileError(compiled.stderr) });
            return;
          }
          run.warnings = compileWarnings(compiled.stderr);
          options.onStatus?.("running");
          this.startProgram(run, compiled.wasm);
        })
        .catch((error: unknown) => {
          if (this.active === run) this.active = null;
          reject(error);
        });
    });
  }

  private startProgram(run: ActiveRun, wasm: ArrayBuffer) {
    const worker = new Worker(new URL("./program.worker.ts", import.meta.url), { type: "module" });
    run.worker = worker;
    if (this.inputState) Atomics.store(this.inputState, 0, 0);
    worker.addEventListener("message", (event: MessageEvent<FromProgram>) => this.onProgramMessage(run, event.data));
    worker.addEventListener("error", (event) =>
      this.finish(run, { status: "crashed", error: runtimeError(event.message || "The program crashed.") }),
    );
    worker.postMessage({
      type: "run",
      wasm, // copied, so the cached compile stays usable
      mode: run.options.mode,
      stdin: run.options.stdin ?? "",
      limits: DEFAULT_OUTPUT_LIMITS,
      inputState: (this.inputState?.buffer as SharedArrayBuffer | undefined) ?? null,
      inputData: (this.inputData?.buffer as SharedArrayBuffer | undefined) ?? null,
    } satisfies ToProgram);
    run.startedAt = performance.now();
    this.startClock(run);
  }

  private onProgramMessage(run: ActiveRun, message: FromProgram) {
    if (this.active !== run) return;
    switch (message.type) {
      case "output":
        run.options.onOutput?.(message.stream as OutputStream, message.text);
        return;
      case "input-request":
        clearTimeout(run.clock);
        run.budgetMs -= performance.now() - run.clockStartedAt;
        run.waitingForInput = true;
        run.options.onInputRequest?.("");
        return;
      case "done": {
        const { outcome } = message;
        const base = { durationMs: message.durationMs };
        if (outcome.kind === "exit") this.finish(run, { ...base, status: "ok", hitEndOfInput: outcome.hitEndOfInput });
        else if (outcome.kind === "output-limit") this.finish(run, { ...base, status: "output-limit" });
        else if (outcome.kind === "trap")
          this.finish(run, { ...base, status: "error", error: runtimeError(outcome.message), hitEndOfInput: outcome.hitEndOfInput });
        else this.finish(run, { ...base, status: "crashed", error: runtimeError(outcome.message) });
      }
    }
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

  private requestStop(reason: "user" | "timeout") {
    const run = this.active;
    if (!run || run.stopReason) return;
    run.stopReason = reason;
    this.finish(run, { status: reason === "timeout" ? "timeout" : "stopped" });
  }

  private finish(run: ActiveRun, result: Partial<RunResult> & Pick<RunResult, "status">) {
    if (this.active !== run) return;
    clearTimeout(run.clock);
    run.worker?.terminate();
    this.active = null;
    run.resolve({
      durationMs: performance.now() - run.startedAt,
      restarted: false,
      timeLimitMs: run.timeLimitMs,
      warnings: run.warnings,
      ...result,
    });
  }
}

let shared: CppRunner | null = null;

export function getCppRunner(): CppRunner {
  if (!shared) {
    shared = new CppRunner();
    if (import.meta.env.DEV) (globalThis as { __tracewiseCpp?: CppRunner }).__tracewiseCpp = shared;
  }
  return shared;
}
