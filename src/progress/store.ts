/**
 * Progress kept in the learner's browser (localStorage, one versioned key).
 * Works without storage too (private windows): progress then lasts until the
 * page is closed, and `persistent` is false so the UI can say so.
 */
import { LANGUAGES, type Language } from "../content/types";

export const STORAGE_KEY = "tracewise:v1";
const SAVE_DELAY_MS = 400;
const MAX_CODE_LENGTH = 100_000;

export interface LanguageProgress {
  /** Saved code; absent means "use the starter" */
  code?: string;
  /** ISO time of the first solve */
  solvedAt?: string;
  /** Number of Submits */
  attempts: number;
  best?: { passed: number; total: number };
  hintsShown: number;
  walkthroughShown: boolean;
  lastOpened?: string;
}

export interface ProgressData {
  version: 1;
  challenges: Record<string, Partial<Record<Language, LanguageProgress>>>;
  /** Local dates (YYYY-MM-DD) with at least one Submit, sorted */
  activity: string[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const emptyProgress = (): ProgressData => ({ version: 1, challenges: {}, activity: [] });

/** Shared, frozen default so React selectors keep a stable value. */
export const NO_PROGRESS: Readonly<LanguageProgress> = Object.freeze({
  attempts: 0,
  hintsShown: 0,
  walkthroughShown: false,
});

/** YYYY-MM-DD in the learner's own time zone. */
export function localDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ---- Validation ---------------------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const isTime = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseLanguageProgress(raw: unknown): LanguageProgress | null {
  if (!isObject(raw)) return null;
  const p: LanguageProgress = {
    attempts: isCount(raw.attempts) ? raw.attempts : 0,
    hintsShown: isCount(raw.hintsShown) ? raw.hintsShown : 0,
    walkthroughShown: raw.walkthroughShown === true,
  };
  if (typeof raw.code === "string") p.code = raw.code.slice(0, MAX_CODE_LENGTH);
  if (isTime(raw.solvedAt)) p.solvedAt = raw.solvedAt;
  if (isTime(raw.lastOpened)) p.lastOpened = raw.lastOpened;
  if (isObject(raw.best) && isCount(raw.best.passed) && isCount(raw.best.total) && raw.best.passed <= raw.best.total) {
    p.best = { passed: raw.best.passed, total: raw.best.total };
  }
  return p;
}

/**
 * Turns parsed JSON into ProgressData, dropping anything malformed field by
 * field. Returns null if it isn't Tracewise progress (version 1) at all.
 */
export function parseProgress(value: unknown): ProgressData | null {
  if (!isObject(value) || value.version !== 1 || !isObject(value.challenges)) return null;

  const challenges: ProgressData["challenges"] = {};
  for (const [id, entry] of Object.entries(value.challenges)) {
    if (!isObject(entry)) continue;
    const languages: Partial<Record<Language, LanguageProgress>> = {};
    for (const language of LANGUAGES) {
      const p = parseLanguageProgress(entry[language]);
      if (p) languages[language] = p;
    }
    if (Object.keys(languages).length > 0) challenges[id] = languages;
  }

  const activity = Array.isArray(value.activity)
    ? [...new Set(value.activity.filter((d): d is string => typeof d === "string" && DATE.test(d)))].sort()
    : [];

  return { version: 1, challenges, activity };
}

// ---- Store ----------------------------------------------------------------------

export class ProgressStore {
  private data: ProgressData;
  private listeners = new Set<() => void>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly storage: StorageLike | null,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.data = this.read();
  }

  /** False when the browser won't let us save (progress lasts until the page closes). */
  get persistent(): boolean {
    return this.storage !== null;
  }

  getSnapshot = (): ProgressData => this.data;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  get(id: string, language: Language): Readonly<LanguageProgress> {
    return this.data.challenges[id]?.[language] ?? NO_PROGRESS;
  }

  // ---- Reading and writing ----------------------------------------------------------

  private read(): ProgressData {
    let raw: string | null = null;
    try {
      raw = this.storage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return emptyProgress();
    }
    if (raw === null) return emptyProgress();

    let parsed: ProgressData | null = null;
    try {
      parsed = parseProgress(JSON.parse(raw));
    } catch {
      parsed = null;
    }
    if (parsed) return parsed;

    // Unreadable: keep a copy rather than silently losing it, then start fresh.
    try {
      this.storage?.setItem(`${STORAGE_KEY}:unreadable-${this.now().getTime()}`, raw);
    } catch {
      // Nothing more we can do.
    }
    return emptyProgress();
  }

  /** Writes any pending change now (called on page hide, and by tests). */
  flush() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Quota or blocked storage: progress still works for this visit.
    }
  }

  /** Another tab saved progress: pick it up. */
  reloadFromStorage() {
    this.data = this.read();
    this.notify();
  }

  private notify() {
    for (const listener of this.listeners) listener();
  }

  private commit(data: ProgressData, saveNow = false) {
    this.data = data;
    this.notify();
    if (saveNow) {
      this.flush();
    } else {
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.flush(), SAVE_DELAY_MS);
    }
  }

  private update(id: string, language: Language, change: (p: LanguageProgress) => LanguageProgress, saveNow = false) {
    const current = { ...this.get(id, language) };
    const next = change(current);
    this.commit(
      {
        ...this.data,
        challenges: { ...this.data.challenges, [id]: { ...this.data.challenges[id], [language]: next } },
      },
      saveNow,
    );
  }

  // ---- Changes -------------------------------------------------------------------------

  /** Saves edited code; code identical to the starter is not stored. */
  saveCode(id: string, language: Language, code: string, starter: string) {
    if ((this.get(id, language).code ?? starter) === code) return;
    this.update(id, language, (p) => {
      const next = { ...p };
      if (code === starter) delete next.code;
      else next.code = code.slice(0, MAX_CODE_LENGTH);
      return next;
    });
  }

  markOpened(id: string, language: Language) {
    this.update(id, language, (p) => ({ ...p, lastOpened: this.now().toISOString() }));
  }

  /** Records a finished Submit: attempts, best score, first solve and today's activity. */
  recordSubmission(id: string, language: Language, passed: number, total: number) {
    const now = this.now();
    this.update(
      id,
      language,
      (p) => ({
        ...p,
        attempts: p.attempts + 1,
        best: !p.best || passed > p.best.passed || p.best.total !== total ? { passed, total } : p.best,
        solvedAt: p.solvedAt ?? (passed === total ? now.toISOString() : undefined),
      }),
      true,
    );
    const today = localDate(now);
    if (!this.data.activity.includes(today)) {
      this.commit({ ...this.data, activity: [...this.data.activity, today].sort() }, true);
    }
  }

  setHintsShown(id: string, language: Language, count: number) {
    if (count <= this.get(id, language).hintsShown) return;
    this.update(id, language, (p) => ({ ...p, hintsShown: count }));
  }

  setWalkthroughShown(id: string, language: Language) {
    if (this.get(id, language).walkthroughShown) return;
    this.update(id, language, (p) => ({ ...p, walkthroughShown: true }));
  }

  /** Replaces everything (used by Import). */
  replaceAll(data: ProgressData) {
    this.commit(data, true);
  }

  /** Deletes all progress in this browser. */
  reset() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.data = emptyProgress();
    try {
      this.storage?.removeItem(STORAGE_KEY);
    } catch {
      // Ignore: the in-memory copy is already empty.
    }
    this.notify();
  }
}
