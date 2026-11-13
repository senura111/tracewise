import { DEFAULT_OUTPUT_LIMITS } from "./python/outputLimit";
import type { RunResult } from "./types";

export type ResultTone = "ok" | "error" | "stopped";

export function formatDuration(ms: number): string {
  const seconds = Math.max(ms, 0) / 1000;
  return `${seconds < 1 ? seconds.toFixed(2) : seconds.toFixed(1)} s`;
}

const article = (word: string) => (/^[AEIOU]/i.test(word) ? "an" : "a");
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function inputExhaustedMessage(linesProvided: number): string {
  return (
    `Your program asked for more input than this test gives (${plural(linesProvided, "line")}). ` +
    `Call input() once for each line of input the task describes, and no more.`
  );
}

/** Beginner-friendly one-line summary of how a run ended. */
export function describeResult(result: RunResult): { tone: ResultTone; text: string } {
  const restarted = result.restarted ? " Python had to restart to stop it, which takes a moment." : "";
  const seconds = Math.round(result.timeLimitMs / 1000);

  switch (result.status) {
    case "ok":
      return { tone: "ok", text: `Finished in ${formatDuration(result.durationMs)}.` };
    case "error": {
      const { type, line } = result.error ?? { type: "Error", line: null };
      return {
        tone: "error",
        text: `Stopped with ${article(type)} ${type}${line ? ` on line ${line}` : ""}.`,
      };
    }
    case "stopped":
      return { tone: "stopped", text: `Stopped.${restarted}` };
    case "timeout":
      return {
        tone: "error",
        text:
          `Stopped after ${plural(seconds, "second")}: your program was still running. ` +
          `This often means a loop that never ends. Check that something inside the loop ` +
          `eventually makes its condition false.${restarted}`,
      };
    case "output-limit":
      return {
        tone: "error",
        text:
          `Stopped: your program printed too much (over ${DEFAULT_OUTPUT_LIMITS.maxLines.toLocaleString("en")} ` +
          `lines or ${DEFAULT_OUTPUT_LIMITS.maxChars.toLocaleString("en")} characters). ` +
          `Is something printing inside a loop that never ends?`,
      };
    case "input-exhausted":
      return { tone: "error", text: inputExhaustedMessage(result.inputLinesProvided ?? 0) };
    case "input-unavailable":
      return {
        tone: "error",
        text:
          "Your program called input(), but this browser can't pause a program to wait for typing. " +
          "Try a recent version of Chrome, Edge, Firefox or Safari.",
      };
    case "crashed":
      return {
        tone: "error",
        text: "Something went wrong inside the Python runtime, so it was restarted. Try running your code again.",
      };
  }
}
