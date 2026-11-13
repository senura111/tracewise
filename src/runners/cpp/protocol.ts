/** Messages between CppRunner and its two workers. */
import type { OutputStream, RunMode } from "../types";
import type { OutputLimits } from "../python/outputLimit";
import type { WasiOutcome } from "./wasiRun";

export const CLANG_PACKAGE_VERSION = "22.0.0-git20542-10";
export const CLANG_URL = `https://cdn.jsdelivr.net/npm/@yowasp/clang@${CLANG_PACKAGE_VERSION}/gen/bundle.js`;

/**
 * -O0 keeps the program doing exactly what the code says (no surprising
 * optimisations of beginners' mistakes); exceptions aren't available in this
 * toolchain, so they're switched off to get a clear compile error instead of
 * a linker error.
 */
export const COMPILE_ARGS = ["main.cpp", "-o", "main.wasm", "-std=c++20", "-O0", "-fno-exceptions", "-Wall"];

// ---- Compiler worker ---------------------------------------------------------
export type ToCompiler = { type: "init" } | { type: "compile"; id: number; code: string };

export type FromCompiler =
  | { type: "progress"; fraction: number }
  | { type: "preparing" }
  | { type: "ready" }
  | { type: "load-error"; message: string }
  | { type: "compiled"; id: number; wasm: ArrayBuffer; stderr: string }
  | { type: "compile-failed"; id: number; stderr: string }
  | { type: "compile-crashed"; id: number; message: string };

// ---- Program worker -----------------------------------------------------------
export type ToProgram = {
  type: "run";
  wasm: ArrayBuffer;
  mode: RunMode;
  stdin: string;
  limits: OutputLimits;
  inputState: SharedArrayBuffer | null;
  inputData: SharedArrayBuffer | null;
};

export type FromProgram =
  | { type: "output"; stream: OutputStream; text: string }
  | { type: "input-request" }
  | { type: "done"; outcome: WasiOutcome | { kind: "crashed"; message: string }; durationMs: number };
