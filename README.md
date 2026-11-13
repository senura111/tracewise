# Tracewise

Practise **Python** and **C++** in your browser by solving beginner-friendly challenges. Your code runs on your own machine, with hidden tests, progressive hints, solution walkthroughs, and a friendly explainer that turns error messages into plain language.

> **Status:** Phase 2 is done: Python runs in the browser. Checking code against tests comes in Phase 3. See [PLAN.md](PLAN.md) for the roadmap.

## Features

- [x] Challenge list with filters for language, topic and difficulty (filters live in the URL)
- [x] Challenge page: problem, examples, progressive hints as margin notes, a walkthrough you can reveal
- [x] Code editor with Python syntax highlighting and auto-indent
- [x] Responsive: side-by-side on desktop, tabs (Problem / Code / Output) on phones
- [x] Light and dark mode that follow your system setting
- [x] Run Python in the browser (Pyodide in a Web Worker), with live output, interactive `input()`, a Stop button and a 5-second time limit
- [ ] Hidden tests with pass/fail marks
- [ ] Friendly error explainer: red-pen notes on the line that went wrong
- [ ] Progress and saved code stored in your browser
- [ ] C++ support

## Design

The look is called **Drafting pad**: green-grey engineering-pad paper with a faint grid, graphite ink, a petrol-blue pen for actions, a red pen reserved for mistakes, and a highlighter for hints. Headings are set in **Archivo Expanded**, like the title block of a technical drawing. Body text and code use **Atkinson Hyperlegible Next** and **Atkinson Hyperlegible Mono**, which keep look-alike characters such as `0`/`O` and `1`/`l`/`I` distinct.

All colours are CSS custom properties in [`src/styles/tokens.css`](src/styles/tokens.css), using `light-dark()` for dark mode.

## Tech stack

| Part | Choice |
|---|---|
| UI | React 19 + TypeScript, CSS Modules |
| Routing | React Router (hash URLs, so any static host works) |
| Build | Vite |
| Editor | CodeMirror 6, wrapped in a small component ([`CodeEditor.tsx`](src/components/CodeEditor.tsx)) |
| Fonts | Self-hosted via Fontsource (no requests to third parties) |
| Python runtime | Pyodide 314 (Python 3.14) from jsDelivr, in a Web Worker |
| Tests | Vitest |
| Hosting | Netlify (static) |

The site is served with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (see [`netlify.toml`](netlify.toml) and [`vite.config.ts`](vite.config.ts)). These headers enable `SharedArrayBuffer`, which the Python runtime uses for interactive `input()` and for stopping runaway code.

## How Python runs

Code runs in a Web Worker ([`src/runners/python/`](src/runners/python)), so a slow program never freezes the page. Pyodide loads from jsDelivr when you open a challenge (about 10 to 15 MB the first time, cached afterwards) and stays loaded while you move between challenges.

- **Stop and the time limit:** the page sets a shared interrupt flag, which raises `KeyboardInterrupt` inside Python, so Python stays loaded. If a program doesn't stop within a second (for example a long calculation inside a built-in function), the worker is killed and a fresh one is loaded. Runs are limited to 5 seconds, not counting time spent waiting for input.
- **`input()`:** when a program asks for input, a field appears in the output panel and the worker waits on shared memory (`Atomics.wait`) until you press Enter. Stop works while it's waiting.
- **Test mode** (used by Submit in Phase 3): `input()` reads from the test's input, and prompt text such as `input("Name: ")` is dropped so it doesn't count as output. Asking for more input than the test gives ends the test with a plain-language message.
- **Limits:** output stops after 10,000 lines or 200,000 characters. Each run starts with fresh variables.
- **Errors:** code runs as `main.py`, and Pyodide's internal frames are removed from tracebacks, which keeps the line numbers meaningful for beginners.

## Run locally

Requires Node.js 26 (see `.nvmrc`).

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # type-check and build to dist/
npm run preview    # serve the production build at http://localhost:4173
npm test           # unit tests (Vitest)
```

## Project structure

```
challenges/              challenge content, one folder per challenge
src/
  components/            Layout, CodeEditor, HintNotes, OutputPanel, FilterBar, Tabs, ...
  content/               challenge types and helpers (data comes from the plugin below)
  pages/                 Home, ChallengeList, Challenge, NotFound
  styles/                design tokens and global styles
vite-plugin-challenges.ts  reads and validates challenges/ at build time
netlify.toml             build settings and security headers
```

## Adding a challenge

Create a folder in `challenges/`. The folder name becomes the URL (`#/challenges/<folder-name>`).

```
challenges/caesar-cipher/
├─ challenge.md        front matter + description (Markdown)
├─ tests.yaml          input → expected output, shared by all languages
└─ python/
   ├─ starter.py       code the editor starts with
   ├─ solution.py      reference solution
   ├─ hints.md         hints separated by --- lines, smallest nudge first
   └─ walkthrough.md   step-by-step explanation of a solution
```

`challenge.md`:

```markdown
---
title: Caesar Cipher
difficulty: medium          # easy | medium | hard
topics: [strings, loops]    # the first topic is used for grouping
order: 3                    # position in the learning order
---

Problem description in Markdown. **Bold** text gets a highlighter mark.
```

`tests.yaml`:

```yaml
cases:
  - input: "hello\n3\n"
    output: "khoor\n"
    visible: true      # shown as an example; the rest are hidden tests
  - input: "xyz\n2\n"
    output: "zab\n"
```

Every challenge needs at least one visible test and at least one language folder. If something is missing or invalid, `npm run dev` and `npm run build` stop with a message naming the folder and the problem. Hidden tests are not shown in the page, but they are shipped to the browser, so treat them as practice checks rather than a secure judge.

## License

TBD
