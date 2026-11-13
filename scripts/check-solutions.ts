/**
 * Checks every challenge's content using real Python (Pyodide in Node):
 *   - each reference solution passes all of its tests
 *   - each starter does NOT already pass all of its tests
 *
 * Uses the same input() rules and output comparison as the website.
 * Run with: npm run check:solutions
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compareOutput } from "../src/checker/compare.ts";
import { testNames } from "../src/checker/submit.ts";
import type { Challenge, Language } from "../src/content/types.ts";
import { loadAllChallenges } from "../vite-plugin-challenges.ts";
import { createHarness } from "./pyodide-harness.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runTest = await createHarness();

/** Returns a description of each failing test (empty if all pass). */
function failures(code: string, challenge: Challenge): string[] {
  const names = testNames(challenge.tests);
  return challenge.tests.flatMap((test, i) => {
    const run = runTest(code, test.input);
    if (run.status === "error") return [`${names[i]}: ${run.error.type}: ${run.error.message}`];
    if (run.status === "input-exhausted") return [`${names[i]}: asked for more input than the test gives`];
    if (run.status === "step-limit") return [`${names[i]}: didn't finish (possible infinite loop)`];
    const comparison = compareOutput(test.output, run.output);
    if (comparison.passed) return [];
    const line = comparison.firstDifference ?? 0;
    return [
      `${names[i]}: line ${line + 1}: expected ${JSON.stringify(comparison.expected[line] ?? "(nothing)")}, ` +
        `got ${JSON.stringify(comparison.actual[line] ?? "(nothing)")}`,
    ];
  });
}

const challenges = await loadAllChallenges(path.join(ROOT, "challenges"));
const languages: Language[] = ["python"];
const problems = new Set<string>();

for (const challenge of challenges) {
  for (const language of languages) {
    const variant = challenge.variants[language];
    if (!variant) continue;

    const solutionFailures = failures(variant.solution, challenge);
    const starterPasses = failures(variant.starter, challenge).length === 0;
    const ok = solutionFailures.length === 0 && !starterPasses;

    console.log(`${ok ? "✓" : "✗"} ${challenge.id} (${language}): ${challenge.tests.length} tests`);
    for (const failure of solutionFailures) console.log(`    solution fails ${failure}`);
    if (starterPasses) console.log("    starter code already passes every test");
    if (!ok) problems.add(`${challenge.id}/${language}`);
  }
}

if (problems.size > 0) {
  console.error(`\n${problems.size} challenge(s) need attention.`);
  process.exit(1);
}
console.log(`\nAll ${challenges.length} challenges OK.`);
