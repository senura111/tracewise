/** Turns Clang's (and wasm-ld's) text output into structured diagnostics. */
import type { CodeError } from "../types";

export interface Diagnostic {
  severity: "error" | "warning" | "note";
  message: string;
  line: number | null;
  column: number | null;
  /** Warning group, e.g. "-Wparentheses" */
  flag?: string;
}

const CLANG_LINE = /^main\.cpp:(\d+):(\d+): (fatal error|error|warning|note): (.*)$/;
const LINKER_LINE = /^wasm-ld: error: (?:.*?: )?(undefined symbol: .*)$/;

export function parseClangOutput(stderr: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const text of stderr.replace(/\r\n/g, "\n").split("\n")) {
    const clang = CLANG_LINE.exec(text);
    if (clang) {
      const flagMatch = / \[(-W[\w-]+)(?:,[^\]]*)?\]$/.exec(clang[4]);
      diagnostics.push({
        severity: clang[3] === "note" ? "note" : clang[3] === "warning" ? "warning" : "error",
        message: flagMatch ? clang[4].slice(0, flagMatch.index) : clang[4],
        line: Number(clang[1]),
        column: Number(clang[2]),
        flag: flagMatch?.[1],
      });
      continue;
    }
    const linker = LINKER_LINE.exec(text);
    if (linker) diagnostics.push({ severity: "error", message: linker[1], line: null, column: null });
  }
  return diagnostics;
}

/** Clang's output with the summary line ("2 errors generated.") removed. */
function cleanOutput(stderr: string): string {
  return stderr
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !/^\d+ (errors?|warnings?)( and \d+ (errors?|warnings?))? generated\.$/.test(line))
    .filter((line) => !/^clang\+\+: error: linker command failed/.test(line))
    .join("\n")
    .trim();
}

/** The first error, as a CodeError ("CompileError"), with the whole output as its traceback. */
export function compileError(stderr: string): CodeError {
  const first = parseClangOutput(stderr).find((d) => d.severity === "error");
  return {
    type: "CompileError",
    message: first?.message ?? "The code didn't compile.",
    line: first?.line ?? null,
    traceback: cleanOutput(stderr),
  };
}

/** Warnings from a successful compile, one CodeError ("CompileWarning") each. */
export function compileWarnings(stderr: string): CodeError[] {
  return parseClangOutput(stderr)
    .filter((d) => d.severity === "warning")
    .map((d) => ({
      type: "CompileWarning",
      message: d.flag ? `${d.message} [${d.flag}]` : d.message,
      line: d.line,
      traceback: cleanOutput(stderr),
    }));
}

/** A crash while running (a WebAssembly trap), as a CodeError ("RuntimeError"). */
export function runtimeError(message: string): CodeError {
  return { type: "RuntimeError", message, line: null, traceback: `RuntimeError: ${message}` };
}
