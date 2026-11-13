/**
 * Runs every explainer rule's example programs through real Python (Pyodide in
 * Node) and checks that each one is explained by the rule it belongs to.
 * Catches regexes that drift from Python's actual error messages.
 * Run with: npm run check:explainer
 */
import { explainError, PYTHON_RULES } from "../src/explain/explain.ts";
import { createHarness } from "./pyodide-harness.ts";

// Plenty of input, so examples that call input() don't run out.
const STDIN = "3\n".repeat(10);

const run = await createHarness();
let problems = 0;

for (const rule of PYTHON_RULES) {
  if (rule.examples.length === 0) {
    console.log(`✗ ${rule.id}: has no examples`);
    problems++;
    continue;
  }
  const failures = rule.examples.flatMap((code) => {
    const result = run(code, STDIN);
    const shown = JSON.stringify(code.length > 40 ? `${code.slice(0, 40)}…` : code);
    if (result.status !== "error") return [`${shown} didn't raise an error (${result.status})`];
    const explanation = explainError(result.error, code);
    return explanation.ruleId === rule.id
      ? []
      : [`${shown} → ${result.error.type}: ${result.error.message} → explained by ${explanation.ruleId}`];
  });
  console.log(`${failures.length === 0 ? "✓" : "✗"} ${rule.id} (${rule.examples.length})`);
  for (const failure of failures) console.log(`    ${failure}`);
  problems += failures.length;
}

if (problems > 0) {
  console.error(`\n${problems} problem(s).`);
  process.exit(1);
}
console.log(`\nAll ${PYTHON_RULES.length} rules match real Python errors.`);
