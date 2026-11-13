/** Helpers for looking at C++ code from inside explanation rules. */

const KEYWORDS = new Set(
  (
    "alignas alignof and auto bool break case catch char class const constexpr continue decltype default delete do " +
    "double else enum explicit extern false float for friend goto if inline int long namespace new noexcept not nullptr " +
    "operator or private protected public return short signed sizeof static struct switch template this throw true try " +
    "typedef typename union unsigned using virtual void volatile while include std main"
  ).split(" "),
);

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Removes comments, string and character literals, and #include lines. */
export function stripCode(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, "")
    .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""')
    .replace(/^\s*#.*$/gm, "");
}

/** True if the program defines a main function (needed before compiling). */
export function hasMain(code: string): boolean {
  return /\bmain\s*\(/.test(stripCode(code));
}

/** Identifiers used in the code, minus C++ keywords. */
export function cppIdentifiers(code: string): Set<string> {
  const names = stripCode(code).match(/\b[A-Za-z_]\w*\b/g) ?? [];
  return new Set(names.filter((n) => !KEYWORDS.has(n)));
}

/** True if `#include <header>` appears in the code. */
export function includes(code: string, header: string): boolean {
  return new RegExp(`^\\s*#\\s*include\\s*<${escapeRegExp(header)}>`, "m").test(code);
}

/** Line (1-based) where function `name` is defined, e.g. `int twice(int x) {`. */
export function cppFunctionLine(lines: string[], name: string): number | null {
  const pattern = new RegExp(`^\\s*[\\w:<>,\\s]+?\\b${escapeRegExp(name)}\\s*\\([^;]*$`);
  const index = lines.findIndex((text) => pattern.test(text) && !/^\s*(return|cout|if|while)\b/.test(text));
  return index === -1 ? null : index + 1;
}

/** Line (1-based) where variable `name` is declared, e.g. `int total;`. */
export function declarationLine(lines: string[], name: string): number | null {
  const pattern = new RegExp(`^\\s*(?:const\\s+)?[\\w:<>]+\\s+(?:[\\w\\s,=]*,\\s*)?${escapeRegExp(name)}\\b\\s*[;,=]`);
  const index = lines.findIndex((text) => pattern.test(text));
  return index === -1 ? null : index + 1;
}

/** Name of a function whose body calls itself, or null. */
export function recursiveFunction(code: string): string | null {
  const text = stripCode(code);
  for (const match of text.matchAll(/\b[\w:<>]+\s+(\w+)\s*\([^)]*\)\s*\{/g)) {
    const name = match[1];
    if (["if", "while", "for", "switch", "main"].includes(name)) continue;
    // Walk to the matching closing brace of this function's body.
    let depth = 0;
    let i = match.index + match[0].length - 1;
    const bodyStart = i;
    for (; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}" && --depth === 0) break;
    }
    if (new RegExp(`\\b${name}\\s*\\(`).test(text.slice(bodyStart, i))) return name;
  }
  return null;
}

/** The standard header that provides a name beginners commonly use. */
export const HEADER_FOR: Record<string, string> = {
  std: "iostream",
  cout: "iostream",
  cin: "iostream",
  endl: "iostream",
  getline: "string",
  string: "string",
  to_string: "string",
  stoi: "string",
  stod: "string",
  setprecision: "iomanip",
  fixed: "iomanip",
  setw: "iomanip",
  sqrt: "cmath",
  pow: "cmath",
  round: "cmath",
  vector: "vector",
  map: "map",
  sort: "algorithm",
  reverse: "algorithm",
  max: "algorithm",
  min: "algorithm",
};
