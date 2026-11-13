/**
 * Runs every explainer rule's example programs through the real language
 * (Python 3.14 via Pyodide, C++ via Clang 22), and checks each one is
 * explained by the rule it belongs to. Catches regexes that drift from the
 * real error messages.
 * Run with: npm run check:explainer
 */
import type { Language } from "../src/content/types.ts";
import { CPP_RULES, explainFor, PYTHON_RULES } from "../src/explain/explain.ts";
import type { ExplainRule } from "../src/explain/types.ts";
import { createCppHarness } from "./cpp-harness.ts";
import { createHarness, type TestRun } from "./pyodide-harness.ts";

// Plenty of input, so examples that read input don't run out.
const STDIN = "3\n".repeat(10);

const runPython = await createHarness();
const runners: Record<Language, (code: string) => Promise<TestRun>> = {
  python: async (code) => runPython(code, STDIN),
  cpp: createCppHarness(),
};
const ruleSets: [Language, ExplainRule[]][] = [
  ["python", PYTHON_RULES],
  ["cpp", CPP_RULES],
];

let problems = 0;
let total = 0;

for (const [language, rules] of ruleSets) {
  for (const rule of rules) {
    total++;
    if (rule.examples.length === 0) {
      console.log(`✗ ${rule.id}: has no examples`);
      problems++;
      continue;
    }
    const failures: string[] = [];
    for (const code of rule.examples) {
      const result = await runners[language](code);
      const shown = JSON.stringify(code.length > 50 ? `…${code.slice(-50)}` : code);
      // Warning rules are checked against the compile warnings; the rest against the error.
      const candidates = rule.types.includes("CompileWarning")
        ? (result.warnings ?? [])
        : result.status === "error"
          ? [result.error]
          : [];
      if (candidates.length === 0) {
        failures.push(`${shown} gave no ${rule.types.join("/")} (status: ${result.status})`);
        continue;
      }
      const explained = candidates.map((error) => ({ error, id: explainFor(language, error, code).ruleId }));
      if (!explained.some((e) => e.id === rule.id)) {
        failures.push(explained.map((e) => `${shown} → ${e.error.type}: ${e.error.message} → ${e.id}`).join("; "));
      }
    }
    console.log(`${failures.length === 0 ? "✓" : "✗"} ${rule.id} (${rule.examples.length})`);
    for (const failure of failures) console.log(`    ${failure}`);
    problems += failures.length;
  }
}

if (problems > 0) {
  console.error(`\n${problems} problem(s).`);
  process.exit(1);
}
console.log(`\nAll ${total} rules match real errors.`);
