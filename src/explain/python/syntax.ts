/** Rules for errors Python finds before running anything: SyntaxError, IndentationError, TabError. */
import type { ExplainRule } from "../types";

const CLOSING: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

export const SYNTAX_RULES: ExplainRule[] = [
  {
    id: "syntax/assign-in-condition",
    types: ["SyntaxError"],
    match: /Maybe you meant '=='/,
    explain: ({ lineText }) => ({
      title: "Use `==` to compare",
      message:
        "A single `=` stores a value in a variable. To check whether two values are equal, Python needs a double `==`.",
      fix: lineText.trim().replace(/(?<![=!<>])=(?!=)/, "=="),
    }),
    examples: ["x = 5\nif x = 5:\n    print(x)", "x = 5\nif x % 2 = 0:\n    print(x)"],
  },
  {
    id: "syntax/missing-colon",
    types: ["SyntaxError"],
    match: /expected ':'/,
    explain: ({ lineText }) => ({
      title: "This line needs a colon at the end",
      message:
        "Lines that start a block, such as `if`, `elif`, `else`, `for`, `while` and `def`, must end with a colon `:`. The indented lines below it belong to that block.",
      fix: lineText.trimEnd().endsWith(":") ? undefined : `${lineText.trim()}:`,
    }),
    examples: ["x = 4\nif x > 3\n    print(x)", "for i in range(3)\n    print(i)"],
  },
  {
    id: "syntax/never-closed",
    types: ["SyntaxError"],
    match: /'([([{])' was never closed/,
    explain: (_ctx, m) => ({
      title: `A \`${m![1]}\` is never closed`,
      message:
        `This line opens a \`${m![1]}\` but never closes it with \`${CLOSING[m![1]]}\`. ` +
        "Every opening bracket needs a matching closing one, so count them on this line.",
    }),
    examples: ['print("hi"', "nums = [1, 2,\nprint(nums)", "x = 1\nprint((x + 2)\ny = 3"],
  },
  {
    id: "syntax/unmatched",
    types: ["SyntaxError"],
    match: /unmatched '([)\]}])'/,
    explain: (_ctx, m) => ({
      title: `There's an extra \`${m![1]}\``,
      message: `This line has a closing \`${m![1]}\` with no opening bracket to match it. Remove the extra one, or add the missing opening bracket.`,
    }),
    examples: ["print(1))"],
  },
  {
    id: "syntax/mismatched-brackets",
    types: ["SyntaxError"],
    match: /closing parenthesis '(.)' does not match opening parenthesis '(.)'/,
    explain: (_ctx, m) => ({
      title: "The brackets don't match",
      message: `A \`${m![2]}\` is closed with \`${m![1]}\`. Each kind of bracket must be closed by the same kind: \`( )\`, \`[ ]\` or \`{ }\`.`,
    }),
    examples: ["print([1, 2)"],
  },
  {
    id: "syntax/unterminated-string",
    types: ["SyntaxError"],
    match: /unterminated (?:triple-quoted )?string literal/,
    explain: () => ({
      title: "A piece of text isn't closed",
      message:
        "Text (a string) starts with a quote here but doesn't end with a matching one on the same line. " +
        'Use the same kind of quote at both ends: `"like this"` or `\'like this\'`.',
    }),
    examples: ['print("hello)', "print('hello)"],
  },
  {
    id: "syntax/missing-comma",
    types: ["SyntaxError"],
    match: /Perhaps you forgot a comma/,
    explain: () => ({
      title: "Is a comma missing?",
      message:
        "Python found two values side by side with nothing between them. When you list several values, " +
        'for example in `print(...)` or in a list `[...]`, separate them with commas: `print("Hi", name)`.',
    }),
    examples: ['name = "a"\nprint("Hi" name)', "nums = [1 2 3]"],
  },
  {
    id: "syntax/print-brackets",
    types: ["SyntaxError"],
    match: /Missing parentheses in call to 'print'/,
    explain: ({ lineText }) => ({
      title: "`print` needs brackets",
      message: "In Python 3, `print` is a function, so whatever you print goes inside brackets.",
      fix: lineText.trim().replace(/^print\s+(.*)$/, "print($1)"),
    }),
    examples: ['print "hi"'],
  },
  {
    id: "syntax/curly-quotes",
    types: ["SyntaxError"],
    match: /invalid character '([“”‘’])'/,
    explain: ({ lineText }, m) => ({
      title: "Curly quotes aren't Python quotes",
      message: `This line has a curly quote \`${m![1]}\`, which usually comes from copying code out of a document or web page. Python only understands straight quotes: \`"\` or \`'\`.`,
      fix: lineText.trim().replace(/[“”]/g, '"').replace(/[‘’]/g, "'"),
    }),
    examples: ["print(“hi”)"],
  },
  {
    id: "syntax/invalid-character",
    types: ["SyntaxError"],
    match: /invalid character '(.)'/,
    explain: (_ctx, m) => ({
      title: `\`${m![1]}\` isn't part of Python`,
      message: `This line contains \`${m![1]}\`, which Python doesn't understand. Delete it, or retype it with the keyboard (for example, multiply is \`*\`).`,
    }),
    examples: ["x = 5 × 2"],
  },
  {
    id: "syntax/return-outside-function",
    types: ["SyntaxError"],
    match: /'return' outside function/,
    explain: () => ({
      title: "`return` only works inside a function",
      message:
        "`return` sends a value back from a function, so it must be indented inside a `def`. " +
        "Outside a function, use `print()` to show a value instead.",
    }),
    examples: ["return 5", "def double(x):\n    y = x * 2\nreturn y"],
  },
  {
    id: "indent/expected-block",
    types: ["IndentationError"],
    match: /expected an indented block after (.+?) on line (\d+)/,
    explain: ({ lineText }, m) => {
      const what = m![1].replace(/'(\w+)' statement/, "`$1`").replace("function definition", "`def`");
      return {
        title: `Indent the code that belongs to the ${what}`,
        message: `The ${what} on line ${m![2]} must be followed by at least one indented line. Indent the lines that belong to it by 4 spaces (press Tab).`,
        fix: lineText.trim() ? `    ${lineText.trim()}` : undefined,
      };
    },
    examples: ["if True:\nprint(1)", "for i in range(3):\nprint(i)", "def f():\nreturn 1"],
  },
  {
    id: "indent/unexpected",
    types: ["IndentationError"],
    match: /unexpected indent/,
    explain: ({ lineText }) => ({
      title: "This line is indented, but it shouldn't be",
      message:
        "This line starts with spaces, but it isn't inside an `if`, a loop or a function. Move it back so it lines up with the line above.",
      fix: lineText.trim(),
    }),
    examples: ["x = 1\n    y = 2"],
  },
  {
    id: "indent/mismatch",
    types: ["IndentationError"],
    match: /unindent does not match any outer indentation level/,
    explain: () => ({
      title: "The indentation doesn't line up",
      message:
        "This line is indented by a different amount than the lines around it. Lines in the same block must start in exactly the same column. Use 4 spaces for each level.",
    }),
    examples: ["if True:\n    x = 1\n  y = 2"],
  },
  {
    id: "indent/tabs-and-spaces",
    types: ["TabError"],
    match: /inconsistent use of tabs and spaces/,
    explain: () => ({
      title: "Tabs and spaces are mixed",
      message:
        "Some lines are indented with a Tab character and others with spaces, so Python can't tell how they line up. Re-indent this block using spaces only.",
    }),
    examples: ["if True:\n\tx = 1\n        y = 2"],
  },
];
