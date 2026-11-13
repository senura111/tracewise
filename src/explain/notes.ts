import type { LineNote } from "../components/CodeEditor";
import type { CodeError } from "../runners/types";
import { errorLabel } from "./labels";
import type { Explanation } from "./types";

/** Notes for the editor: one on the problem line, and a marker where the fix goes. */
export function notesFor(explanation: Explanation, error: CodeError): LineNote[] {
  const notes: LineNote[] = [];
  if (explanation.line) {
    notes.push({
      kind: error.type === "CompileWarning" ? "warning" : "error",
      line: explanation.line,
      label: `Line ${explanation.line} · ${errorLabel(error.type)}`,
      title: explanation.title,
      message: explanation.message,
      fix: explanation.fix,
    });
  }
  if (explanation.fixLine && explanation.fixLine !== explanation.line) {
    notes.push({ kind: "fix", line: explanation.fixLine, label: "Fix goes here", message: "" });
  }
  return notes;
}
