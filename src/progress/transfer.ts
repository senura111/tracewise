/** Export and import of progress as a JSON file. */
import { localDate, parseProgress, type ProgressData } from "./store";

export function exportProgress(data: ProgressData, now: Date): string {
  return JSON.stringify({ app: "tracewise", exportedAt: now.toISOString(), ...data }, null, 2);
}

export function exportFileName(now: Date): string {
  return `tracewise-progress-${localDate(now)}.json`;
}

export interface ProgressSummary {
  solved: number;
  withCode: number;
}

export function summarize(data: ProgressData): ProgressSummary {
  let solved = 0;
  let withCode = 0;
  for (const languages of Object.values(data.challenges)) {
    for (const p of Object.values(languages)) {
      if (p?.solvedAt) solved++;
      if (p?.code !== undefined) withCode++;
    }
  }
  return { solved, withCode };
}

export type ImportResult =
  | { ok: true; data: ProgressData; summary: ProgressSummary }
  | { ok: false; error: string };

/** Checks an import file's text before anything is replaced. */
export function readImport(text: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't a Tracewise progress file (it isn't valid JSON)." };
  }
  if (typeof json === "object" && json !== null && typeof (json as { version?: unknown }).version === "number") {
    const version = (json as { version: number }).version;
    if (version > 1) {
      return { ok: false, error: "This file was made by a newer version of Tracewise, so it can't be imported here." };
    }
  }
  const data = parseProgress(json);
  if (!data) return { ok: false, error: "This file doesn't look like a Tracewise progress file." };
  return { ok: true, data, summary: summarize(data) };
}
