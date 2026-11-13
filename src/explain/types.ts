import type { CodeError } from "../runners/types";

/**
 * A beginner-friendly explanation of an error. Text fields may contain
 * `backticks` around code, which is shown in code style.
 */
export interface Explanation {
  /** Which rule produced it (or "fallback/<Type>") */
  ruleId: string;
  /** Short headline, e.g. "Use `==` to compare" */
  title: string;
  /** One to three plain-language sentences */
  message: string;
  /** Optional suggested line of code */
  fix?: string;
  /** Line the explanation is about */
  line: number | null;
  /** Line where the fix goes, if different (e.g. where input() was read) */
  fixLine?: number | null;
}

export interface ErrorContext {
  error: CodeError;
  code: string;
  /** The program's lines (index 0 is line 1) */
  lines: string[];
  /** Text of the error line, or "" */
  lineText: string;
}

export type RuleMatch = RegExpExecArray | null;

export interface ExplainRule {
  id: string;
  /** Exception types this rule applies to */
  types: string[];
  /** Tested against the error message (without the type) */
  match?: RegExp;
  /** Extra condition, e.g. looking at the code */
  when?: (ctx: ErrorContext, match: RuleMatch) => boolean;
  explain: (
    ctx: ErrorContext,
    match: RuleMatch,
  ) => Omit<Explanation, "ruleId" | "line"> & { line?: number | null };
  /** Programs that must trigger this rule; checked with real Python by `npm run check:explainer` */
  examples: string[];
}
