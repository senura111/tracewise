import styles from "./Mark.module.css";

export type MarkState = "pass" | "fail" | "blank";

const LABELS: Record<MarkState, string> = { pass: "passed", fail: "failed", blank: "not marked yet" };

/** A pen mark for the worksheet: a tick, a cross, or an empty box. */
export function Mark({ state, label = LABELS[state] }: { state: MarkState; label?: string }) {
  return (
    <svg className={styles[state]} viewBox="0 0 24 24" role="img" aria-label={label}>
      {state === "pass" && <path d="M3 13.5 9 19 21.5 5" />}
      {state === "fail" && <path d="M5 5.5 19 19M19 5 5 18.5" />}
      {state === "blank" && <rect x="4" y="4" width="16" height="16" />}
    </svg>
  );
}
