# Tracewise

Practise **Python** and **C++** in your browser by solving beginner-friendly challenges. Your code runs on your own machine, with hidden tests, progressive hints, solution walkthroughs, and a friendly explainer that turns error messages into plain language.

> **Status:** Phase 0: project skeleton and "hello world" deploy. See [PLAN.md](PLAN.md) for the roadmap.

## Planned features

- Challenge list by language, topic and difficulty
- In-browser code editor with Run and Submit
- Python (via Pyodide) and C++ running entirely in the browser, with a Stop button
- Hidden test cases with clear pass/fail results
- Progressive hints, solution walkthroughs, and a friendly error explainer
- Progress and saved code stored in your browser (no accounts)

## Tech stack

| Part | Choice |
|---|---|
| UI | React 19 + TypeScript |
| Build | Vite |
| Editor | CodeMirror 6 (Phase 1) |
| Python runtime | Pyodide from jsDelivr, in a Web Worker (Phase 2) |
| C++ runtime | To be chosen in Phase 6 |
| Hosting | Netlify (static) |

The site is served with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (see `netlify.toml` and `vite.config.ts`). These headers enable `SharedArrayBuffer`, which the Python runtime uses for interactive `input()` and for stopping runaway code. Pyodide loads fine from jsDelivr under these headers.

## Run locally

Requires Node.js 26 (see `.nvmrc`).

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # type-check and build to dist/
npm run preview    # serve the production build at http://localhost:4173
```

## Project structure

```
challenges/        challenge content (from Phase 3)
src/               app source
  pages/           Home, ChallengeList, Challenge          (Phase 1)
  components/      Editor, OutputPanel, TestResults, ...   (Phase 1)
  runners/         per-language code runners in workers    (Phase 2, 6)
  checker/         compares actual vs expected output      (Phase 3)
  explain/         friendly error-explainer rules          (Phase 4)
  progress/        progress and saved code in localStorage (Phase 5)
public/            static files copied as-is
netlify.toml       build settings and security headers
```

## Adding a challenge

Coming in Phase 3. Each challenge will be one folder with a Markdown description, a shared `tests.yaml`, and per-language starter code, reference solution, hints and walkthrough.

## License

TBD
