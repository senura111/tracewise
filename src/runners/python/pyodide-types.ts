/**
 * The small part of Pyodide's API we use. Written by hand so we don't need the
 * pyodide npm package (tens of MB) just for its types.
 */

export interface PyProxy {
  destroy(): void;
}

export interface StreamWriter {
  write: (buffer: Uint8Array) => number;
  isatty?: boolean;
}

export interface PyodideInterface {
  runPython(code: string, options?: { globals?: PyProxy; filename?: string }): unknown;
  setStdout(options: StreamWriter): void;
  setStderr(options: StreamWriter): void;
  setStdin(options: { stdin: () => string | null | undefined; isatty?: boolean }): void;
  setInterruptBuffer(buffer: Uint8Array): void;
  registerJsModule(name: string, module: object): void;
}

export type LoadPyodide = (options: { indexURL: string }) => Promise<PyodideInterface>;

/** Pyodide's PythonError: `message` holds the formatted traceback. */
export interface PythonErrorLike extends Error {
  type: string;
}

export function isPythonError(error: unknown): error is PythonErrorLike {
  return error instanceof Error && typeof (error as { type?: unknown }).type === "string";
}
