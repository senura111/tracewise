/** Small helpers for looking at the learner's code from inside explanation rules. */

const KEYWORDS = new Set(
  (
    "False None True and as assert async await break class continue def del elif else except finally for " +
    "from global if import in is lambda nonlocal not or pass raise return try while with yield"
  ).split(" "),
);

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Removes comments and string literals so they aren't mistaken for code.
 * F-strings keep the expressions inside their braces: f"{total:.1f}" → total.
 */
function stripStringsAndComments(code: string): string {
  return code
    .replace(/(?<!\w)([fFrRbB]{0,2})("([^"\\\n]|\\.)*"|'([^'\\\n]|\\.)*')/g, (_all, prefix: string, literal: string) => {
      if (!/f/i.test(prefix)) return '""';
      const expressions = [...literal.matchAll(/\{([^{}:!]*)/g)].map((m) => m[1]);
      return ` ${expressions.join(" ")} `;
    })
    .replace(/#.*$/gm, "");
}

/** Every identifier used in the code (variables, functions), minus keywords. */
export function identifiers(code: string): Set<string> {
  const names = stripStringsAndComments(code).match(/\b[A-Za-z_]\w*\b/g) ?? [];
  return new Set(names.filter((n) => !KEYWORDS.has(n)));
}

/** Lines (1-based) where `name` is given a value: `name = ...`, `name += ...`, `for name in`, `def name(`. */
export function assignmentLines(lines: string[], name: string): number[] {
  const n = escapeRegExp(name);
  const pattern = new RegExp(
    `^\\s*(?:${n}\\s*(?:[-+*/%]|//|\\*\\*)?=(?!=)|for\\s+(?:\\w+\\s*,\\s*)*${n}\\b[^:]*\\bin\\b|def\\s+${n}\\s*\\()`,
  );
  return lines.flatMap((text, i) => (pattern.test(stripStringsAndComments(text)) ? [i + 1] : []));
}

/** Finds a variable from `names` that was assigned straight from input() (not wrapped in int/float). */
export function rawInputAssignment(lines: string[], names: Iterable<string>): { name: string; line: number } | null {
  for (const name of names) {
    const pattern = new RegExp(`^\\s*${escapeRegExp(name)}\\s*=\\s*input\\s*\\(`);
    const index = lines.findIndex((text) => pattern.test(text));
    if (index !== -1) return { name, line: index + 1 };
  }
  return null;
}

/** Identifiers that appear on one line of code. */
export function namesOnLine(lineText: string): string[] {
  return [...identifiers(lineText)];
}

/** Line (1-based) where function `name` is defined, or null. */
export function functionLine(lines: string[], name: string): number | null {
  const pattern = new RegExp(`^\\s*def\\s+${escapeRegExp(name)}\\s*\\(`);
  const index = lines.findIndex((text) => pattern.test(text));
  return index === -1 ? null : index + 1;
}

/** Names of functions defined with `def` in the code. */
export function definedFunctions(code: string): string[] {
  return [...code.matchAll(/^\s*def\s+(\w+)\s*\(/gm)].map((m) => m[1]);
}

/**
 * Edit distance where swapping two neighbouring letters counts as one edit
 * (optimal string alignment), since `nmae` for `name` is a classic typo.
 */
export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** The candidate closest in spelling to `name`, if it's close enough to be a likely typo. */
export function closestName(name: string, candidates: Iterable<string>): string | null {
  const limit = name.length >= 5 ? 2 : name.length >= 3 ? 1 : 0;
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    if (candidate === name) continue;
    const distance = editDistance(name.toLowerCase(), candidate.toLowerCase());
    if (distance <= limit && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

/** Replaces whole-word occurrences of `from` with `to` in a line. */
export function replaceWord(text: string, from: string, to: string): string {
  return text.replace(new RegExp(`\\b${escapeRegExp(from)}\\b`, "g"), to);
}
