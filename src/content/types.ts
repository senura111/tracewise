export const LANGUAGES = ["python", "cpp"] as const;
export type Language = (typeof LANGUAGES)[number];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface TestCase {
  input: string;
  output: string;
  /** Shown to the learner as a worked example. Hidden cases only run on Submit. */
  visible: boolean;
}

export interface LanguageVariant {
  starter: string;
  solution: string;
  /** Progressive hints as HTML, from small nudge to near-solution. */
  hintsHtml: string[];
  walkthroughHtml: string;
}

export interface Challenge {
  id: string;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  order: number;
  descriptionHtml: string;
  tests: TestCase[];
  variants: Partial<Record<Language, LanguageVariant>>;
}

/**
 * What the home, list and progress pages need about a challenge. The full
 * content (descriptions, hints, walkthroughs, code) loads only when a
 * challenge page opens.
 */
export interface ChallengeSummary {
  id: string;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  order: number;
  testCount: number;
  variants: Partial<Record<Language, { hintCount: number }>>;
}

export function summarize(challenge: Challenge): ChallengeSummary {
  const variants: ChallengeSummary["variants"] = {};
  for (const [language, variant] of Object.entries(challenge.variants) as [Language, LanguageVariant][]) {
    variants[language] = { hintCount: variant.hintsHtml.length };
  }
  const { id, title, difficulty, topics, order, tests } = challenge;
  return { id, title, difficulty, topics, order, testCount: tests.length, variants };
}

export const LANGUAGE_NAMES: Record<Language, string> = { python: "Python", cpp: "C++" };
