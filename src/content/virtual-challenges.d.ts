declare module "virtual:challenges" {
  /** Every challenge's summary, in learning order. */
  export const challenges: import("./types").ChallengeSummary[];
  /** Loads one challenge's full content (a separate chunk per challenge). */
  export const loaders: Record<string, () => Promise<{ default: import("./types").Challenge }>>;
}
