import { useState } from "react";
import styles from "./HintNotes.module.css";

/** Progressive hints, revealed one at a time as margin notes. */
export function HintNotes({ hints }: { hints: string[] }) {
  const [shown, setShown] = useState(0);

  return (
    <div className={styles.hints}>
      <h2 className={`label ${styles.title}`}>Hints</h2>
      {shown === 0 && (
        <p className={styles.intro}>Stuck? Hints start with a small nudge and get closer to the answer.</p>
      )}
      <ol className={styles.list} aria-live="polite">
        {hints.slice(0, shown).map((html, i) => (
          <li key={i} className={styles.note} data-note>
            <span className={`label ${styles.noteLabel}`}>
              Hint {i + 1} of {hints.length}
            </span>
            <div className={`prose ${styles.text}`} dangerouslySetInnerHTML={{ __html: html }} />
          </li>
        ))}
      </ol>
      {shown < hints.length && (
        <button type="button" className={`btn btn-ghost ${styles.more}`} onClick={() => setShown(shown + 1)}>
          {shown === 0 ? "Show hint 1" : "Show a bigger hint"}
        </button>
      )}
    </div>
  );
}
