import type { Explanation } from "../explain/types";
import type { CodeError } from "../runners/types";
import { InlineCode } from "./InlineCode";
import styles from "./ErrorExplanation.module.css";

/** Plain-language explanation of an error, with Python's own message one click away. */
export function ErrorExplanation({ explanation, error }: { explanation: Explanation; error: CodeError }) {
  const traceback = error.traceback.trimEnd().split("\n");
  const last = traceback.pop();

  return (
    <div className={styles.card} role="note" aria-label="Error explanation">
      <span className={`label ${styles.label}`}>
        {explanation.line ? `Line ${explanation.line} · ` : ""}
        {error.type}
      </span>
      <p className={styles.title}>
        <InlineCode text={explanation.title} />
      </p>
      <p className={styles.message}>
        <InlineCode text={explanation.message} />
      </p>
      {explanation.fix && (
        <p className={styles.fix}>
          <span className={styles.fixLabel}>
            Try{explanation.fixLine && explanation.fixLine !== explanation.line ? ` on line ${explanation.fixLine}` : ""}
          </span>
          <code>{explanation.fix}</code>
        </p>
      )}
      {error.traceback && (
        <details className={styles.details}>
          <summary>What Python said</summary>
          <pre className={styles.traceback}>
            {traceback.length > 0 && `${traceback.join("\n")}\n`}
            <mark className={styles.lastLine}>{last}</mark>
          </pre>
        </details>
      )}
    </div>
  );
}
