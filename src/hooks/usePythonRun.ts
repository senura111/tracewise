import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getPythonRunner } from "../runners/python/PythonRunner";
import type { RunResult } from "../runners/types";

export interface ConsoleEntry {
  kind: "stdout" | "stderr" | "input";
  text: string;
}

export type RunPhase = "idle" | "running" | "waiting-input";

/** Interactive "Run" for a challenge page: console output, input() and Stop. */
export function usePythonRun() {
  const runner = getPythonRunner();
  const runtime = useSyncExternalStore(runner.subscribe, runner.getState);
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [phase, setPhase] = useState<RunPhase>("idle");
  const [result, setResult] = useState<RunResult | null>(null);
  /** The code of the latest run, so errors can be explained against it */
  const [ranCode, setRanCode] = useState("");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Start loading Python as soon as a challenge page opens.
  useEffect(() => {
    runner.load().catch(() => {});
  }, [runner]);

  // Leaving the page stops a running program.
  useEffect(() => () => runner.stop(), [runner]);

  const append = useCallback((kind: ConsoleEntry["kind"], text: string) => {
    setEntries((prev) => {
      const last = prev.at(-1);
      if (last?.kind === kind) return [...prev.slice(0, -1), { kind, text: last.text + text }];
      return [...prev, { kind, text }];
    });
  }, []);

  const run = useCallback(
    async (code: string) => {
      if (phaseRef.current !== "idle") return;
      setEntries([]);
      setResult(null);
      setRanCode(code);
      setPhase("running");
      try {
        const outcome = await runner.run(code, {
          mode: "run",
          onOutput: append,
          onInputRequest: () => setPhase("waiting-input"),
        });
        setResult(outcome);
      } catch {
        // Loading failed; the runtime state shows the error and a Retry button.
      } finally {
        setPhase("idle");
      }
    },
    [runner, append],
  );

  const submitInput = useCallback(
    (line: string) => {
      append("input", `${line}\n`);
      setPhase("running");
      runner.provideInput(line);
    },
    [runner, append],
  );

  const stop = useCallback(() => runner.stop(), [runner]);
  const retryLoad = useCallback(() => void runner.load().catch(() => {}), [runner]);

  return { runtime, entries, phase, result, ranCode, run, stop, submitInput, retryLoad };
}
