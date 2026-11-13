/** Messages and shared-memory layout between PythonRunner and the worker. */
import type { CodeError, OutputStream, RunMode } from "../types";
import type { OutputLimits } from "./outputLimit";

export type ToWorker =
  | {
      type: "init";
      indexURL: string;
      /** Uint8Array(1): Pyodide's interrupt buffer; 2 = KeyboardInterrupt */
      interrupt: SharedArrayBuffer | null;
      /** Int32Array(2): [state, byte length] for input() */
      inputState: SharedArrayBuffer | null;
      /** Uint8Array: UTF-8 bytes of the line typed by the learner */
      inputData: SharedArrayBuffer | null;
    }
  | { type: "run"; id: number; code: string; mode: RunMode; stdin: string; limits: OutputLimits };

export type WorkerOutcome =
  | { kind: "ok" }
  | { kind: "error"; error: CodeError }
  | { kind: "interrupted" }
  | { kind: "output-limit" }
  | { kind: "input-exhausted"; linesProvided: number }
  | { kind: "input-unavailable" }
  | { kind: "crashed"; message: string };

export type FromWorker =
  | { type: "ready"; version: string }
  | { type: "load-error"; message: string }
  | { type: "output"; id: number; stream: OutputStream; text: string }
  | { type: "input-request"; id: number; prompt: string }
  | { type: "done"; id: number; outcome: WorkerOutcome; durationMs: number };

/** inputState[0] values */
export const INPUT_WAITING = 0;
export const INPUT_READY = 1;
export const INPUT_STOP = 2;

export const INPUT_BUFFER_BYTES = 64 * 1024;

/** Value Pyodide's interrupt buffer uses for SIGINT (KeyboardInterrupt). */
export const SIGINT = 2;
