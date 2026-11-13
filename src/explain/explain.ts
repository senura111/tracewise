import type { CodeError } from "../runners/types";
import { FALLBACKS, GENERIC_FALLBACK } from "./python/fallbacks";
import { RUNTIME_RULES } from "./python/runtime";
import { SYNTAX_RULES } from "./python/syntax";
import type { ErrorContext, ExplainRule, Explanation } from "./types";

/** Every Python rule, most specific first within each error type. */
export const PYTHON_RULES: ExplainRule[] = [...SYNTAX_RULES, ...RUNTIME_RULES];

/** Turns a Python error into a beginner-friendly explanation. Never fails: falls back to a general one. */
export function explainError(error: CodeError, code: string, rules: ExplainRule[] = PYTHON_RULES): Explanation {
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

  const fallback = FALLBACKS[error.type] ?? GENERIC_FALLBACK;
  return { ruleId: `fallback/${error.type}`, line: error.line, ...fallback };
}
