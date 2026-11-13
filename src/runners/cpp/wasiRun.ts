/**
 * Runs a compiled C++ program (a WASI preview 1 WebAssembly module) with
 * line-by-line input and streaming output. Shared by the browser program
 * worker and the Node solution checker.
 */
import { ConsoleStdout, Fd, WASI, wasi } from "@bjorn3/browser_wasi_shim";

/** Thrown from inside the program's output to abort it once the output limit is hit. */
export class OutputLimitReached extends Error {}

/** stdin that asks for one line at a time, only when the program wants more. */
class LineInput extends Fd {
  private buffer = new Uint8Array(0);
  private ended = false;
  /** True once the program tried to read with no input left. */
  hitEnd = false;

  constructor(private readonly nextLine: () => string | null) {
    super();
  }

  fd_fdstat_get() {
    const fdstat = new wasi.Fdstat(wasi.FILETYPE_CHARACTER_DEVICE, 0);
    fdstat.fs_rights_base = BigInt(wasi.RIGHTS_FD_READ);
    return { ret: wasi.ERRNO_SUCCESS, fdstat };
  }

  fd_read(size: number) {
    if (this.buffer.length === 0) {
      const line = this.ended ? null : this.nextLine();
      if (line === null) {
        this.ended = true;
        this.hitEnd = true;
        return { ret: wasi.ERRNO_SUCCESS, data: new Uint8Array(0) };
      }
      this.buffer = new TextEncoder().encode(`${line}\n`);
    }
    const data = this.buffer.slice(0, size);
    this.buffer = this.buffer.slice(data.length);
    return { ret: wasi.ERRNO_SUCCESS, data };
  }
}

export interface WasiHooks {
  /** Next line of input (without the newline), or null for end of input. May block. */
  nextLine: () => string | null;
  /** Program output; may throw OutputLimitReached to stop the program. */
  write: (stream: "stdout" | "stderr", bytes: Uint8Array) => void;
}

export type WasiOutcome =
  | { kind: "exit"; code: number; hitEndOfInput: boolean }
  | { kind: "trap"; message: string; hitEndOfInput: boolean }
  | { kind: "output-limit" };

export function runWasi(module: WebAssembly.Module, hooks: WasiHooks): WasiOutcome {
  const stdin = new LineInput(hooks.nextLine);
  const stdout = new ConsoleStdout((bytes) => hooks.write("stdout", bytes));
  const stderr = new ConsoleStdout((bytes) => hooks.write("stderr", bytes));
  const runtime = new WASI(["main"], [], [stdin, stdout, stderr]);
  try {
    const instance = new WebAssembly.Instance(module, { wasi_snapshot_preview1: runtime.wasiImport });
    const code = runtime.start(instance as unknown as Parameters<WASI["start"]>[0]);
    return { kind: "exit", code, hitEndOfInput: stdin.hitEnd };
  } catch (error) {
    if (error instanceof OutputLimitReached) return { kind: "output-limit" };
    if (error instanceof WebAssembly.RuntimeError || error instanceof RangeError) {
      return { kind: "trap", message: error.message, hitEndOfInput: stdin.hitEnd };
    }
    throw error;
  }
}
