import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { challengeNumber, challenges, getChallenge } from "../content/challenges";
import type { Challenge, Language, TestCase } from "../content/types";
import { CodeEditor, type LineNote } from "../components/CodeEditor";
import { explainFor, explainWarnings } from "../explain/explain";
import { notesFor } from "../explain/notes";
import { HintNotes } from "../components/HintNotes";
import { DifficultyBadge, TopicTags } from "../components/Labels";
import { OutputPanel, type ResultsTab } from "../components/OutputPanel";
import { Tabs, tabPanelProps } from "../components/Tabs";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useRun } from "../hooks/useRun";
import { useSubmission } from "../hooks/useSubmission";
import { progressStore, useChallengeProgress } from "../progress/useProgress";
import { TestResults } from "../components/TestResults";
import { LANGUAGE_NAMES } from "../runners";
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
  const [params, setParams] = useSearchParams();
  const challenge = getChallenge(id);
  if (!challenge) return <NotFoundPage message={`There's no challenge called "${id}".`} />;

  // The language lives in the URL (?lang=cpp); fall back to one the challenge has.
  const wanted: Language = params.get("lang") === "cpp" ? "cpp" : "python";
  const language: Language = challenge.variants[wanted] ? wanted : challenge.variants.python ? "python" : "cpp";
  const switchLanguage = (next: Language) => setParams(next === "python" ? {} : { lang: next }, { replace: true });

  // A new key resets all state (code, hints, tabs) when moving between challenges or languages.
  return (
    <Workspace
      key={`${challenge.id}:${language}`}
      challenge={challenge}
      language={language}
      onLanguageChange={switchLanguage}
    />
  );
}

interface WorkspaceProps {
  challenge: Challenge;
  language: Language;
  onLanguageChange: (language: Language) => void;
}

function Workspace({ challenge, language, onLanguageChange }: WorkspaceProps) {
  const variant = challenge.variants[language]!;
  // Below 64rem the three sections become tabs instead of side-by-side columns.
  const narrow = useMediaQuery("(max-width: 63.99rem)");
  const [section, setSection] = useState<Section>("problem");
  const [sideTab, setSideTab] = useState<SideTab>("statement");

  // ---- Saved progress ------------------------------------------------------------
  const progress = useChallengeProgress(challenge.id, language);
  const solved = progress.solvedAt !== undefined;
  // Once solved, the walkthrough is no longer a spoiler.
  const walkthroughShown = progress.walkthroughShown || solved;
  const [code, setCode] = useState(() => progressStore.get(challenge.id, language).code ?? variant.starter);

  useEffect(() => {
    progressStore.markOpened(challenge.id, language);
  }, [challenge.id]);

  const [resultsTab, setResultsTab] = useState<ResultsTab>("output");
  const execution = useRun(language);
  const submission = useSubmission(challenge.tests, language);
  const busy = execution.phase !== "idle" || submission.marking;
  // Running is allowed while the runtime is still loading: the run waits for it.
  const canRun = execution.runtime.status !== "failed" && !busy;
  const stop = submission.marking ? submission.cancel : execution.stop;
  const busyLabel = submission.marking
    ? `Marking test ${Math.min(submission.progress.length + 1, challenge.tests.length)} of ${challenge.tests.length}…`
    : execution.phase === "compiling"
      ? "Compiling…"
      : execution.phase === "waiting-input"
      ? "Waiting for your input…"
      : execution.phase === "running"
        ? "Running…"
        : null;

  // ---- Error explanations ------------------------------------------------------
  const [notes, setNotes] = useState<LineNote[]>([]);
  const runError = execution.result?.error ?? null;
  const runExplanation = useMemo(
    () => (runError ? explainFor(language, runError, execution.ranCode) : null),
    [language, runError, execution.ranCode],
  );
  // C++: compiler warnings that have an explanation (others would just be noise).
  const runWarnings = useMemo(
    () => explainWarnings(language, execution.result?.warnings, execution.ranCode),
    [language, execution.result, execution.ranCode],
  );

  // A finished Run: show its error, or its warnings, on the code.
  useEffect(() => {
    if (runExplanation && runError) setNotes(notesFor(runExplanation, runError));
    else setNotes(runWarnings.flatMap(({ warning, explanation }) => notesFor(explanation, warning)));
  }, [runExplanation, runError, runWarnings]);

  // A finished Submit: show the first test error (if any) on the code.
  useEffect(() => {
    if (!submission.report) return;
    const first = submission.report.reports.find((r) => r.outcome.status === "error")?.outcome;
    setNotes(
      first?.status === "error" ? notesFor(explainFor(language, first.error, submission.submittedCode), first.error) : [],
    );
  }, [language, submission.report, submission.submittedCode]);

  // Notes describe the code as it was run, so editing clears them.
  const changeCode = (value: string) => {
    setCode(value);
    setNotes([]);
    progressStore.saveCode(challenge.id, language, value, variant.starter);
  };

  const run = () => {
    if (!canRun) return;
    setResultsTab("output");
    if (narrow) setSection("output");
    void execution.run(code);
  };

  const submit = async () => {
    if (!canRun) return;
    setResultsTab("tests");
    if (narrow) setSection("output");
    const report = await submission.submit(code);
    if (report && !report.cancelled) {
      progressStore.recordSubmission(challenge.id, language, report.passed, report.total);
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
                onShowMore={(count) => progressStore.setHintsShown(challenge.id, language, count)}
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
                  onClick={() => progressStore.setWalkthroughShown(challenge.id, language)}
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
              <LanguageSwitch challenge={challenge} language={language} onChange={onLanguageChange} />
              <RuntimeStatus language={language} state={execution.runtime} onRetry={execution.retryLoad} />
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
            language={language}
            ariaLabel={`${LANGUAGE_NAMES[language]} code for ${challenge.title}`}
          />
          <p className={styles.soon}>
            Run tries your program; Submit checks it against all {challenge.tests.length} tests.
          </p>
        </section>

        <section className={styles.output} {...sectionProps("output")}>
          <OutputPanel
            tab={resultsTab}
            onTabChange={setResultsTab}
            entries={execution.entries}
            phase={execution.phase}
            result={execution.result}
            explanation={runExplanation}
            warnings={runWarnings}
            onSubmitInput={execution.submitInput}
            busyLabel={busyLabel}
            onStop={narrow ? stop : undefined}
            testResults={
              <TestResults
                tests={challenge.tests}
                language={language}
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

function LanguageSwitch({
  challenge,
  language,
  onChange,
}: {
  challenge: Challenge;
  language: Language;
  onChange: (language: Language) => void;
}) {
  const languages = (["python", "cpp"] as const).filter((l) => challenge.variants[l]);
  return (
    <div className={styles.langSwitch} role="group" aria-label="Language">
      {languages.map((l) => (
        <button key={l} type="button" aria-pressed={l === language} onClick={() => l !== language && onChange(l)}>
          {LANGUAGE_NAMES[l]}
        </button>
      ))}
    </div>
  );
}

/** Seconds since the component started showing, ticking once a second. */
function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    setSeconds(0);
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return seconds;
}

function RuntimeStatus({ language, state, onRetry }: { language: Language; state: RuntimeState; onRetry: () => void }) {
  const loading = state.status === "idle" || state.status === "loading";
  const seconds = useElapsedSeconds(loading);
  switch (state.status) {
    case "idle":
    case "loading":
      return (
        <span className={styles.status} role="status">
          {language === "cpp"
            ? `Preparing the C++ compiler… ${seconds} s (takes about 20–30 s on each visit)`
            : "Loading Python… the first time takes a few seconds"}
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
          {language === "cpp" ? "The C++ compiler" : "Python"} couldn't load. Check your connection.{" "}
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
