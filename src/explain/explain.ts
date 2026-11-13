import type { Language } from "../content/types";
import type { CodeError } from "../runners/types";
import { CPP_FALLBACKS, CPP_RULES } from "./cpp/rules";
import { FALLBACKS, GENERIC_FALLBACK } from "./python/fallbacks";
import { RUNTIME_RULES } from "./python/runtime";
import { SYNTAX_RULES } from "./python/syntax";
import type { ErrorContext, ExplainRule, Explanation } from "./types";

/** Every Python rule, most specific first within each error type. */
export const PYTHON_RULES: ExplainRule[] = [...SYNTAX_RULES, ...RUNTIME_RULES];

export { CPP_RULES };

type Fallbacks = Record<string, { title: string; message: string }>;

const RULES: Record<Language, { rules: ExplainRule[]; fallbacks: Fallbacks }> = {
  python: { rules: PYTHON_RULES, fallbacks: FALLBACKS },
  cpp: { rules: CPP_RULES, fallbacks: CPP_FALLBACKS },
};

/** Turns an error into a beginner-friendly explanation. Never fails: falls back to a general one. */
export function explainError(
  error: CodeError,
  code: string,
  rules: ExplainRule[] = PYTHON_RULES,
  fallbacks: Fallbacks = FALLBACKS,
): Explanation {
  const lines = code.replace(/\r\n/g, "\n").split("\n");
  const ctx: ErrorContext = {
    error,
    code,
    lines,
    lineText: error.line ? (lines[error.line - 1] ?? "") : "",
  };

  for (const rule of rules) {
    if (!rule.types.includes(error.type)) continue;
    const match = rule.match ? rule.match.exec(error.message) : null;
    if (rule.match && !match) continue;
    if (rule.when && !rule.when(ctx, match)) continue;
    const { line, ...rest } = rule.explain(ctx, match);
    return { ruleId: rule.id, line: line === undefined ? error.line : line, ...rest };
  }

  const fallback = fallbacks[error.type] ?? GENERIC_FALLBACK;
  return { ruleId: `fallback/${error.type}`, line: error.line, ...fallback };
}

export function explainFor(language: Language, error: CodeError, code: string): Explanation {
  return explainError(error, code, RULES[language].rules, RULES[language].fallbacks);
}

/**
 * Compiler warnings worth showing: only those a rule explains (unused
 * variables and the like would just be noise for beginners).
 */
export function explainWarnings(language: Language, warnings: CodeError[] | undefined, code: string) {
  return (warnings ?? [])
    .map((warning) => ({ warning, explanation: explainFor(language, warning, code) }))
    .filter(({ explanation }) => !explanation.ruleId.startsWith("fallback/"));
}
