import { errorLabel } from "../explain/labels";
import type { Explanation } from "../explain/types";
import type { CodeError } from "../runners/types";
import { InlineCode } from "./InlineCode";
import styles from "./ErrorExplanation.module.css";

function sourceLabel(type: string): string {
  if (type.startsWith("Compile")) return "What the compiler said";
  if (type === "RuntimeError") return "What happened";
  return "What Python said";
}

/** Plain-language explanation of an error or warning, with the original message one click away. */
export function ErrorExplanation({ explanation, error }: { explanation: Explanation; error: CodeError }) {
  const traceback = error.traceback.trimEnd().split("\n");
  const last = traceback.pop();
  const isWarning = error.type === "CompileWarning";

  return (
    <div className={styles.card} data-kind={isWarning ? "warning" : "error"} role="note" aria-label="Error explanation">
      <span className={`label ${styles.label}`}>
        {explanation.line ? `Line ${explanation.line} · ` : ""}
        {errorLabel(error.type)}
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
      {error.traceback && !isWarning && (
        <details className={styles.details}>
          <summary>{sourceLabel(error.type)}</summary>
          <pre className={styles.traceback}>
            {traceback.length > 0 && `${traceback.join("\n")}\n`}
            <mark className={styles.lastLine}>{last}</mark>
          </pre>
        </details>
      )}
    </div>
  );
}
