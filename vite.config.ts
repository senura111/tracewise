import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { challenges } from "./vite-plugin-challenges.ts";

// Cross-origin isolation lets the Python runtime (Phase 2) use SharedArrayBuffer
// for interactive input() and a Stop button. These must match netlify.toml so
// local dev behaves like production.
const crossOriginIsolation = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  plugins: [react(), challenges()],
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
});
