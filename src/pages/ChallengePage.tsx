import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { challengeNumber, challenges, getChallenge } from "../content/challenges";
import type { Challenge, TestCase } from "../content/types";
import { CodeEditor, type LineNote } from "../components/CodeEditor";
import { explainError } from "../explain/explain";
import { notesFor } from "../explain/notes";
import { HintNotes } from "../components/HintNotes";
import { DifficultyBadge, TopicTags } from "../components/Labels";
import { OutputPanel, type ResultsTab } from "../components/OutputPanel";
import { Tabs, tabPanelProps } from "../components/Tabs";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { usePythonRun } from "../hooks/usePythonRun";
import { useSubmission } from "../hooks/useSubmission";
import { progressStore, useChallengeProgress } from "../progress/useProgress";
import { TestResults } from "../components/TestResults";
import type { RuntimeState } from "../runners/types";
import { NotFoundPage } from "./NotFoundPage";
import styles from "./ChallengePage.module.css";

type Section = "problem" | "code" | "output";
const SECTIONS = [
  { id: "problem", label: "Problem" },
  { id: "code", label: "Code" },
  { id: "output", label: "Output" },
] as const;

type SideTab = "statement" | "walkthrough";
const SIDE_TABS = [
  { id: "statement", label: "Task" },
  { id: "walkthrough", label: "Walkthrough" },
] as const;

const pad = (n: number) => String(n).padStart(2, "0");

export function ChallengePage() {
  const { id = "" } = useParams();
  const challenge = getChallenge(id);
  if (!challenge) return <NotFoundPage message={`There's no challenge called "${id}".`} />;
  if (!challenge.variants.python) return <NotFoundPage message="This challenge doesn't have a Python version yet." />;
  // A new key resets all state (code, hints, tabs) when moving between challenges.
  return <Workspace key={challenge.id} challenge={challenge} />;
}

const LANGUAGE = "python";

function Workspace({ challenge }: { challenge: Challenge }) {
  const variant = challenge.variants.python!;
  // Below 64rem the three sections become tabs instead of side-by-side columns.
  const narrow = useMediaQuery("(max-width: 63.99rem)");
  const [section, setSection] = useState<Section>("problem");
  const [sideTab, setSideTab] = useState<SideTab>("statement");

  // ---- Saved progress ------------------------------------------------------------
  const progress = useChallengeProgress(challenge.id, LANGUAGE);
  const solved = progress.solvedAt !== undefined;
  // Once solved, the walkthrough is no longer a spoiler.
  const walkthroughShown = progress.walkthroughShown || solved;
  const [code, setCode] = useState(() => progressStore.get(challenge.id, LANGUAGE).code ?? variant.starter);

  useEffect(() => {
    progressStore.markOpened(challenge.id, LANGUAGE);
  }, [challenge.id]);

  const [resultsTab, setResultsTab] = useState<ResultsTab>("output");
  const python = usePythonRun();
  const submission = useSubmission(challenge.tests);
  const busy = python.phase !== "idle" || submission.marking;
  const canRun = python.runtime.status === "ready" && !busy;
  const stop = submission.marking ? submission.cancel : python.stop;
  const busyLabel = submission.marking
    ? `Marking test ${Math.min(submission.progress.length + 1, challenge.tests.length)} of ${challenge.tests.length}…`
    : python.phase === "waiting-input"
      ? "Waiting for your input…"
      : python.phase === "running"
        ? "Running…"
        : null;

  // ---- Error explanations ------------------------------------------------------
  const [notes, setNotes] = useState<LineNote[]>([]);
  const runError = python.result?.error ?? null;
  const runExplanation = useMemo(
    () => (runError ? explainError(runError, python.ranCode) : null),
    [runError, python.ranCode],
  );

  // A finished Run: show its error (if any) on the code.
  useEffect(() => {
    setNotes(runExplanation && runError ? notesFor(runExplanation, runError) : []);
  }, [runExplanation, runError]);

  // A finished Submit: show the first test error (if any) on the code.
  useEffect(() => {
    if (!submission.report) return;
    const first = submission.report.reports.find((r) => r.outcome.status === "error")?.outcome;
    setNotes(
      first?.status === "error" ? notesFor(explainError(first.error, submission.submittedCode), first.error) : [],
    );
  }, [submission.report, submission.submittedCode]);

  // Notes describe the code as it was run, so editing clears them.
  const changeCode = (value: string) => {
    setCode(value);
    setNotes([]);
    progressStore.saveCode(challenge.id, LANGUAGE, value, variant.starter);
  };

  const run = () => {
    if (!canRun) return;
    setResultsTab("output");
    if (narrow) setSection("output");
    void python.run(code);
  };

  const submit = async () => {
    if (!canRun) return;
    setResultsTab("tests");
    if (narrow) setSection("output");
    const report = await submission.submit(code);
    if (report && !report.cancelled) {
      progressStore.recordSubmission(challenge.id, LANGUAGE, report.passed, report.total);
    }
  };

  const showWalkthrough = () => {
    setSideTab("walkthrough");
    if (narrow) setSection("problem");
  };

  // Ctrl/Cmd+Enter anywhere on the page (the editor handles it itself first).
  // Re-subscribes each render so it always calls the latest `run`.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.defaultPrevented) {
        event.preventDefault();
        run();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const number = challengeNumber(challenge);
  const prev = challenges[number - 2];
  const next = challenges[number];
  const sectionProps = (id: Section) =>
    narrow ? tabPanelProps("section", id, section) : { "aria-label": SECTIONS.find((s) => s.id === id)!.label };

  const reset = () => {
    if (
      code === variant.starter ||
      window.confirm("Reset the editor to the starter code? Your saved changes will be lost (a solved challenge stays solved).")
    ) {
      setCode(variant.starter);
    }
  };

  return (
    <div className={styles.page}>
      <title>{`${challenge.title} · Tracewise`}</title>

      <header className={styles.head}>
        <nav aria-label="Breadcrumb" className={styles.crumbs}>
          <Link to="/challenges">Challenges</Link>
          <span aria-hidden="true">/</span>
          <span>No. {pad(number)}</span>
        </nav>
        <div className={styles.titleRow}>
          <h1 className={styles.h1}>{challenge.title}</h1>
          <DifficultyBadge difficulty={challenge.difficulty} />
          <TopicTags topics={challenge.topics} />
          {solved && (
            <span className={styles.solvedStamp} title={`Solved on ${new Date(progress.solvedAt!).toLocaleDateString()}`}>
              Solved
            </span>
          )}
        </div>
      </header>

      {narrow && (
        <Tabs
          idBase="section"
          label="Challenge sections"
          tabs={SECTIONS}
          selected={section}
          onSelect={setSection}
          className={styles.sectionTabs}
        />
      )}

      <div className={styles.workspace}>
        <section className={styles.problem} {...sectionProps("problem")}>
          <Tabs idBase="side" label="Problem and walkthrough" tabs={SIDE_TABS} selected={sideTab} onSelect={setSideTab} />

          <div {...tabPanelProps("side", "statement", sideTab)} className={styles.statement}>
            <div className={styles.text}>
              <div className="prose" dangerouslySetInnerHTML={{ __html: challenge.descriptionHtml }} />
              <Examples tests={challenge.tests.filter((t) => t.visible)} />
            </div>
            <aside className={styles.margin} aria-label="Hints">
              <HintNotes
                hints={variant.hintsHtml}
                shown={progress.hintsShown}
                onShowMore={(count) => progressStore.setHintsShown(challenge.id, LANGUAGE, count)}
              />
            </aside>
          </div>

          <div {...tabPanelProps("side", "walkthrough", sideTab)} className={styles.walkthrough}>
            {walkthroughShown ? (
              <div className="prose" dangerouslySetInnerHTML={{ __html: variant.walkthroughHtml }} />
            ) : (
              <div className={styles.locked}>
                <span className="label">Walkthrough</span>
                <p>
                  This explains a full solution step by step. Try it yourself and use the hints first, or reveal it
                  whenever you're ready.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => progressStore.setWalkthroughShown(challenge.id, LANGUAGE)}
                >
                  Reveal the walkthrough
                </button>
              </div>
            )}
          </div>

          <nav className={styles.pager} aria-label="Other challenges">
            {prev && (
              <Link to={`/challenges/${prev.id}`} className={styles.prev}>
                <span className="label">Previous</span>
                {prev.title}
              </Link>
            )}
            {next && (
              <Link to={`/challenges/${next.id}`} className={styles.next}>
                <span className="label">Next</span>
                {next.title}
              </Link>
            )}
          </nav>
        </section>

        <section className={styles.code} {...sectionProps("code")}>
          <div className={styles.toolbar}>
            <div className={styles.runtime}>
              <span className={`label ${styles.language}`}>Python</span>
              <RuntimeStatus state={python.runtime} onRetry={python.retryLoad} />
            </div>
            <div className={styles.buttons}>
              {busy ? (
                <button type="button" className="btn btn-stop" onClick={stop}>
                  Stop
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={run} disabled={!canRun}>
                  Run
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => void submit()} disabled={!canRun}>
                Submit
              </button>
              <button type="button" className="btn btn-ghost" onClick={reset}>
                Reset
              </button>
            </div>
          </div>
          <CodeEditor
            value={code}
            onChange={changeCode}
            notes={notes}
            onRun={run}
            ariaLabel={`Python code for ${challenge.title}`}
          />
          <p className={styles.soon}>
            Run tries your program; Submit checks it against all {challenge.tests.length} tests.
          </p>
        </section>

        <section className={styles.output} {...sectionProps("output")}>
          <OutputPanel
            tab={resultsTab}
            onTabChange={setResultsTab}
            entries={python.entries}
            phase={python.phase}
            result={python.result}
            explanation={runExplanation}
            onSubmitInput={python.submitInput}
            busyLabel={busyLabel}
            onStop={narrow ? stop : undefined}
            testResults={
              <TestResults
                tests={challenge.tests}
                code={submission.submittedCode}
                marking={submission.marking}
                progress={submission.progress}
                report={submission.report}
                onShowWalkthrough={showWalkthrough}
              />
            }
          />
        </section>
      </div>
    </div>
  );
}

function RuntimeStatus({ state, onRetry }: { state: RuntimeState; onRetry: () => void }) {
  switch (state.status) {
    case "idle":
    case "loading":
      return (
        <span className={styles.status} role="status">
          Loading Python… the first time takes a few seconds
        </span>
      );
    case "ready":
      return (
        <span className={styles.status} role="status">
          {state.version} ready
        </span>
      );
    case "failed":
      return (
        <span className={`${styles.status} ${styles.statusFailed}`} role="alert">
          Python couldn't load. Check your connection.{" "}
          <button type="button" className="btn btn-ghost" onClick={onRetry}>
            Try again
          </button>
        </span>
      );
  }
}

function Examples({ tests }: { tests: TestCase[] }) {
  return (
    <div className={styles.examples}>
      {tests.map((test, i) => (
        <figure key={i} className={styles.example}>
          <figcaption className="label">Example {i + 1}</figcaption>
          <div className={styles.io}>
            <div>
              <span className={styles.ioLabel}>Input</span>
              <pre>{test.input.trimEnd()}</pre>
            </div>
            <div>
              <span className={styles.ioLabel}>Expected output</span>
              <pre>{test.output.trimEnd()}</pre>
            </div>
          </div>
        </figure>
      ))}
    </div>
  );
}
