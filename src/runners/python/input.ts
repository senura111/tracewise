/** Splits a test's stdin into the lines that successive input() calls return. */
export function splitInputLines(stdin: string): string[] {
  if (stdin === "") return [];
  const lines = stdin.replace(/\r\n/g, "\n").split("\n");
  // "a\nb\n" means two lines, not two lines plus an empty third one.
  if (lines.at(-1) === "") lines.pop();
  return lines;
}
