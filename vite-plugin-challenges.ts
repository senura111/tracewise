/**
 * Reads every folder in challenges/ at build time, validates it, renders its
 * Markdown to HTML, and exposes the result as the `virtual:challenges` module.
 *
 * A broken challenge fails the build (or shows the Vite error overlay in dev)
 * with a message naming the folder and the problem.
 */
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { Marked } from "marked";
import { highlightCode } from "./highlight-code.ts";
import type { Plugin } from "vite";
import {
  DIFFICULTIES,
  LANGUAGES,
  type Challenge,
  type Difficulty,
  type Language,
  type LanguageVariant,
  type TestCase,
  summarize,
} from "./src/content/types.ts";

const VIRTUAL_ID = "virtual:challenges";
const RESOLVED_ID = "\0" + VIRTUAL_ID;
/** One module per challenge with its full content, so each loads on demand. */
const CONTENT_PREFIX = "virtual:challenge/";
const EXTENSIONS: Record<Language, string> = { python: "py", cpp: "cpp" };

type Fail = (message: string) => never;

const normalize = (text: string) => text.replace(/\r\n/g, "\n");
// Python and C++ code blocks get syntax highlighting at build time; others render as usual.
const markdown = new Marked({
  renderer: {
    code({ text, lang }) {
      const html = highlightCode(text, lang);
      return html === null ? false : `<pre><code class="language-${lang}">${html}</code></pre>
`;
    },
  },
});
const toHtml = (source: string) => markdown.parse(source.trim(), { async: false });

async function readText(file: string, watch: (file: string) => void): Promise<string> {
  watch(file);
  return normalize(await readFile(file, "utf8"));
}

function parseFrontMatter(source: string, fail: Fail) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(source);
  if (!match) fail("challenge.md must start with a front matter block between --- lines");
  return { data: (parseYaml(match[1]) ?? {}) as Record<string, unknown>, body: match[2] };
}

function parseTests(source: string, fail: Fail): TestCase[] {
  const data = parseYaml(source) as { cases?: unknown } | null;
  if (!data || !Array.isArray(data.cases) || data.cases.length === 0) {
    fail("tests.yaml needs a non-empty `cases:` list");
  }
  const cases = data.cases.map((raw, i): TestCase => {
    const c = raw as Record<string, unknown>;
    if (typeof c.input !== "string") fail(`tests.yaml case ${i + 1}: \`input\` must be a string`);
    if (typeof c.output !== "string") fail(`tests.yaml case ${i + 1}: \`output\` must be a string`);
    if (c.visible !== undefined && typeof c.visible !== "boolean") {
      fail(`tests.yaml case ${i + 1}: \`visible\` must be true or false`);
    }
    return { input: c.input, output: c.output, visible: c.visible === true };
  });
  if (!cases.some((c) => c.visible)) fail("tests.yaml needs at least one case with `visible: true`");
  return cases;
}

async function loadVariant(
  dir: string,
  language: Language,
  watch: (file: string) => void,
  fail: Fail,
): Promise<LanguageVariant> {
  const ext = EXTENSIONS[language];
  const need = (name: string) => {
    const file = path.join(dir, name);
    if (!existsSync(file)) fail(`${language}/${name} is missing`);
    return readText(file, watch);
  };
  const hints = (await need("hints.md"))
    .split(/^---$/m)
    .map((h) => h.trim())
    .filter(Boolean);
  if (hints.length === 0) fail(`${language}/hints.md has no hints`);
  return {
    starter: await need(`starter.${ext}`),
    solution: await need(`solution.${ext}`),
    hintsHtml: hints.map(toHtml),
    walkthroughHtml: toHtml(await need("walkthrough.md")),
  };
}

async function loadChallenge(dir: string, id: string, watch: (file: string) => void): Promise<Challenge> {
  const fail: Fail = (message) => {
    throw new Error(`[challenges] ${id}: ${message}`);
  };

  const mdFile = path.join(dir, "challenge.md");
  const testsFile = path.join(dir, "tests.yaml");
  if (!existsSync(mdFile)) fail("challenge.md is missing");
  if (!existsSync(testsFile)) fail("tests.yaml is missing");

  const { data, body } = parseFrontMatter(await readText(mdFile, watch), fail);
  const { title, difficulty, topics, order } = data;
  if (typeof title !== "string" || !title.trim()) fail("front matter needs a `title`");
  if (!DIFFICULTIES.includes(difficulty as Difficulty)) {
    fail(`\`difficulty\` must be one of: ${DIFFICULTIES.join(", ")}`);
  }
  if (!Array.isArray(topics) || topics.length === 0 || !topics.every((t) => typeof t === "string")) {
    fail("`topics` must be a non-empty list of strings");
  }
  if (typeof order !== "number") fail("`order` must be a number");

  const variants: Challenge["variants"] = {};
  for (const language of LANGUAGES) {
    const langDir = path.join(dir, language);
    if (existsSync(langDir)) variants[language] = await loadVariant(langDir, language, watch, fail);
  }
  if (Object.keys(variants).length === 0) fail(`needs at least one language folder (${LANGUAGES.join(", ")})`);

  return {
    id,
    title,
    difficulty: difficulty as Difficulty,
    topics: topics as string[],
    order,
    descriptionHtml: toHtml(body),
    tests: parseTests(await readText(testsFile, watch), fail),
    variants,
  };
}

/** Loads and validates every challenge folder in `root`, sorted in learning order. */
export async function loadAllChallenges(root: string, watch: (file: string) => void = () => {}): Promise<Challenge[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const all = await Promise.all(
    entries.filter((e) => e.isDirectory()).map((e) => loadChallenge(path.join(root, e.name), e.name, watch)),
  );
  return all.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export function challenges(options: { dir?: string } = {}): Plugin {
  let root = "";

  return {
    name: "tracewise-challenges",

    configResolved(config) {
      root = path.resolve(config.root, options.dir ?? "challenges");
    },

    resolveId(id) {
      if (id === VIRTUAL_ID || id.startsWith(CONTENT_PREFIX)) return "\0" + id;
    },

    async load(id) {
      const watch = (file: string) => this.addWatchFile(file);

      // The index: summaries for every page, plus a loader per challenge.
      if (id === RESOLVED_ID) {
        const all = await loadAllChallenges(root, watch);
        const loaders = all
          .map((c) => `  ${JSON.stringify(c.id)}: () => import(${JSON.stringify(CONTENT_PREFIX + c.id)}),`)
          .join("\n");
        return `export const challenges = ${JSON.stringify(all.map(summarize))};\nexport const loaders = {\n${loaders}\n};`;
      }

      // One challenge's full content, loaded when its page opens.
      if (id.startsWith("\0" + CONTENT_PREFIX)) {
        const challengeId = id.slice(1 + CONTENT_PREFIX.length);
        const challenge = await loadChallenge(path.join(root, challengeId), challengeId, watch);
        return `export default ${JSON.stringify(challenge)};`;
      }
    },

    configureServer(server) {
      // Edits to existing files are picked up via addWatchFile; adding or
      // removing files or folders needs a fresh load, so restart.
      server.watcher.add(root);
      server.watcher.on("all", (event, file) => {
        if (event !== "change" && path.resolve(file).startsWith(root + path.sep)) server.restart();
      });
    },
  };
}
