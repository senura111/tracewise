/**
 * Builds the site, serves it, and captures README screenshots plus a demo GIF
 * using the Microsoft Edge already installed on the machine (playwright-core
 * drives it; no browser download).
 *
 *   npm run screenshots
 *
 * Output: docs/screenshots/*.png and docs/demo.gif
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import gifenc from "gifenc";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import pngjs from "pngjs";
import { build, preview } from "vite";

// Both are CommonJS packages, so take their exports from the default import.
const { applyPalette, GIFEncoder, quantize } = gifenc;
const { PNG } = pngjs;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs");
const SHOTS = path.join(OUT, "screenshots");
mkdirSync(SHOTS, { recursive: true });

// ---- Sample progress, so the list and progress pages aren't empty ------------------------
const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const solved = (daysAgo: number, attempts: number, hints = 0) => ({
  python: { attempts, hintsShown: hints, walkthroughShown: true, solvedAt: new Date(Date.now() - daysAgo * 864e5).toISOString() },
});
const SAMPLE_PROGRESS = {
  version: 1,
  challenges: {
    "hello-name": solved(9, 1),
    "minutes-to-hours": solved(8, 2, 1),
    "even-or-odd": solved(6, 1),
    "ticket-price": solved(4, 3, 2),
    "leap-year": solved(2, 2, 1),
    countdown: solved(1, 1),
    "times-table": { python: { attempts: 1, hintsShown: 0, walkthroughShown: false, code: "n = int(input())\n" } },
  },
  activity: [day(9), day(8), day(6), day(4), day(3), day(2), day(1), day(0)],
};

// ---- Helpers ---------------------------------------------------------------------------
async function newContext(colorScheme: "light" | "dark", viewport = { width: 1280, height: 800 }, withProgress = true) {
  const context = await browser.newContext({ viewport, colorScheme, deviceScaleFactor: 1 });
  if (withProgress) {
    await context.addInitScript((value) => {
      if (!localStorage.getItem("tracewise:v1")) localStorage.setItem("tracewise:v1", value);
    }, JSON.stringify(SAMPLE_PROGRESS));
  }
  return context;
}

async function open(context: BrowserContext, hash: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`${baseUrl}${hash}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  return page;
}

const waitForRuntime = (page: Page) =>
  page.waitForFunction(() => /\bready\b/.test(document.querySelector("[role=status]")?.textContent ?? ""), null, {
    timeout: 180_000,
  });

async function setCode(page: Page, code: string) {
  await page.click(".cm-content");
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(code);
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
  console.log(`  docs/screenshots/${name}.png`);
}

// ---- Start: build and serve -------------------------------------------------------------
console.log("Building…");
await build({ root: ROOT, logLevel: "warn" });
const server = await preview({ root: ROOT, preview: { port: 4179, strictPort: true }, logLevel: "warn" });
const baseUrl = server.resolvedUrls!.local[0];
const browser = await chromium.launch({ channel: "msedge" });

try {
  // ---- Screenshots ----------------------------------------------------------------------
  console.log("Screenshots:");
  for (const scheme of ["light", "dark"] as const) {
    const context = await newContext(scheme);
    await shot(await open(context, "#/"), `home-${scheme}`);
    await shot(await open(context, "#/challenges"), `challenges-${scheme}`);
    await shot(await open(context, "#/progress"), `progress-${scheme}`);
    await context.close();
  }

  // A Python error explained on the line (light) …
  {
    const context = await newContext("light");
    const page = await open(context, "#/challenges/caesar-cipher");
    await waitForRuntime(page);
    await setCode(
      page,
      'text = input()\nshift = input()\n\nresult = ""\nfor ch in text:\n    if "a" <= ch <= "z":\n        position = ord(ch) - ord("a")\n        new_position = (position + shift) % 26\n        result += chr(ord("a") + new_position)\n    else:\n        result += ch\n\nprint(result)\n',
    );
    await page.getByRole("button", { name: "Submit" }).click();
    await page.waitForSelector(".cm-editor [role=note]");
    await page.waitForTimeout(500);
    await shot(page, "python-error-note");
    await context.close();
  }

  // … and a C++ compile error (dark). The compiler takes a while to prepare.
  {
    const context = await newContext("dark");
    const page = await open(context, "#/challenges/even-or-odd?lang=cpp");
    await waitForRuntime(page);
    await setCode(
      page,
      '#include <iostream>\nusing namespace std;\n\nint main() {\n    int number;\n    cin >> number;\n    if (number % 2 = 0) {\n        cout << "even" << endl\n    }\n    return 0;\n}\n',
    );
    await page.getByRole("button", { name: "Run" }).click();
    await page.waitForSelector(".cm-editor [role=note]", { timeout: 60_000 });
    await page.waitForTimeout(500);
    await shot(page, "cpp-compile-error");
    await context.close();
  }

  // ---- Demo GIF: write, run, read the note, fix, submit ---------------------------------------
  console.log("Demo GIF…");
  const context = await newContext("light", { width: 1100, height: 720 }, false);
  const page = await open(context, "#/challenges/even-or-odd");
  await waitForRuntime(page);
  const frames: { png: Buffer; delay: number }[] = [];
  const frame = async (delay: number) => frames.push({ png: await page.screenshot(), delay });

  await frame(1800);
  const buggy = ["number = int(input())", "", "if number % 2 = 0:", '    print("even")', "else:", '    print("odd")'];
  await page.click(".cm-content");
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  for (const [i, line] of buggy.entries()) {
    await page.keyboard.insertText(i < buggy.length - 1 ? `${line}\n` : line);
    await frame(350);
  }
  await page.keyboard.press("Control+Enter");
  await page.waitForSelector(".cm-editor [role=note]");
  await page.waitForTimeout(400);
  await frame(4500);

  // Fix line 3 and submit.
  await setCode(page, buggy.join("\n").replace("% 2 = 0", "% 2 == 0"));
  await frame(1200);
  await page.getByRole("button", { name: "Submit" }).click();
  await page.waitForSelector("text=All 5 tests passed", { timeout: 60_000 });
  await page.waitForTimeout(400);
  await frame(4500);
  await context.close();

  const gif = GIFEncoder();
  for (const { png, delay } of frames) {
    const { width, height, data } = PNG.sync.read(png);
    const palette = quantize(data, 128);
    gif.writeFrame(applyPalette(data, palette), width, height, { palette, delay });
  }
  gif.finish();
  writeFileSync(path.join(OUT, "demo.gif"), gif.bytes());
  console.log(`  docs/demo.gif (${frames.length} frames)`);
} finally {
  await browser.close();
  await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
}
