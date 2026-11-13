import { useSyncExternalStore } from "react";
import type { Language } from "../content/types";
import { NO_PROGRESS, ProgressStore, STORAGE_KEY, type LanguageProgress, type ProgressData, type StorageLike } from "./store";

/** localStorage if the browser allows it, otherwise null (private windows, blocked storage). */
function availableStorage(): StorageLike | null {
  try {
    const storage = window.localStorage;
    const probe = `${STORAGE_KEY}:probe`;
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/** The one progress store for the page. */
export const progressStore = new ProgressStore(availableStorage());

// Keep tabs in sync, and don't lose a pending save when the page goes away.
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY || event.key === null) progressStore.reloadFromStorage();
});
window.addEventListener("pagehide", () => progressStore.flush());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") progressStore.flush();
});

export function useProgressData(): ProgressData {
  return useSyncExternalStore(progressStore.subscribe, progressStore.getSnapshot);
}

export function useChallengeProgress(id: string, language: Language): Readonly<LanguageProgress> {
  return useSyncExternalStore(progressStore.subscribe, () => progressStore.get(id, language));
}

export type ChallengeStatus = "solved" | "started" | "new";

export function statusOf(p: Readonly<LanguageProgress> | undefined): ChallengeStatus {
  if (p?.solvedAt) return "solved";
  if (p && (p.code !== undefined || p.attempts > 0)) return "started";
  return "new";
}

export { NO_PROGRESS };
