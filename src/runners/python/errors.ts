import type { CodeError } from "../types";

/** File names the learner's code can appear under in a traceback. */
const USER_FILES = new Set(["main.py", "<exec>"]);
const FRAME = /^ {2}File "([^"]+)", line (\d+)/;

/**
 * Turns a raw Python traceback into a CodeError: removes frames that belong
 * to the runtime (Pyodide internals), and finds the line in the learner's code.
 */
export function parsePythonTraceback(raw: string, type: string): CodeError {
  const kept: string[] = [];
  let line: number | null = null;
  let skipping = false;

  for (const text of raw.replace(/\r\n/g, "\n").trimEnd().split("\n")) {
    const frame = FRAME.exec(text);
    if (frame) {
      skipping = !USER_FILES.has(frame[1]);
      if (!skipping) line = Number(frame[2]);
    } else if (!text.startsWith("  ")) {
      // An unindented line (header, exception, "During handling...") ends a frame.
      skipping = false;
    }
    if (!skipping) kept.push(text.replace('File "<exec>"', 'File "main.py"'));
  }

  // Drop a header that no longer has any frames under it.
  const cleaned = kept.filter(
    (text, i) => !(text.startsWith("Traceback (") && !(kept[i + 1] ?? "").startsWith("  ")),
  );

  const last = cleaned.findLast((text) => text === type || text.startsWith(`${type}:`));
  const message = last ? last.slice(type.length).replace(/^:\s*/, "") : "";

  return { type, message, line, traceback: cleaned.join("\n") };
}
