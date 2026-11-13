/**
 * Language-neutral runner interface. Python implements it in Phase 2;
 * C++ will implement the same interface in Phase 6.
 */

export type RunMode =
  /** Interactive: input() asks the learner, prompts are shown. */
  | "run"
  /** Automatic: input() reads from the test's stdin, prompts are dropped. */
  | "test";

export type OutputStream = "stdout" | "stderr";

export type RunStatus =
  | "ok"
  | "error" // the program raised an error
  | "stopped" // the learner pressed Stop
  | "timeout" // ran past the time limit
  | "output-limit" // printed too much
  | "input-exhausted" // test mode: asked for more input than the test provides
  | "input-unavailable" // run mode without cross-origin isolation: input() can't wait
  | "crashed"; // the runtime itself failed

export interface CodeError {
  /** Exception type, e.g. "NameError" */
  type: string;
  /** Message without the type, e.g. "name 'x' is not defined" */
  message: string;
  /** Line in the learner's code, if known */
  line: number | null;
  /** Traceback with runtime-internal frames removed */
  traceback: string;
}

export interface RunResult {
  status: RunStatus;
  error?: CodeError;
  /** Running time, not counting time spent waiting for input */
  durationMs: number;
  /** True when the runtime had to be restarted to stop the program */
  restarted: boolean;
  /** Test mode: how many input lines the test provided */
  inputLinesProvided?: number;
  timeLimitMs: number;
  /** Compiled languages: warnings from a successful compile */
  warnings?: CodeError[];
  /** C++: the program tried to read input after it had all run out */
  hitEndOfInput?: boolean;
}

export interface RunOptions {
  mode: RunMode;
  /** Test mode: the whole input, one line per input() call */
  stdin?: string;
  timeLimitMs?: number;
  onOutput?: (stream: OutputStream, text: string) => void;
  /** Run mode: the program is waiting for a line; answer with provideInput() */
  onInputRequest?: (prompt: string) => void;
  /** Compiled languages: "compiling" first, then "running" */
  onStatus?: (status: "compiling" | "running") => void;
}

export type RuntimeStatus = "idle" | "loading" | "ready" | "failed";

export interface RuntimeState {
  status: RuntimeStatus;
  /** e.g. "3.14.2" */
  version?: string;
  error?: string;
  /** While loading: download progress from 0 to 1, if known */
  progress?: number;
  /** While loading: the download is done and the runtime is being prepared */
  preparing?: boolean;
}

export interface Runner {
  getState(): RuntimeState;
  subscribe(listener: () => void): () => void;
  load(): Promise<void>;
  run(code: string, options: RunOptions): Promise<RunResult>;
  provideInput(line: string): void;
  stop(): void;
}
