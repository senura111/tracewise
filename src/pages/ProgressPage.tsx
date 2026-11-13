import { useRef, useState, type ChangeEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Mark, type MarkState } from "../components/Mark";
import { challengeNumber, challenges, groupByMainTopic } from "../content/challenges";
import { LANGUAGES, type Challenge, type Language } from "../content/types";
import { LANGUAGE_NAMES } from "../runners";
import type { ProgressData } from "../progress/store";
import { bestStreak, currentStreak, logbookWeeks } from "../progress/streak";
import { exportFileName, exportProgress, readImport, type ProgressSummary } from "../progress/transfer";
import { progressStore, statusOf, useProgressData } from "../progress/useProgress";
import styles from "./ProgressPage.module.css";

const MARKS: Record<ReturnType<typeof statusOf>, MarkState> = { solved: "pass", started: "started", new: "blank" };
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

type Dialog = { kind: "reset" } | { kind: "import"; data: ProgressData; summary: ProgressSummary } | null;

export function ProgressPage() {
  const data = useProgressData();
  const today = new Date();
  const [params, setParams] = useSearchParams();
  const language: Language = params.get("language") === "cpp" ? "cpp" : "python";
  const list = challenges.filter((c) => c.variants[language]);
  const progressOf = (c: Challenge) => data.challenges[c.id]?.[language];
  const linkTo = (c: Challenge) => `/challenges/${c.id}${language === "cpp" ? "?lang=cpp" : ""}`;
  const solved = list
    .filter((c) => progressOf(c)?.solvedAt)
    .sort((a, b) => progressOf(b)!.solvedAt!.localeCompare(progressOf(a)!.solvedAt!));

  const [dialog, setDialog] = useState<Dialog>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const exportFile = () => {
    const now = new Date();
    const url = URL.createObjectURL(new Blob([exportProgress(data, now)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFileName(now);
    link.click();
    URL.revokeObjectURL(url);
    setMessage({ tone: "ok", text: `Exported ${link.download}. Keep it somewhere safe to restore your progress later.` });
  };

  const chooseImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow choosing the same file again
    if (!file) return;
    const result = readImport(await file.text());
    if (result.ok) {
      setMessage(null);
      setDialog({ kind: "import", data: result.data, summary: result.summary });
    } else {
      setMessage({ tone: "error", text: result.error });
    }
  };

  const confirm = () => {
    if (dialog?.kind === "import") {
      progressStore.replaceAll(dialog.data);
      setMessage({ tone: "ok", text: `Progress imported: ${plural(dialog.summary.solved, "solved challenge")}.` });
    } else if (dialog?.kind === "reset") {
      progressStore.reset();
      setMessage({ tone: "ok", text: "Progress reset. Everything in this browser starts fresh." });
    }
    setDialog(null);
  };

  return (
    <div className={styles.page}>
      <title>Progress · Tracewise</title>

      <header className={styles.head}>
        <h1 className={styles.h1}>Progress</h1>
        <div className={styles.langSwitch} role="group" aria-label="Language">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={l === language}
              onClick={() => setParams(l === "python" ? {} : { language: l }, { replace: true })}
            >
              {LANGUAGE_NAMES[l]}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <button type="button" className="btn btn-secondary" onClick={exportFile}>
            Export
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => fileInput.current?.click()}>
            Import
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => void chooseImport(e)}
          />
          <button type="button" className="btn btn-ghost" onClick={() => setDialog({ kind: "reset" })}>
            Reset…
          </button>
        </div>
      </header>

      {message && (
        <p className={styles.message} data-tone={message.tone} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}
      {!progressStore.persistent && (
        <p className={styles.message} data-tone="error" role="note">
          This browser isn't letting Tracewise save, so your progress will be lost when you close the page. Use Export to
          keep a copy.
        </p>
      )}

      <section className={styles.sheet} aria-label="Summary">
        <div className={styles.cell}>
          <span className="label">Solved</span>
          <p className={styles.big}>
            {solved.length}
            <span className={styles.outOf}> / {list.length}</span>
          </p>
          <ol className={styles.boxes} aria-label="Every challenge">
            {list.map((c) => (
              <li key={c.id}>
                <Link to={linkTo(c)} title={c.title} className={styles.box}>
                  <Mark state={MARKS[statusOf(progressOf(c))]} label={`${c.title}: ${statusOf(progressOf(c))}`} />
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <div className={styles.cell}>
          <span className="label">Streak</span>
          <p className={styles.big}>
            {currentStreak(data.activity, today)}
            <span className={styles.outOf}> {currentStreak(data.activity, today) === 1 ? "day" : "days"}</span>
          </p>
          <p className={styles.small}>
            Best: {plural(bestStreak(data.activity), "day")}. A day counts when you submit at least once.
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="by-topic">
        <h2 id="by-topic" className={`label ${styles.sectionTitle}`}>
          By topic
        </h2>
        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <tbody>
            {groupByMainTopic(list).map((group) => {
              const done = group.challenges.filter((c) => progressOf(c)?.solvedAt).length;
              return (
                <tr key={group.topic}>
                  <th scope="row">{group.topic}</th>
                  <td>
                    <span className={styles.bar} aria-hidden="true">
                      {group.challenges.map((c) => (
                        <span key={c.id} className={progressOf(c)?.solvedAt ? styles.barFilled : styles.barEmpty} />
                      ))}
                    </span>
                  </td>
                  <td className={styles.num}>
                    {done}/{group.challenges.length}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="logbook">
        <h2 id="logbook" className={`label ${styles.sectionTitle}`}>
          Logbook · last 6 weeks
        </h2>
        <div className={styles.logbook} role="table" aria-label="Days you submitted code">
          <div role="row" className={styles.logRow}>
            {WEEKDAYS.map((d) => (
              <span key={d} role="columnheader" className={styles.weekday}>
                {d[0]}
                <span className="visually-hidden">{d.slice(1)}</span>
              </span>
            ))}
          </div>
          {logbookWeeks(data.activity, today).map((week) => (
            <div role="row" key={week[0].date} className={styles.logRow}>
              {week.map((day) => (
                <span
                  key={day.date}
                  role="cell"
                  className={styles.day}
                  data-active={day.active || undefined}
                  data-today={day.isToday || undefined}
                  data-future={day.isFuture || undefined}
                  title={day.date}
                >
                  {day.active ? <Mark state="pass" label={`${day.date}: submitted`} /> : <span className="visually-hidden">{day.date}</span>}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="solved">
        <h2 id="solved" className={`label ${styles.sectionTitle}`}>
          Solved
        </h2>
        {solved.length === 0 ? (
          <p className={styles.small}>
            Nothing solved yet. {list[0] && <Link to={linkTo(list[0])}>Start with challenge 1</Link>}.
          </p>
        ) : (
          <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.solvedTable}`}>
            <thead>
              <tr>
                <th scope="col">No.</th>
                <th scope="col">Challenge</th>
                <th scope="col">Solved</th>
                <th scope="col">Submits</th>
                <th scope="col">Hints</th>
              </tr>
            </thead>
            <tbody>
              {solved.map((c) => {
                const p = progressOf(c)!;
                return (
                  <tr key={c.id}>
                    <td className={styles.num}>{String(challengeNumber(c)).padStart(2, "0")}</td>
                    <td>
                      <Link to={linkTo(c)}>{c.title}</Link>
                    </td>
                    <td>{shortDate(p.solvedAt!)}</td>
                    <td className={styles.num}>{p.attempts}</td>
                    <td className={styles.num}>
                      {Math.min(p.hintsShown, c.variants[language]!.hintsHtml.length)}/{c.variants[language]!.hintsHtml.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </section>

      <p className={styles.small}>
        Progress is saved only in this browser, on this device. Tracewise has no accounts and sends nothing anywhere. Use
        Export to move it to another browser.
      </p>

      <ConfirmDialog
        open={dialog?.kind === "reset"}
        title="Reset all progress?"
        confirmLabel="Reset everything"
        onConfirm={confirm}
        onCancel={() => setDialog(null)}
      >
        <p>This deletes your saved code, solved marks and streak in this browser. It can't be undone.</p>
        <p>Export first if you want a backup.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog?.kind === "import"}
        title="Replace your progress?"
        confirmLabel="Replace progress"
        onConfirm={confirm}
        onCancel={() => setDialog(null)}
      >
        {dialog?.kind === "import" && (
          <p>
            The file has {plural(dialog.summary.solved, "solved challenge")} and saved code for{" "}
            {plural(dialog.summary.withCode, "challenge")}. It will replace everything currently saved in this browser.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
