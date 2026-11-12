# PLAN.md — Python & C++ Practice Website

> Working title: **TBD** (suggest a few names in Phase 0).

## How to use this plan (read first)

This plan describes **what** to build and **why**. The "how" is deliberately open.

- Anything marked *Suggestion* is a starting idea, not a requirement. If you know a better library, architecture, data format or UX approach, **propose it** — explain the trade-offs briefly and let me choose before building.
- Before each phase, give a short plan for that phase (approach, files, libraries) and wait for my OK.
- If something in this plan turns out to be impractical, say so and suggest an alternative instead of forcing it.
- Ask before adding large dependencies or anything that needs a paid service.
- Commit at the end of each phase with a clear message, and keep the README up to date as you go.

## Project goal

A website where beginners practise **Python** and **C++** by solving programming challenges, running their code in the browser, and getting clear explanations — of the solution, and of their own mistakes.

This is a personal side project for my GitHub portfolio. It does not need to make money.

## Hard constraints

- **Free to run.** Static hosting only (Netlify or GitHub Pages). No paid servers, no paid APIs.
- **No backend server for running code.** User code should run in the browser, on the user's own machine.
- **Safe execution.** User code must not freeze the page. Infinite loops and runaway code need a timeout / stop button.
- **Low disk space on my dev PC (Windows).** Avoid heavy local toolchains or multi-GB installs. Prefer CDN-loaded or small npm packages.
- **Public repo.** No secrets or API keys in the code.
- **No accounts or database.** Progress can live in the browser.

## Target users

Complete beginners and early uni/school students learning their first or second language. Assume they don't know what a stack trace is.

## Core features

1. **Challenge list** — browse by language, topic and difficulty; see what's solved.
2. **Challenge page** — problem description, example input/output, code editor, Run and Submit.
3. **Running code** — Python and C++ run in the browser and show output/errors.
4. **Automatic checking** — hidden test cases; clear pass/fail per test.
5. **Explanations**
   - Progressive hints (small nudge → bigger hint → near-solution).
   - Solution walkthrough after solving (or after choosing to reveal).
   - **Friendly error explainer**: turns common errors (SyntaxError, IndexError, NameError, off-by-one, missing semicolon, etc.) into plain-language explanations with a pointer to the likely line.
6. **Progress tracking** — solved challenges, streak/progress view, saved code per challenge.

## Phases

Each phase should end with something that works and can be demoed.

### Phase 0 — Setup and proposal
- Propose the tech stack (framework or plain HTML/JS, build tool, editor component) with short pros/cons. *Suggestion:* a lightweight setup that deploys easily to Netlify/GitHub Pages.
- Propose a folder structure and a format for storing challenges (description, starter code, tests, hints, walkthrough).
- Suggest 3–5 project names.
- Create the repo skeleton, README stub, and deploy a "hello world" version.

### Phase 1 — Layout and editor
- Home page, challenge list page, challenge page.
- Code editor with syntax highlighting. *Suggestion:* CodeMirror or Monaco — pick whichever fits better and explain why.
- Design: give it its own visual identity rather than a generic template look. Propose a small design direction (palette, type, layout) before building.

### Phase 2 — Run Python in the browser
- Run Python code and show stdout/stderr. *Suggestion:* Pyodide in a Web Worker.
- Stop button and timeout for infinite loops.
- Support `input()` in some sensible way (propose an approach).

### Phase 3 — Challenge system
- Load challenges from the chosen data format.
- Run hidden test cases on Submit; show which passed/failed (and expected vs actual where appropriate).
- Write 10–15 beginner Python challenges across topics: variables, conditionals, loops, strings, lists, functions, dictionaries. A few can be light security-themed puzzles (e.g. Caesar cipher, password strength checker).

### Phase 4 — Explanations
- Progressive hints per challenge.
- Solution walkthroughs.
- Friendly error explainer for common Python errors. Propose how to detect and map errors (and how to make adding new rules easy).

### Phase 5 — Progress and organisation
- Save progress and the user's code per challenge in the browser.
- Filters by topic/difficulty, solved badges, overall progress view.
- Export/reset progress option.

### Phase 6 — C++ support
- Research and propose options for running beginner-level C++ in the browser (e.g. a JS-based C++ interpreter vs a WebAssembly compiler). Compare load size, speed, C++ feature coverage, and maintenance status, then recommend one.
- Add C++ versions of the challenges and C++ error explanations (missing semicolons, undeclared variables, type mismatches, etc.).

### Phase 7 — Polish and release
- Responsive layout down to mobile, keyboard accessible, dark/light mode.
- Loading states for the language runtimes (they can be slow to load the first time).
- README: what it is, features, tech stack, how to run locally, how to add a challenge, screenshots / demo GIF.
- Deploy final version and tag a v1.0.0 release.

## Nice-to-have (later, only if time allows)

- Optional "bring your own API key" AI explanations (key stored only in the user's browser).
- Challenge of the day.
- Share a solution via a link.
- More topics (recursion, sorting, classes/OOP, pointers for C++).

## Definition of done (v1)

- Live public site with at least 15 Python and 10 C++ challenges.
- Code runs in the browser for both languages, with tests, hints, walkthroughs and the error explainer working.
- Progress saves between visits.
- Clean README with a demo GIF.
