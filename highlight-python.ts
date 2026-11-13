/**
 * Build-time syntax highlighting for Python code blocks in challenge Markdown
 * (walkthroughs and hints). Uses the same Lezer parser as the editor, and
 * emits `tok-*` classes that global.css colours with the editor's palette.
 */
import { classHighlighter, highlightTree } from "@lezer/highlight";
import { parser } from "@lezer/python";

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function highlightPython(code: string): string {
  let html = "";
  let position = 0;
  highlightTree(parser.parse(code), classHighlighter, (from, to, classes) => {
    if (from > position) html += escapeHtml(code.slice(position, from));
    html += `<span class="${classes}">${escapeHtml(code.slice(from, to))}</span>`;
    position = to;
  });
  return html + escapeHtml(code.slice(position));
}
