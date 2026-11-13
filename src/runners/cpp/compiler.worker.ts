/**
 * Hosts Clang (YoWASP, from jsDelivr). Loading means downloading about 18 MB
 * and then letting the browser compile a 75 MB WebAssembly module, which takes
 * around 20 s on each visit; a warm-up compile does that up front so the
 * learner's first Run doesn't pay for it.
 */
import { CLANG_URL, COMPILE_ARGS, type FromCompiler, type ToCompiler } from "./protocol";

type Clang = (
  args: string[],
  files: Record<string, string>,
  options?: {
    stderr?: (bytes: Uint8Array | null) => void;
    fetchProgress?: (event: { totalLength: number; doneLength: number }) => void;
  },
) => Promise<Record<string, Uint8Array | string>>;

const send = (message: FromCompiler, transfer: Transferable[] = []) => postMessage(message, { transfer });

let clang: Clang | null = null;

async function init() {
  try {
    const module = (await import(/* @vite-ignore */ CLANG_URL)) as { commands: Record<string, Clang> };
    clang = module.commands["clang++"];
    let announcedPreparing = false;
    await clang(["main.cpp", "-c", "-o", "main.o"], { "main.cpp": "int main() { return 0; }\n" }, {
      fetchProgress: ({ totalLength, doneLength }) => {
        send({ type: "progress", fraction: totalLength > 0 ? doneLength / totalLength : 0 });
        if (totalLength > 0 && doneLength >= totalLength && !announcedPreparing) {
          announcedPreparing = true;
          send({ type: "preparing" });
        }
      },
    });
    send({ type: "ready" });
  } catch (error) {
    send({ type: "load-error", message: error instanceof Error ? error.message : String(error) });
  }
}

async function compile(id: number, code: string) {
  if (!clang) {
    send({ type: "compile-crashed", id, message: "The compiler isn't loaded." });
    return;
  }
  let stderr = "";
  const decoder = new TextDecoder();
  try {
    const files = await clang(COMPILE_ARGS, { "main.cpp": code }, {
      stderr: (bytes) => {
        if (bytes) stderr += decoder.decode(bytes, { stream: true });
      },
    });
    const wasm = files["main.wasm"];
    if (!(wasm instanceof Uint8Array)) {
      send({ type: "compile-failed", id, stderr });
      return;
    }
    const buffer = wasm.slice().buffer;
    send({ type: "compiled", id, wasm: buffer, stderr }, [buffer]);
  } catch (error) {
    // Clang exits with a non-zero status for compile errors.
    if (typeof (error as { code?: unknown }).code === "number") send({ type: "compile-failed", id, stderr });
    else send({ type: "compile-crashed", id, message: error instanceof Error ? error.message : String(error) });
  }
}

addEventListener("message", (event: MessageEvent<ToCompiler>) => {
  const message = event.data;
  if (message.type === "init") void init();
  else if (message.type === "compile") void compile(message.id, message.code);
});
