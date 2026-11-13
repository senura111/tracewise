import { challenges, loaders } from "virtual:challenges";
import type { Challenge, ChallengeSummary } from "./types";

/** Every challenge's summary, sorted in learning order. */
export { challenges };

export function getChallengeSummary(id: string): ChallengeSummary | undefined {
  return challenges.find((c) => c.id === id);
}

const loaded = new Map<string, Promise<Challenge>>();

/** The full content of one challenge; the same promise every time, so React's use() can suspend on it. */
export function loadChallenge(id: string): Promise<Challenge> {
  let promise = loaded.get(id);
  if (!promise) {
    promise = loaders[id]().then((module) => module.default);
    loaded.set(id, promise);
  }
  return promise;
}

/** 1-based position in the learning order, shown as the challenge number. */
export function challengeNumber(challenge: { id: string }): number {
  return challenges.findIndex((c) => c.id === challenge.id) + 1;
}

/** Every topic, in the order it first appears in the learning order. */
export const allTopics: string[] = [...new Set(challenges.flatMap((c) => c.topics))];

/** Groups challenges by their first (main) topic, keeping learning order. */
export function groupByMainTopic<T extends { topics: string[] }>(list: T[]): { topic: string; challenges: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const challenge of list) {
    const topic = challenge.topics[0];
    groups.set(topic, [...(groups.get(topic) ?? []), challenge]);
  }
  return [...groups].map(([topic, items]) => ({ topic, challenges: items }));
}
