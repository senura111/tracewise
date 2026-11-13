import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Explanation } from "../explain/types";
import type { ConsoleEntry, RunPhase } from "../hooks/usePythonRun";
import { ErrorExplanation } from "./ErrorExplanation";
import { describeResult } from "../runners/messages";
import type { RunResult } from "../runners/types";
import { Tabs, tabPanelProps } from "./Tabs";
import styles from "./OutputPanel.module.css";

export type ResultsTab = "output" | "tests";
const TABS = [
  { id: "output", label: "Output" },
  { id: "tests", label: "Tests" },
] as const;

interface OutputPanelProps {
  tab: ResultsTab;
  onTabChange: (tab: ResultsTab) => void;
  entries: ConsoleEntry[];
  phase: RunPhase;
  result: RunResult | null;
  /** Explanation of the run's error, if it had one */
  explanation: Explanation | null;
  onSubmitInput: (line: string) => void;
  /** Content of the Tests tab */
  testResults: ReactNode;
  /** Shown with a Stop button on narrow screens, where the toolbar is on another tab */
  busyLabel?: string | null;
  onStop?: () => void;
}

/** Program output (with inline input) and the test results. */
export function OutputPanel({
  tab,
  onTabChange,
  entries,
  phase,
  result,
  explanation,
  onSubmitInput,
  testResults,
  busyLabel,
  onStop,
}: OutputPanelProps) {
  const consoleRef = useRef<HTMLDivElement>(null);

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

      {onStop && busyLabel && (
        <div className={styles.running}>
          <span>{busyLabel}</span>
          <button type="button" className="btn btn-stop" onClick={onStop}>
            Stop
          </button>
        </div>
      )}

      <div {...tabPanelProps("results", "output", tab)} className={styles.outputPanel}>
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
          {phase === "idle" && result && entries.length === 0 && (
            <p className={styles.placeholder}>Nothing was printed.</p>
          )}
        </div>
        {result?.error && explanation && <ErrorExplanation explanation={explanation} error={result.error} />}
        {summary && result?.status !== "error" && (
          <p className={styles.summary} data-tone={summary.tone} role="status">
            {summary.text}
          </p>
        )}
      </div>

      <div {...tabPanelProps("results", "tests", tab)}>{testResults}</div>
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
