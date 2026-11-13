/**
 * Compares a program's output with the expected output, forgiving only what a
 * beginner can't see (line endings, trailing spaces, trailing blank lines),
 * and spots common near misses so a failed test can say *why*.
 */

export interface Comparison {
  passed: boolean;
  expected: string[];
  actual: string[];
  /** Index of the first line that differs (or is missing/extra); null if passed */
  firstDifference: number | null;
  /** Plain-language hint about a likely cause, if one is recognised */
  note: string | null;
}

/** Splits output into lines, ignoring line-ending style, trailing spaces and trailing blank lines. */
export function normalizeOutput(text: string): string[] {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""));
  while (lines.length > 0 && lines.at(-1) === "") lines.pop();
  return lines;
}

const sameLines = (a: string[], b: string[]) => a.length === b.length && a.every((line, i) => line === b[i]);

export function compareOutput(expectedText: string, actualText: string): Comparison {
  const expected = normalizeOutput(expectedText);
  const actual = normalizeOutput(actualText);

  if (sameLines(expected, actual)) {
    return { passed: true, expected, actual, firstDifference: null, note: null };
  }

  let firstDifference = 0;
  while (firstDifference < expected.length && expected[firstDifference] === actual[firstDifference]) {
    firstDifference++;
  }
  return { passed: false, expected, actual, firstDifference, note: nearMiss(expected, actual, firstDifference) };
}

const lines = (n: number) => `${n} line${n === 1 ? "" : "s"}`;

function nearMiss(expected: string[], actual: string[], first: number): string | null {
  if (actual.length === 0) {
    return "Your program didn't print anything. Did you forget print()?";
  }

  const e = expected[first] ?? "";
  const a = actual[first] ?? "";

  if (sameLines(expected.map((l) => l.toLowerCase()), actual.map((l) => l.toLowerCase()))) {
    return `Almost! Only capital letters differ: expected "${e}", but your program printed "${a}".`;
  }

  const noSpaces = (ls: string[]) => ls.join("").replace(/\s+/g, "");
  if (noSpaces(expected) === noSpaces(actual)) {
    return `Almost! Only spaces or line breaks differ: expected "${e}", but your program printed "${a}".`;
  }

  const dropPointZero = (ls: string[]) => ls.map((l) => l.replace(/(\d)\.0(?!\d)/g, "$1"));
  if (sameLines(expected, dropPointZero(actual))) {
    return (
      `Expected a whole number, but your program printed a decimal ("${a}" instead of "${e}"). ` +
      `Dividing with / always gives a decimal; // or int() gives a whole number.`
    );
  }

  if (actual.length > expected.length) {
    for (let start = 0; start + expected.length <= actual.length; start++) {
      if (sameLines(expected, actual.slice(start, start + expected.length))) {
        return (
          `Your program printed the right answer, plus ${lines(actual.length - expected.length)} too many. ` +
          `Is there a leftover print() you used for checking, or a print() inside a loop?`
        );
      }
    }
  }

  if (actual.length < expected.length && sameLines(expected.slice(0, actual.length), actual)) {
    return `Your output stops too early: it's missing the last ${lines(expected.length - actual.length)}.`;
  }

  return null;
}
