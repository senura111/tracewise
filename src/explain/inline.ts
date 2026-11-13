/** Splits text with `backtick` code spans into plain and code parts. */
export function splitInlineCode(text: string): { text: string; code: boolean }[] {
  return text
    .split(/`([^`]+)`/)
    .map((part, i) => ({ text: part, code: i % 2 === 1 }))
    .filter((part) => part.text !== "");
}
