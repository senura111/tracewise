/**
 * Compiles and runs C++ in Node the same way the website does: YoWASP Clang
 * with the same flags, and the same WASI runner. Each program runs in a
 * worker thread so an infinite loop can be stopped.
 */
import { Worker } from "node:worker_threads";
import { commands } from "@yowasp/clang";
import { hasMain } from "../src/explain/cpp/helpers.ts";
import { compileError, compileWarnings, runtimeError } from "../src/runners/cpp/diagnostics.ts";
import { COMPILE_ARGS } from "../src/runners/cpp/protocol.ts";
import type { WasiOutcome } from "../src/runners/cpp/wasiRun.ts";
import type { TestRun } from "./pyodide-harness.ts";

const TIME_LIMIT_MS = 5000;

function runInWorker(wasm: Uint8Array, stdin: string): Promise<{ outcome: WasiOutcome; output: string } | null> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./cpp-run-worker.ts", import.meta.url), {
      execArgv: ["--import", "tsx"],
      workerData: { wasm, stdin },
    });
    const timer = setTimeout(() => {
      void worker.terminate();
      resolve(null);
    }, TIME_LIMIT_MS);
    worker.once("message", (message) => {
      clearTimeout(timer);
      void worker.terminate();
      resolve(message);
    });
    worker.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

export function createCppHarness() {
  const clang = commands["clang++"];
  let cached: { code: string; wasm?: Uint8Array; stderr: string } | null = null;

  return async function run(code: string, stdin = ""): Promise<TestRun> {
    if (!hasMain(code)) {
      return {
        status: "error",
        output: "",
        error: { type: "CompileError", message: "no main function", line: null, traceback: "" },
      };
    }
    if (cached?.code !== code) {
      let stderr = "";
      const decoder = new TextDecoder();
      try {
        const files = (await clang(COMPILE_ARGS, { "main.cpp": code }, {
          stderr: (bytes) => {
            if (bytes) stderr += decoder.decode(bytes, { stream: true });
          },
        })) as Record<string, Uint8Array>;
        cached = { code, wasm: files["main.wasm"], stderr };
      } catch {
        cached = { code, stderr };
      }
    }
    const warnings = compileWarnings(cached.stderr);
    if (!cached.wasm) return { status: "error", output: "", error: compileError(cached.stderr), warnings };

    const result = await runInWorker(cached.wasm, stdin);
    if (!result) return { status: "step-limit", output: "", warnings };
    const { outcome, output } = result;
    if (outcome.kind === "trap") return { status: "error", output, error: runtimeError(outcome.message), warnings };
    if (outcome.kind === "output-limit") return { status: "step-limit", output, warnings };
    return { status: "ok", output, warnings };
  };
}
