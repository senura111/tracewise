import { useState } from "react";
import type { TestCase } from "../content/types";
import { Mark } from "./Mark";
import { Tabs, tabPanelProps } from "./Tabs";
import styles from "./OutputPanel.module.css";

type Tab = "output" | "tests";
const TABS = [
  { id: "output", label: "Output" },
  { id: "tests", label: "Tests" },
] as const;

/** Program output and the marked test worksheet. Running arrives in Phase 2. */
export function OutputPanel({ tests }: { tests: TestCase[] }) {
  const [tab, setTab] = useState<Tab>("output");
  let example = 0;
  let hidden = 0;
  const rows = tests.map((t) => (t.visible ? `Example ${++example}` : `Hidden test ${++hidden}`));

  return (
    <div className={styles.panel}>
      <Tabs idBase="results" label="Results" tabs={TABS} selected={tab} onSelect={setTab} />

      <div {...tabPanelProps("results", "output", tab)} className={styles.console}>
        <p className={styles.placeholder}>Press Run to see what your program prints.</p>
      </div>

      <div {...tabPanelProps("results", "tests", tab)} className={styles.worksheet}>
        <div className={styles.head}>
          <span className="label">Test results</span>
          <span className={styles.score} aria-label="Not marked yet">
            –/{tests.length}
          </span>
        </div>
        <ol className={styles.rows}>
          {rows.map((name) => (
            <li key={name} className={styles.row}>
              <Mark state="blank" />
              {name}
            </li>
          ))}
        </ol>
        <p className={styles.foot}>Press Submit to mark your work against all {tests.length} tests.</p>
      </div>
    </div>
  );
}
