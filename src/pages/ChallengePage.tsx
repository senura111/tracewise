import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { challengeNumber, challenges, getChallenge } from "../content/challenges";
import type { Challenge, TestCase } from "../content/types";
import { CodeEditor } from "../components/CodeEditor";
import { HintNotes } from "../components/HintNotes";
import { DifficultyBadge, TopicTags } from "../components/Labels";
import { OutputPanel, type ResultsTab } from "../components/OutputPanel";
import { Tabs, tabPanelProps } from "../components/Tabs";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { usePythonRun } from "../hooks/usePythonRun";
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

function Workspace({ challenge }: { challenge: Challenge }) {
  const variant = challenge.variants.python!;
  // Below 64rem the three sections become tabs instead of side-by-side columns.
  const narrow = useMediaQuery("(max-width: 63.99rem)");
  const [section, setSection] = useState<Section>("problem");
  const [sideTab, setSideTab] = useState<SideTab>("statement");
  const [walkthroughShown, setWalkthroughShown] = useState(false);
  const [code, setCode] = useState(variant.starter);
  const [resultsTab, setResultsTab] = useState<ResultsTab>("output");
  const python = usePythonRun();
  const busy = python.phase !== "idle";
  const canRun = python.runtime.status === "ready" && !busy;

  const run = () => {
    if (!canRun) return;
    setResultsTab("output");
    if (narrow) setSection("output");
    void python.run(code);
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
    if (code === variant.starter || window.confirm("Reset the editor to the starter code? Your changes will be lost.")) {
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
              <HintNotes hints={variant.hintsHtml} />
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
                <button type="button" className="btn btn-secondary" onClick={() => setWalkthroughShown(true)}>
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
                <button type="button" className="btn btn-stop" onClick={python.stop}>
                  Stop
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={run} disabled={!canRun}>
                  Run
                </button>
              )}
              <button type="button" className="btn btn-secondary" disabled aria-describedby="submit-soon">
                Submit
              </button>
              <button type="button" className="btn btn-ghost" onClick={reset}>
                Reset
              </button>
            </div>
          </div>
          <CodeEditor
            value={code}
            onChange={setCode}
            onRun={run}
            ariaLabel={`Python code for ${challenge.title}`}
          />
          <p id="submit-soon" className={styles.soon}>
            Submit, which checks your code against the tests, arrives in the next update.
          </p>
        </section>

        <section className={styles.output} {...sectionProps("output")}>
          <OutputPanel
            tests={challenge.tests}
            tab={resultsTab}
            onTabChange={setResultsTab}
            entries={python.entries}
            phase={python.phase}
            result={python.result}
            onSubmitInput={python.submitInput}
            onStop={narrow ? python.stop : undefined}
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
