import { Link } from "react-router";
import { challengeNumber, challenges } from "../content/challenges";
import { LANGUAGES } from "../content/types";
import { useProgressData } from "../progress/useProgress";
import { LANGUAGE_NAMES } from "../runners";
import styles from "./HomePage.module.css";

type Token = [text: string, kind?: "kw" | "str" | "num" | "fn"];

// A hand-coloured snippet for the "what an error note looks like" specimen.
// (The real editor is only loaded on challenge pages.)
const SPECIMEN: Token[][] = [
  [["number", undefined], [" = "], ["int", "fn"], ["("], ["input", "fn"], ["())"]],
  [],
  [["if", "kw"], [" number % "], ["2", "num"], [" = "], ["0", "num"], [":"]],
  [["    "], ["print", "fn"], ["("], ['"even"', "str"], [")"]],
  [["else", "kw"], [":"]],
  [["    "], ["print", "fn"], ["("], ['"odd"', "str"], [")"]],
];
const ERROR_LINE = 3;

const STEPS = [
  { title: "Write", text: "Read the problem and write your solution in the editor." },
  { title: "Run", text: "Try it on the examples, then submit it against hidden tests." },
  { title: "Understand", text: "Mistakes get a note in plain language that points at the line." },
];

export function HomePage() {
  const first = challenges[0];
  const counts = {
    python: challenges.filter((c) => c.variants.python).length,
    cpp: challenges.filter((c) => c.variants.cpp).length,
  };
  const progress = useProgressData();

  // The most recently opened challenge that isn't solved yet.
  const resume = challenges
    .flatMap((c) => LANGUAGES.map((language) => ({ challenge: c, language, p: progress.challenges[c.id]?.[language] })))
    .filter(({ p }) => p?.lastOpened && !p.solvedAt)
    .sort((a, b) => b.p!.lastOpened!.localeCompare(a.p!.lastOpened!))[0];

  return (
    <div className={styles.page}>
      <title>Tracewise · Practise Python and C++ in your browser</title>

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={`label ${styles.eyebrow}`}>Python · C++ · Runs in your browser</p>
          <h1 className={styles.h1}>
            Write code. Run it. <span className={styles.see}>See what went wrong.</span>
          </h1>
          <p className={styles.lead}>
            Beginner challenges that run right here, with hints when you're stuck and plain-language notes on your
            mistakes. Nothing to install, no account needed.
          </p>
          <div className={styles.actions}>
            {first && (
              <Link className="btn btn-primary" to={`/challenges/${first.id}`}>
                Start challenge 1
              </Link>
            )}
            <Link className="btn btn-secondary" to="/challenges">
              Browse challenges
            </Link>
          </div>
          {resume && (
            <Link
              to={`/challenges/${resume.challenge.id}${resume.language === "cpp" ? "?lang=cpp" : ""}`}
              className={styles.resume}
            >
              <span className="label">Continue where you left off</span>
              <strong className={styles.resumeTitle}>{resume.challenge.title} →</strong>
              <span className={styles.resumeMeta}>
                No. {String(challengeNumber(resume.challenge)).padStart(2, "0")} · {LANGUAGE_NAMES[resume.language]}
                {resume.p!.attempts > 0
                  ? ` · ${resume.p!.attempts} ${resume.p!.attempts === 1 ? "attempt" : "attempts"}`
                  : resume.p!.code !== undefined
                    ? " · code saved"
                    : ""}
              </span>
            </Link>
          )}
        </div>

        <figure className={styles.specimen}>
          <div className={styles.specimenHead}>
            <span className="label">even_or_odd.py</span>
          </div>
          <div className={styles.code} role="img" aria-label="Code with an error on line 3 and a red-pen note explaining it">
            {SPECIMEN.map((tokens, i) => (
              <div key={i}>
                <div className={i + 1 === ERROR_LINE ? `${styles.line} ${styles.errorLine}` : styles.line}>
                  <span className={styles.ln}>{i + 1}</span>
                  <code>
                    {tokens.map(([text, kind], j) => (
                      <span key={j} className={kind ? styles[kind] : undefined}>
                        {text}
                      </span>
                    ))}
                  </code>
                </div>
                {i + 1 === ERROR_LINE && (
                  <div className={styles.note}>
                    <span className="label">Line 3 · SyntaxError</span>
                    <p>
                      A single <code>=</code> stores a value. To <em>compare</em> two values, use{" "}
                      <code>==</code>: <code>if number % 2 == 0:</code>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <figcaption className={styles.caption}>What an error note looks like</figcaption>
        </figure>
      </section>

      <section aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="visually-hidden">
          How it works
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((step, i) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.stepNo}>{String(i + 1).padStart(2, "0")}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="languages" className={styles.languagesSection}>
        <h2 id="languages" className={styles.h2}>
          Pick a language
        </h2>
        <div className={styles.languages}>
          {LANGUAGES.map((language) => (
            <Link key={language} to={`/challenges?language=${language}`} className={styles.language}>
              <span className="label">Language</span>
              <strong className={styles.languageName}>{LANGUAGE_NAMES[language]}</strong>
              <span className={styles.languageMeta}>
                {counts[language]} challenge{counts[language] === 1 ? "" : "s"} →
              </span>
              <span className={styles.languageNote}>
                {language === "cpp"
                  ? "Real Clang compiler in your browser. About 20 s to get ready on each visit."
                  : "Python 3.14 in your browser. Ready in a few seconds."}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
