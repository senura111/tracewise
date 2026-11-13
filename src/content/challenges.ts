import { challenges } from "virtual:challenges";
import type { Challenge } from "./types";

/** All challenges, sorted in learning order. */
export { challenges };

export function getChallenge(id: string): Challenge | undefined {
  return challenges.find((c) => c.id === id);
}

/** 1-based position in the learning order, shown as the challenge number. */
export function challengeNumber(challenge: Challenge): number {
  return challenges.indexOf(challenge) + 1;
}

/** Every topic, in the order it first appears in the learning order. */
export const allTopics: string[] = [...new Set(challenges.flatMap((c) => c.topics))];

/** Groups challenges by their first (main) topic, keeping learning order. */
export function groupByMainTopic(list: Challenge[]): { topic: string; challenges: Challenge[] }[] {
  const groups = new Map<string, Challenge[]>();
  for (const challenge of list) {
    const topic = challenge.topics[0];
    groups.set(topic, [...(groups.get(topic) ?? []), challenge]);
  }
  return [...groups].map(([topic, items]) => ({ topic, challenges: items }));
}
