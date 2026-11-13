import { useState } from "react";
import type { Comparison } from "../checker/compare";
import { TEST_TIME_LIMIT_MS, testNames, type SubmissionReport, type TestReport } from "../checker/submit";
import type { TestCase } from "../content/types";
import { inputExhaustedMessage } from "../runners/messages";
import { Mark, type MarkState } from "./Mark";
import styles from "./TestResults.module.css";

interface TestResultsProps {
  tests: TestCase[];
  marking: boolean;
  progress: TestReport[];
  report: SubmissionReport | null;
  onShowWalkthrough: () => void;
}

/** The marked worksheet: a tick or cross per test, with details for failures. */
export function TestResults({ tests, marking, progress, report, onShowWalkthrough }: TestResultsProps) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const names = testNames(tests);
  const reports = report?.reports ?? progress;
  const seconds = TEST_TIME_LIMIT_MS / 1000;

  return (
    <div className={styles.worksheet}>
      <div className={styles.head}>
        <span className="label">Test results</span>
        <Score marking={marking} done={progress.length} report={report} total={tests.length} />
      </div>

      {marking && (
        <p className={styles.status} role="status">
          Marking test {Math.min(progress.length + 1, tests.length)} of {tests.length}…
        </p>
      )}
      {report?.solved && (
        <div className={styles.solved} role="status">
          <span className={styles.stamp}>Solved</span>
          <p>
            All {tests.length} tests passed. Well done!{" "}
            <button type="button" className="btn btn-ghost" onClick={onShowWalkthrough}>
              Compare with the walkthrough
            </button>
          </p>
        </div>
      )}
      {report && !report.solved && (
        <p className={styles.status} role="status">
          {report.cancelled
            ? "Marking stopped."
            : report.reports.some((r) => r.outcome.status === "timeout")
              ? `${report.passed} of ${report.total} tests passed. One test ran too long, so the rest weren't run. Fix that first.`
              : `${report.passed} of ${report.total} tests passed. Fix the crossed-out ones and submit again.`}
        </p>
      )}

      <ol className={styles.rows}>
        {tests.map((test, i) => {
          const entry = reports[i];
          const isHidden = !test.visible;
          const showDetails = !isHidden || revealed.has(i);
          const running = marking && i === progress.length;
          return (
            <li key={i} className={styles.row}>
              <div className={styles.rowHead}>
                <Mark state={markState(entry)} label={entry ? undefined : running ? "running" : "not marked yet"} />
                <span className={styles.name}>{names[i]}</span>
                <span className={styles.summary}>{running ? "Running…" : entry ? summary(entry, seconds) : ""}</span>
                {entry && isHidden && needsDetails(entry) && !revealed.has(i) && (
                  <button
                    type="button"
                    className={`btn btn-ghost ${styles.reveal}`}
                    onClick={() => setRevealed(new Set(revealed).add(i))}
                  >
                    Reveal this test
                  </button>
                )}
              </div>
              {entry && needsDetails(entry) && showDetails && <Details report={entry} seconds={seconds} />}
            </li>
          );
        })}
      </ol>
      {!report && !marking && (
        <p className={styles.foot}>Press Submit to mark your work against all {tests.length} tests.</p>
      )}
    </div>
  );
}

function Score({
  marking,
  done,
  report,
  total,
}: {
  marking: boolean;
  done: number;
  report: SubmissionReport | null;
  total: number;
}) {
  if (report) {
    return (
      <span
        className={styles.score}
        data-state={report.solved ? "solved" : "partial"}
        aria-label={`${report.passed} of ${total} tests passed`}
      >
        {report.passed}/{total}
      </span>
    );
  }
  return (
    <span className={styles.score} aria-label={marking ? `${done} of ${total} tests marked` : "Not marked yet"}>
      {marking ? done : "–"}/{total}
    </span>
  );
}

function markState(report: TestReport | undefined): MarkState {
  if (!report) return "blank";
  if (report.outcome.status === "passed") return "pass";
  if (report.outcome.status === "not-run") return "blank";
  return "fail";
}

const needsDetails = (report: TestReport) => !["passed", "not-run"].includes(report.outcome.status);

function summary({ outcome }: TestReport, seconds: number): string {
  switch (outcome.status) {
    case "passed":
      return "Passed";
    case "failed":
      return "Wrong output";
    case "error":
      return `${outcome.error.type}${outcome.error.line ? ` on line ${outcome.error.line}` : ""}`;
    case "timeout":
      return `Still running after ${seconds} s`;
    case "input-exhausted":
      return "Asked for too much input";
    case "output-limit":
      return "Printed far too much";
    case "crashed":
      return "Python stopped unexpectedly";
    case "not-run":
      return outcome.reason === "timeout" ? "Not run: an earlier test ran too long" : "Not run";
  }
}

function Details({ report, seconds }: { report: TestReport; seconds: number }) {
  const { outcome, test } = report;
  return (
    <div className={styles.details}>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>Input</span>
        <pre className={styles.pre}>{test.input.trimEnd() || "(no input)"}</pre>
      </div>
      {outcome.status === "failed" && <OutputDiff comparison={outcome.comparison} />}
      {outcome.status === "failed" && outcome.comparison.note && (
        <p className={styles.note}>{outcome.comparison.note}</p>
      )}
      {outcome.status === "error" && <pre className={`${styles.pre} ${styles.traceback}`}>{outcome.error.traceback}</pre>}
      {outcome.status === "timeout" && (
        <p className={styles.note}>
          Your program was still running after {seconds} seconds on this input. Is there a loop whose condition never
          becomes false?
        </p>
      )}
      {outcome.status === "input-exhausted" && (
        <p className={styles.note}>{inputExhaustedMessage(outcome.linesProvided)}</p>
      )}
      {outcome.status === "output-limit" && (
        <p className={styles.note}>Your program printed far too much. Is something printing inside a loop that never ends?</p>
      )}
      {outcome.status === "crashed" && (
        <p className={styles.note}>The Python runtime stopped unexpectedly and was restarted. Try submitting again.</p>
      )}
    </div>
  );
}

function OutputDiff({ comparison }: { comparison: Comparison }) {
  const { expected, actual, firstDifference } = comparison;
  const missing = firstDifference !== null && firstDifference >= actual.length;
  return (
    <div className={styles.diff}>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>Expected</span>
        <pre className={styles.pre}>
          {expected.map((line, i) => (
            <span key={i} className={i === firstDifference ? `${styles.line} ${styles.expectedMark}` : styles.line}>
              {line || " "}
            </span>
          ))}
        </pre>
      </div>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>Your output</span>
        <pre className={styles.pre}>
          {actual.map((line, i) => {
            // Mark the first wrong line, and any extra lines after the expected ones.
            const marked = firstDifference !== null && (i === firstDifference || i >= expected.length);
            return (
              <span key={i} className={marked ? `${styles.line} ${styles.actualMark}` : styles.line}>
                {line || " "}
              </span>
            );
          })}
          {missing && <span className={`${styles.line} ${styles.missing}`}>(missing)</span>}
        </pre>
      </div>
    </div>
  );
}
