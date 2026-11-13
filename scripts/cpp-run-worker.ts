/** Node worker thread: runs one compiled C++ program (so a hang can be killed). */
import { parentPort, workerData } from "node:worker_threads";
import { splitInputLines } from "../src/runners/python/input.ts";
import { runWasi } from "../src/runners/cpp/wasiRun.ts";

const { wasm, stdin } = workerData as { wasm: Uint8Array<ArrayBuffer>; stdin: string };
const queue = splitInputLines(stdin);
const decoder = new TextDecoder();
let output = "";

const module = new WebAssembly.Module(wasm);
const outcome = runWasi(module, {
  nextLine: () => queue.shift() ?? null,
  write: (stream, bytes) => {
    if (stream === "stdout") output += decoder.decode(bytes, { stream: true });
  },
});
parentPort!.postMessage({ outcome, output });
