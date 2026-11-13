import { useEffect, useRef, useState, type FormEvent } from "react";
import type { TestCase } from "../content/types";
import type { ConsoleEntry, RunPhase } from "../hooks/usePythonRun";
import { describeResult } from "../runners/messages";
import type { RunResult } from "../runners/types";
import { Mark } from "./Mark";
import { Tabs, tabPanelProps } from "./Tabs";
import styles from "./OutputPanel.module.css";

export type ResultsTab = "output" | "tests";
const TABS = [
  { id: "output", label: "Output" },
  { id: "tests", label: "Tests" },
] as const;

interface OutputPanelProps {
  tests: TestCase[];
  tab: ResultsTab;
  onTabChange: (tab: ResultsTab) => void;
  entries: ConsoleEntry[];
  phase: RunPhase;
  result: RunResult | null;
  onSubmitInput: (line: string) => void;
  /** Shown on narrow screens, where the toolbar is on another tab */
  onStop?: () => void;
}

/** Program output (with inline input) and the marked test worksheet. */
export function OutputPanel({
  tests,
  tab,
  onTabChange,
  entries,
  phase,
  result,
  onSubmitInput,
  onStop,
}: OutputPanelProps) {
  const consoleRef = useRef<HTMLDivElement>(null);
  let example = 0;
  let hidden = 0;
  const rows = tests.map((t) => (t.visible ? `Example ${++example}` : `Hidden test ${++hidden}`));

  // Keep the newest output in view.
  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, phase, result]);

  const summary = result ? describeResult(result) : null;
  const isEmpty = entries.length === 0 && phase === "idle" && !result;

  return (
    <div className={styles.panel}>
      <Tabs idBase="results" label="Results" tabs={TABS} selected={tab} onSelect={onTabChange} />

      <div {...tabPanelProps("results", "output", tab)} className={styles.outputPanel}>
        {onStop && phase !== "idle" && (
          <div className={styles.running}>
            <span>{phase === "waiting-input" ? "Waiting for your input…" : "Running…"}</span>
            <button type="button" className="btn btn-stop" onClick={onStop}>
              Stop
            </button>
          </div>
        )}
        <div ref={consoleRef} className={styles.console} role="log" aria-label="Program output">
          {isEmpty && <p className={styles.placeholder}>Press Run to see what your program prints.</p>}
          {(entries.length > 0 || phase === "waiting-input") && (
            <pre className={styles.stream}>
              {entries.map((entry, i) => (
                <span key={i} className={styles[entry.kind]}>
                  {entry.text}
                </span>
              ))}
              {phase === "waiting-input" && <InputLine onSubmit={onSubmitInput} />}
            </pre>
          )}
          {phase === "running" && entries.length === 0 && <p className={styles.placeholder}>Running…</p>}
          {result?.error?.traceback && <pre className={styles.traceback}>{result.error.traceback}</pre>}
        </div>
        {summary && (
          <p className={styles.summary} data-tone={summary.tone} role="status">
            {summary.text}
          </p>
        )}
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
        <p className={styles.foot}>Submit (coming next) will mark your work against all {tests.length} tests.</p>
      </div>
    </div>
  );
}

function InputLine({ onSubmit }: { onSubmit: (line: string) => void }) {
  const [value, setValue] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(value);
  };
  return (
    <form className={styles.inputForm} onSubmit={submit}>
      <input
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Type your program's input and press Enter"
        autoFocus
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <span className={styles.inputHint} aria-hidden="true">
        ↵ Enter
      </span>
    </form>
  );
}
