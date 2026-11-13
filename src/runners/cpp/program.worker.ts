/**
 * Runs one compiled C++ program, then is thrown away. Stop and the time limit
 * simply terminate this worker; the compiler worker isn't affected.
 */
import type { OutputStream } from "../types";
import { splitInputLines } from "../python/input";
import { OutputLimiter } from "../python/outputLimit";
import { INPUT_WAITING } from "../python/protocol";
import type { FromProgram, ToProgram } from "./protocol";
import { OutputLimitReached, runWasi } from "./wasiRun";

const OUTPUT_FLUSH_MS = 50;
const send = (message: FromProgram) => postMessage(message);

addEventListener("message", (event: MessageEvent<ToProgram>) => {
  const message = event.data;
  if (message.type !== "run") return;

  const limiter = new OutputLimiter(message.limits);
  const decoders = { stdout: new TextDecoder(), stderr: new TextDecoder() };
  const queue = splitInputLines(message.stdin);
  const inputState = message.inputState ? new Int32Array(message.inputState) : null;
  const inputData = message.inputData ? new Uint8Array(message.inputData) : null;
  let pending: { stream: OutputStream; text: string }[] = [];
  let lastFlush = performance.now();
  let waitedMs = 0;

  const flush = () => {
    for (const chunk of pending) send({ type: "output", ...chunk });
    pending = [];
    lastFlush = performance.now();
  };

  const write = (stream: OutputStream, bytes: Uint8Array) => {
    const text = limiter.take(decoders[stream].decode(bytes, { stream: true }));
    if (text) {
      const last = pending.at(-1);
      if (last?.stream === stream) last.text += text;
      else pending.push({ stream, text });
      if (performance.now() - lastFlush > OUTPUT_FLUSH_MS) flush();
    }
    if (limiter.exceeded) throw new OutputLimitReached();
  };

  const nextLine = (): string | null => {
    if (message.mode === "test") return queue.shift() ?? null;
    if (!inputState || !inputData) return null;
    // Show any prompt printed so far, then wait for the learner to type a line.
    flush();
    Atomics.store(inputState, 0, INPUT_WAITING);
    send({ type: "input-request" });
    const start = performance.now();
    Atomics.wait(inputState, 0, INPUT_WAITING);
    waitedMs += performance.now() - start;
    const length = Atomics.load(inputState, 1);
    return new TextDecoder().decode(inputData.slice(0, length));
  };

  const start = performance.now();
  void WebAssembly.compile(message.wasm)
    .then((module) => {
      const outcome = runWasi(module, { nextLine, write });
      flush();
      send({ type: "done", outcome, durationMs: performance.now() - start - waitedMs });
    })
    .catch((error: unknown) => {
      flush();
      send({
        type: "done",
        outcome: { kind: "crashed", message: error instanceof Error ? error.message : String(error) },
        durationMs: performance.now() - start - waitedMs,
      });
    });
});
