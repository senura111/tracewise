import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localDate, parseProgress, ProgressStore, STORAGE_KEY, type StorageLike } from "./store";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { items: Map<string, string> } {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (k) => items.get(k) ?? null,
    setItem: (k, v) => void items.set(k, v),
    removeItem: (k) => void items.delete(k),
  };
}

const NOW = new Date(2026, 10, 14, 15, 30); // 14 Nov 2026, local time
const STARTER = "# starter\n";

describe("ProgressStore", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts empty and reports nothing for unknown challenges", () => {
    const store = new ProgressStore(memoryStorage(), () => NOW);
    expect(store.get("caesar-cipher", "python")).toMatchObject({ attempts: 0, hintsShown: 0 });
    expect(store.getSnapshot().challenges).toEqual({});
  });

  it("saves code shortly after edits, and drops it when it matches the starter", () => {
    const storage = memoryStorage();
    const store = new ProgressStore(storage, () => NOW);
    store.saveCode("c", "python", "print(1)\n", STARTER);
    expect(storage.items.has(STORAGE_KEY)).toBe(false); // not yet
    vi.advanceTimersByTime(500);
    expect(JSON.parse(storage.items.get(STORAGE_KEY)!).challenges.c.python.code).toBe("print(1)\n");

    store.saveCode("c", "python", STARTER, STARTER);
    store.flush();
    expect(JSON.parse(storage.items.get(STORAGE_KEY)!).challenges.c.python.code).toBeUndefined();
  });

  it("records submissions: attempts, best score, first solve and activity", () => {
    const storage = memoryStorage();
    const store = new ProgressStore(storage, () => NOW);
    store.recordSubmission("c", "python", 2, 6);
    store.recordSubmission("c", "python", 1, 6);
    expect(store.get("c", "python")).toMatchObject({ attempts: 2, best: { passed: 2, total: 6 } });
    expect(store.get("c", "python").solvedAt).toBeUndefined();

    store.recordSubmission("c", "python", 6, 6);
    const solvedAt = store.get("c", "python").solvedAt;
    expect(solvedAt).toBe(NOW.toISOString());

    // Solving again later keeps the first solve date.
    store.recordSubmission("c", "python", 3, 6);
    expect(store.get("c", "python").solvedAt).toBe(solvedAt);
    expect(store.getSnapshot().activity).toEqual(["2026-11-14"]);
    // Submissions are saved straight away.
    expect(JSON.parse(storage.items.get(STORAGE_KEY)!).challenges.c.python.attempts).toBe(4);
  });

  it("only ever increases the number of hints shown", () => {
    const store = new ProgressStore(memoryStorage(), () => NOW);
    store.setHintsShown("c", "python", 2);
    store.setHintsShown("c", "python", 1);
    expect(store.get("c", "python").hintsShown).toBe(2);
  });

  it("keeps an unreadable saved value as a backup and starts fresh", () => {
    const storage = memoryStorage({ [STORAGE_KEY]: "{not json" });
    const store = new ProgressStore(storage, () => NOW);
    expect(store.getSnapshot().challenges).toEqual({});
    expect(storage.items.get(`${STORAGE_KEY}:unreadable-${NOW.getTime()}`)).toBe("{not json");
  });

  it("works without storage", () => {
    const store = new ProgressStore(null, () => NOW);
    store.recordSubmission("c", "python", 6, 6);
    expect(store.persistent).toBe(false);
    expect(store.get("c", "python").solvedAt).toBeDefined();
  });

  it("notifies listeners and keeps unchanged challenges identical", () => {
    const store = new ProgressStore(memoryStorage(), () => NOW);
    store.recordSubmission("a", "python", 1, 1);
    const before = store.get("a", "python");
    const listener = vi.fn();
    store.subscribe(listener);
    store.setHintsShown("b", "python", 1);
    expect(listener).toHaveBeenCalled();
    expect(store.get("a", "python")).toBe(before);
  });

  it("picks up changes saved by another tab", () => {
    const storage = memoryStorage();
    const store = new ProgressStore(storage, () => NOW);
    const other = new ProgressStore(storage, () => NOW);
    other.recordSubmission("c", "python", 3, 3);
    store.reloadFromStorage();
    expect(store.get("c", "python").solvedAt).toBeDefined();
  });

  it("resets everything", () => {
    const storage = memoryStorage();
    const store = new ProgressStore(storage, () => NOW);
    store.recordSubmission("c", "python", 3, 3);
    store.reset();
    expect(store.getSnapshot().challenges).toEqual({});
    expect(storage.items.has(STORAGE_KEY)).toBe(false);
  });
});

describe("parseProgress", () => {
  it("rejects anything that isn't version 1 progress", () => {
    expect(parseProgress(null)).toBeNull();
    expect(parseProgress({ version: 2, challenges: {} })).toBeNull();
    expect(parseProgress({ version: 1 })).toBeNull();
  });

  it("drops malformed fields but keeps the rest", () => {
    const data = parseProgress({
      version: 1,
      challenges: {
        ok: { python: { code: "x", attempts: 2, hintsShown: "lots", solvedAt: "not a date" } },
        bad: "nope",
        unknownLanguage: { ruby: { attempts: 1 } },
      },
      activity: ["2026-11-14", "yesterday", "2026-11-13", "2026-11-14"],
    });
    expect(data).toEqual({
      version: 1,
      challenges: { ok: { python: { code: "x", attempts: 2, hintsShown: 0, walkthroughShown: false } } },
      activity: ["2026-11-13", "2026-11-14"],
    });
  });
});

describe("localDate", () => {
  it("uses the local calendar date", () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});
