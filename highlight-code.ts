/**
 * Build-time syntax highlighting for Python and C++ code blocks in challenge
 * Markdown (walkthroughs and hints). Uses the same Lezer parsers as the
 * editor, and emits `tok-*` classes that global.css colours with the
 * editor's palette.
 */
import { parser as cppParser } from "@lezer/cpp";
import { classHighlighter, highlightTree } from "@lezer/highlight";
import { parser as pythonParser } from "@lezer/python";

const PARSERS = { python: pythonParser, py: pythonParser, cpp: cppParser, "c++": cppParser };

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Highlighted HTML for a code block, or null if the language isn't supported. */
export function highlightCode(code: string, language: string | undefined): string | null {
  const parser = PARSERS[(language ?? "") as keyof typeof PARSERS];
  if (!parser) return null;
  let html = "";
  let position = 0;
  highlightTree(parser.parse(code), classHighlighter, (from, to, classes) => {
    if (from > position) html += escapeHtml(code.slice(position, from));
    html += `<span class="${classes}">${escapeHtml(code.slice(from, to))}</span>`;
    position = to;
  });
  return html + escapeHtml(code.slice(position));
}
