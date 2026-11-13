import { useCallback, useEffect, useRef, useState } from "react";
import { submitCode, type SubmissionReport, type TestReport } from "../checker/submit";
import type { Language, TestCase } from "../content/types";
import { getRunner } from "../runners";

/** Submit: marks the code against every test, with live progress and Stop. */
export function useSubmission(tests: TestCase[], language: Language) {
  const runner = getRunner(language);
  const [marking, setMarking] = useState(false);
  const [progress, setProgress] = useState<TestReport[]>([]);
  const [report, setReport] = useState<SubmissionReport | null>(null);
  /** The code that was marked, so errors can be explained against it */
  const [submittedCode, setSubmittedCode] = useState("");
  const cancelled = useRef(false);
  const markingRef = useRef(false);

  // Leaving the page stops marking.
  useEffect(
    () => () => {
      cancelled.current = true;
    },
    [],
  );

  const submit = useCallback(
    async (code: string): Promise<SubmissionReport | null> => {
      if (markingRef.current) return null;
      markingRef.current = true;
      cancelled.current = false;
      setMarking(true);
      setReport(null);
      setProgress([]);
      setSubmittedCode(code);
      try {
        const result = await submitCode(runner, code, tests, {
          onProgress: setProgress,
          isCancelled: () => cancelled.current,
        });
        setReport(result);
        return result;
      } catch {
        // Python failed to load; the runtime status shows the error.
        return null;
      } finally {
        markingRef.current = false;
        setMarking(false);
      }
    },
    [runner, tests],
  );

  const cancel = useCallback(() => {
    cancelled.current = true;
    runner.stop();
  }, [runner]);

  return { marking, progress, report, submittedCode, submit, cancel };
}
