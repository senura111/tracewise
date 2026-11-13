/** Rules for errors raised while the program runs. */
import type { ErrorContext, ExplainRule } from "../types";
import {
  assignmentLines,
  closestName,
  definedFunctions,
  functionLine,
  identifiers,
  namesOnLine,
  rawInputAssignment,
  replaceWord,
} from "./helpers";

const NOT_DEFINED = /name '(\w+)' is not defined(?:\. Did you mean: '(\w+)'\?)?/;

const BUILTINS = new Set(
  "print input len max min sum str int float list dict range round abs sorted type bool set".split(" "),
);

const KIND: Record<string, string> = {
  str: "text (a `str`)",
  int: "a whole number (an `int`)",
  float: "a decimal number (a `float`)",
  list: "a list",
  dict: "a dictionary",
  tuple: "a tuple",
  NoneType: "`None`",
  bool: "`True`/`False` (a `bool`)",
};
const kind = (type: string) => KIND[type] ?? `a \`${type}\``;

const METHODS: Record<string, string[]> = {
  str: "upper lower strip split replace find count startswith endswith isdigit isalpha islower isupper join title capitalize".split(" "),
  list: "append insert pop remove sort reverse index count extend clear copy".split(" "),
  dict: "get keys values items pop update setdefault clear copy".split(" "),
};

/**
 * Finds the function that produced a None: either called on the error line,
 * or called on the line that last assigned a variable used on the error line.
 */
function noneSource({ code, lines, lineText, error }: ErrorContext): { fn: string; via?: { name: string; line: number } } | null {
  const functions = definedFunctions(code);
  const calls = (text: string) => functions.find((f) => new RegExp(`\\b${f}\\s*\\(`).test(text));

  const direct = calls(lineText);
  if (direct) return { fn: direct };

  for (const name of namesOnLine(lineText)) {
    const line = assignmentLines(lines, name)
      .filter((n) => n < (error.line ?? Infinity))
      .at(-1);
    const fn = line ? calls(lines[line - 1]) : undefined;
    if (line && fn) return { fn, via: { name, line } };
  }
  return null;
}

/** True if the body of the function defined on `defLine` contains a `return`. */
function functionReturns(lines: string[], defLine: number): boolean {
  const indent = (text: string) => text.length - text.trimStart().length;
  const defIndent = indent(lines[defLine - 1]);
  for (const text of lines.slice(defLine)) {
    if (text.trim() === "") continue;
    if (indent(text) <= defIndent) break;
    if (/^\s*return\b/.test(text)) return true;
  }
  return false;
}

export const RUNTIME_RULES: ExplainRule[] = [
  // ---- NameError ------------------------------------------------------------
  {
    id: "name/wrong-case",
    types: ["NameError"],
    match: NOT_DEFINED,
    when: (_ctx, m) => !!m![2] && m![2].toLowerCase() === m![1].toLowerCase(),
    explain: ({ lineText }, m) => ({
      title: `Check the capital letters: \`${m![2]}\`, not \`${m![1]}\``,
      message: `Python is case-sensitive, so \`${m![1]}\` and \`${m![2]}\` are different names. Python knows \`${m![2]}\`.`,
      fix: replaceWord(lineText.trim(), m![1], m![2]),
    }),
    examples: ["Print('hi')", "x = true"],
  },
  {
    id: "name/used-before-set",
    types: ["NameError"],
    match: NOT_DEFINED,
    when: ({ lines, error }, m) => assignmentLines(lines, m![1]).some((n) => n >= (error.line ?? 0)),
    explain: ({ lines, error }, m) => {
      const name = m![1];
      const setAt = assignmentLines(lines, name).find((n) => n >= (error.line ?? 0))!;
      if (setAt === error.line) {
        return {
          title: `\`${name}\` doesn't have a value yet`,
          message: `This line uses \`${name}\` to work out its new value, but \`${name}\` doesn't exist yet. Give it a starting value before this line, for example \`${name} = 0\`.`,
        };
      }
      return {
        title: `\`${name}\` is used before it has a value`,
        message: `Python runs your code from top to bottom. On line ${error.line}, \`${name}\` doesn't have a value yet: it's only set on line ${setAt}. Move that line up, or give \`${name}\` a starting value earlier.`,
        fixLine: setAt,
      };
    },
    examples: ["print(total)\ntotal = 5", "for i in range(3):\n    count += 1"],
  },
  {
    id: "name/typo",
    types: ["NameError"],
    match: NOT_DEFINED,
    when: ({ code }, m) => closestName(m![1], identifiers(code)) !== null,
    explain: ({ code, lineText }, m) => {
      const suggestion = closestName(m![1], identifiers(code))!;
      return {
        title: `Did you mean \`${suggestion}\`?`,
        message: `There's no variable called \`${m![1]}\`, but there is one called \`${suggestion}\`. Check the spelling: to Python, different spellings are different names.`,
        fix: replaceWord(lineText.trim(), m![1], suggestion),
      };
    },
    examples: ["name = 'a'\nprint(nmae)", "total = 5\nprint(totl)"],
  },
  {
    id: "name/unknown",
    types: ["NameError"],
    match: NOT_DEFINED,
    explain: (_ctx, m) => ({
      title: `Python doesn't know \`${m![1]}\``,
      message: `There's no variable or function called \`${m![1]}\`. If you meant the text ${m![1]}, put it in quotes: \`"${m![1]}"\`. If it's a variable, check its spelling and make sure it gets a value on an earlier line.`,
    }),
    examples: ["print(hello)"],
  },

  // ---- TypeError: text vs numbers ---------------------------------------------
  {
    id: "type/input-not-converted",
    types: ["TypeError"],
    match:
      /can only concatenate str \(not "(?:int|float)"\) to str|unsupported operand type\(s\) for .+?: '(?:int|float|str)' and '(?:int|float|str)'|'[<>]=?' not supported between instances of '(?:str|int|float)' and '(?:str|int|float)'|can't multiply sequence by non-int of type 'str'/,
    when: ({ error, lines, lineText }) =>
      error.message.includes("str") && rawInputAssignment(lines, namesOnLine(lineText)) !== null,
    explain: ({ lines, lineText }) => {
      const { name, line } = rawInputAssignment(lines, namesOnLine(lineText))!;
      return {
        title: `\`${name}\` is text, not a number`,
        message: `\`input()\` always gives back text, even when someone types digits, so \`${name}\` holds something like \`"3"\` rather than the number 3. Python can't do maths with text. Turn it into a number where you read it, on line ${line}.`,
        fix: lines[line - 1].trim().replace(/\binput\s*\((.*)\)\s*$/, "int(input($1))"),
        fixLine: line,
      };
    },
    examples: [
      "shift = input()\nposition = 1\nnew = position + shift",
      'age = input()\nif age < 18:\n    print("child")',
      "n = input()\nprint(n + 1)",
    ],
  },
  {
    id: "type/text-plus-number",
    types: ["TypeError"],
    match: /can only concatenate str \(not "(int|float)"\) to str/,
    explain: () => ({
      title: "Text and a number can't be joined with `+`",
      message:
        '`+` can join two pieces of text, or add two numbers, but not one of each. To put a number into text, turn it into text with `str(...)`, or use an f-string: `f"Age: {age}"`.',
    }),
    examples: ['age = 5\nprint("Age: " + age)'],
  },
  {
    id: "type/number-and-text",
    types: ["TypeError"],
    match: /unsupported operand type\(s\) for ([^:]+): '(?:(int|float)' and 'str|str' and '(int|float))'/,
    explain: (_ctx, m) => ({
      title: `A number and text can't be combined with \`${m![1].trim()}\``,
      message:
        "One side is a number and the other is text. If the text holds digits (for example from `input()`), turn it into a number with `int(...)`. If you're building a message, turn the number into text with `str(...)`.",
    }),
    examples: ['x = 5 + "a"', 'print("5" - 2)'],
  },
  {
    id: "type/compare-text-and-number",
    types: ["TypeError"],
    match: /'([<>]=?)' not supported between instances of '(str|int|float)' and '(str|int|float)'/,
    explain: () => ({
      title: "Text and a number can't be compared",
      message:
        "Python can't tell whether text is bigger or smaller than a number. If the text came from `input()`, turn it into a number first with `int(...)`.",
    }),
    examples: ['age = "5"\nif age < 18:\n    print(1)'],
  },

  // ---- TypeError: functions ---------------------------------------------------
  {
    id: "type/none",
    types: ["TypeError"],
    match: /NoneType/,
    explain: (ctx) => {
      const source = noneSource(ctx);
      if (!source) {
        return {
          title: "Something here is `None`",
          message:
            "`None` is Python's \"nothing\" value. It often comes from a function that finishes without a `return`, or from a method like `.sort()` that changes a list but gives back `None`.",
        };
      }
      const { fn, via } = source;
      const defLine = functionLine(ctx.lines, fn);
      const returns = defLine !== null && functionReturns(ctx.lines, defLine);
      const why = returns
        ? `\`${fn}\` can reach its end without a \`return\`, and then it gives back \`None\`. Check that every path through it returns a value.`
        : `\`${fn}\` finishes without a \`return\`, so it gives back \`None\`. End it by returning its answer, for example \`return result\`, rather than printing it.`;
      return {
        title: via ? `\`${via.name}\` is \`None\`` : `\`${fn}()\` gave back \`None\``,
        message: via
          ? `\`${via.name}\` got its value from \`${fn}()\` on line ${via.line}. \`None\` is Python's "nothing" value: ${why}`
          : `\`None\` is Python's "nothing" value. ${why}`,
        fixLine: defLine,
      };
    },
    examples: [
      'def f():\n    pass\nprint(f"{f():.1f}")',
      "def double(x):\n    print(x * 2)\ny = double(3) + 1",
      'def to_f(c):\n    pass\n\nc = float(input())\nf = to_f(c)\nprint(f"{f:.1f}")',
    ],
  },
  {
    id: "type/shadowed-builtin",
    types: ["TypeError"],
    match: /'(\w+)' object is not callable/,
    when: ({ lines, lineText }) =>
      namesOnLine(lineText).some((n) => BUILTINS.has(n) && assignmentLines(lines, n).length > 0),
    explain: ({ lines, lineText }) => {
      const name = namesOnLine(lineText).find((n) => BUILTINS.has(n) && assignmentLines(lines, n).length > 0)!;
      const line = assignmentLines(lines, name)[0];
      return {
        title: `\`${name}\` was replaced by a variable`,
        message: `On line ${line} you stored a value in a variable called \`${name}\`, which hides Python's built-in \`${name}()\` function. Give your variable a different name, such as \`${name}_value\`.`,
        fixLine: line,
      };
    },
    examples: ["max = 5\nprint(max(1, 2))", "sum = 0\nfor n in [1, 2]:\n    sum = sum + n\nprint(sum([1, 2]))"],
  },
  {
    id: "type/not-callable",
    types: ["TypeError"],
    match: /'(\w+)' object is not callable/,
    explain: (_ctx, m) => ({
      title: "Brackets after something that isn't a function",
      message: `Brackets \`( )\` straight after a name mean "call this function", but here the value before the brackets is ${kind(m![1])}. If you meant to multiply, write the \`*\`: \`x * (3 + 4)\`.`,
    }),
    examples: ["x = 2\ny = x(3 + 4)"],
  },
  {
    id: "type/argument-count",
    types: ["TypeError"],
    match:
      /(\w+)\(\) (?:takes (\d+) positional arguments? but (\d+) (?:was|were) given|missing (\d+) required positional arguments?: (.+))/,
    explain: ({ lines }, m) => {
      const fn = m![1];
      const defLine = functionLine(lines, fn);
      const where = defLine ? ` (line ${defLine})` : "";
      return m![2]
        ? {
            title: `\`${fn}()\` was given too many values`,
            message: `\`${fn}\` is defined${where} to take ${m![2]}, but this line passes ${m![3]}. The values in the brackets when you call it must match the names in its \`def\` line.`,
            fixLine: defLine,
          }
        : {
            title: `\`${fn}()\` is missing a value`,
            message: `\`${fn}\` needs a value for ${m![5].replace(/'/g, "`")}${where}, but this call doesn't give one. Add it inside the brackets when you call \`${fn}\`.`,
            fixLine: defLine,
          };
    },
    examples: ["def f(a):\n    return a\nf(1, 2)", "def f(a, b):\n    return a\nf(1)"],
  },

  // ---- TypeError: other common ones --------------------------------------------
  {
    id: "type/string-is-unchangeable",
    types: ["TypeError"],
    match: /'str' object does not support item assignment/,
    explain: () => ({
      title: "Text can't be changed one letter at a time",
      message:
        "Strings can't be edited in place. Build a new string instead, for example `result = result + letter`, or use `.replace()`.",
    }),
    examples: ['s = "abc"\ns[0] = "x"'],
  },
  {
    id: "type/loop-over-number",
    types: ["TypeError"],
    match: /'(int|float)' object is not iterable/,
    explain: () => ({
      title: "A `for` loop can't go through a number",
      message:
        "`for` loops go through a collection: a list, a string or a `range`. To repeat something `n` times, loop over `range(n)`.",
      fix: "for i in range(n):",
    }),
    examples: ["for i in 5:\n    print(i)"],
  },
  {
    id: "type/len-of-number",
    types: ["TypeError"],
    match: /object of type '(int|float)' has no len\(\)/,
    explain: () => ({
      title: "A number doesn't have a length",
      message:
        "`len()` counts the items in a list or the characters in text. A number has no length. To count its digits, turn it into text first: `len(str(n))`.",
    }),
    examples: ["print(len(5))"],
  },
  {
    id: "type/index-not-whole-number",
    types: ["TypeError"],
    match: /(?:list|string|str|tuple) indices must be integers/,
    explain: () => ({
      title: "Positions must be whole numbers",
      message:
        "To get an item by its position, use a whole number, like `items[0]`. If the position came from `input()`, use `int(...)`. If it came from dividing with `/`, use `//` instead.",
    }),
    examples: ['nums = [1, 2]\nprint(nums["0"])', "nums = [1, 2, 3]\nprint(nums[3 / 2])"],
  },
  {
    id: "type/repeat-text",
    types: ["TypeError"],
    match: /can't multiply sequence by non-int of type '(\w+)'/,
    explain: (_ctx, m) => ({
      title: "Text can only be repeated a whole number of times",
      message: `\`"ab" * 3\` repeats text 3 times, but here the number of repeats is ${kind(m![1])}. If it came from \`input()\`, turn it into a number with \`int(...)\`.`,
    }),
    examples: ['print("a" * "3")'],
  },

  // ---- ValueError ---------------------------------------------------------------
  {
    id: "value/int-of-decimal",
    types: ["ValueError"],
    match: /invalid literal for int\(\) with base 10: '(-?\d*\.\d+)'/,
    explain: (_ctx, m) => ({
      title: "`int()` needs a whole number",
      message: `\`int()\` can't turn \`'${m![1]}'\` into a number because it has a decimal point. Use \`float(...)\` for numbers with decimals.`,
    }),
    examples: ['n = int("3.5")'],
  },
  {
    id: "value/int-of-nothing",
    types: ["ValueError"],
    match: /invalid literal for int\(\) with base 10: ''/,
    explain: () => ({
      title: "There was no number to read",
      message:
        "`int()` was given empty text. That happens when an input line is blank. Check the input you typed, or that you're reading the line you think you are.",
    }),
    examples: ['n = int("")'],
  },
  {
    id: "value/int-of-text",
    types: ["ValueError"],
    match: /invalid literal for int\(\) with base 10: '(.*)'/,
    explain: (_ctx, m) => ({
      title: `\`'${m![1]}'\` isn't a whole number`,
      message: `\`int()\` turns text made of digits, like \`"42"\`, into a number. It can't understand \`'${m![1]}'\`. If you typed the input, type digits instead. If this text isn't meant to be a number, don't wrap it in \`int()\`.`,
    }),
    examples: ['n = int("seven")'],
  },
  {
    id: "value/float-of-text",
    types: ["ValueError"],
    match: /could not convert string to float: '(.*)'/,
    explain: (_ctx, m) => ({
      title: `\`'${m![1]}'\` isn't a number`,
      message: `\`float()\` turns text like \`"21.5"\` into a number. It can't understand \`'${m![1]}'\`. Check the input, or whether this value should be a number at all.`,
    }),
    examples: ['n = float("abc")'],
  },

  // ---- IndexError / KeyError / ZeroDivisionError -----------------------------------
  {
    id: "index/out-of-range",
    types: ["IndexError"],
    match: /(list|string|tuple) index out of range/,
    explain: (_ctx, m) => {
      const what = m![1] === "string" ? "text" : `a ${m![1]}`;
      return {
        title: "That position doesn't exist",
        message: `Positions (indexes) start at 0, so in ${what} with 3 items the last one is at position 2. Check for an off-by-one: a position one too high, a loop that goes one step too far, or ${what} that's shorter (or empty) than you expected.`,
      };
    },
    examples: ["scores = [3, 5, 8]\nprint(scores[3])", 's = "abc"\nprint(s[5])'],
  },
  {
    id: "key/missing",
    types: ["KeyError"],
    explain: ({ error, lineText }) => {
      const key = error.message || "that key";
      return /\+=|-=/.test(lineText)
        ? {
            title: `\`${key}\` isn't in the dictionary yet`,
            message:
              "You can only add to a count that already exists. Check first with `if word in counts:` and set new keys to 1, or write `counts[word] = counts.get(word, 0) + 1`.",
          }
        : {
            title: `\`${key}\` isn't in the dictionary`,
            message: `You looked up \`${key}\`, but it isn't one of the dictionary's keys. Check the spelling, or use \`in\` to check before looking it up.`,
          };
    },
    examples: ['counts = {}\ncounts["the"] += 1', 'ages = {"ada": 36}\nprint(ages["bob"])'],
  },
  {
    id: "zero/division",
    types: ["ZeroDivisionError"],
    explain: ({ lineText }) => ({
      title: "Dividing by zero",
      message:
        "Nothing can be divided by 0, and `%` by 0 has no remainder. Check the value on the right of `/`, `//` or `%`." +
        (lineText.includes("len(") ? " Here it's a `len(...)`, so the list or text may be empty." : ""),
    }),
    examples: ["print(5 / 0)", "nums = []\nprint(sum(nums) / len(nums))"],
  },

  // ---- AttributeError ------------------------------------------------------------
  {
    id: "attr/length",
    types: ["AttributeError"],
    match: /object has no attribute '(len|length|lenght|size)'/,
    explain: () => ({
      title: "Use `len(...)` for the length",
      message: "In Python, the length of a list or text comes from the `len()` function: `len(items)`, not `items.length`.",
    }),
    examples: ["nums = [1]\nprint(nums.lenght)"],
  },
  {
    id: "attr/append-to-text",
    types: ["AttributeError"],
    match: /'str' object has no attribute 'append'/,
    explain: () => ({
      title: "Text has no `.append()`",
      message: "`.append()` is for lists. To add to text, join it with `+`: `result = result + letter` (or `result += letter`).",
    }),
    examples: ['s = "a"\ns.append("b")'],
  },
  {
    id: "attr/method-typo",
    types: ["AttributeError"],
    match: /'(str|list|dict)' object has no attribute '(\w+)'/,
    when: (_ctx, m) => closestName(m![2], METHODS[m![1]]) !== null,
    explain: ({ lineText }, m) => {
      const suggestion = closestName(m![2], METHODS[m![1]])!;
      return {
        title: `Did you mean \`.${suggestion}()\`?`,
        message: `${kind(m![1]).replace(/^./, (c) => c.toUpperCase())} has no \`.${m![2]}\`, but it does have \`.${suggestion}()\`. Check the spelling.`,
        fix: replaceWord(lineText.trim(), m![2], suggestion),
      };
    },
    examples: ['s = "a"\nprint(s.uper())', "x = [1]\nx.apend(2)"],
  },
  {
    id: "attr/wrong-kind-of-value",
    types: ["AttributeError"],
    match: /'(\w+)' object has no attribute '(\w+)'/,
    explain: (_ctx, m) => ({
      title: `${kind(m![1]).replace(/^./, (c) => c.toUpperCase())} has no \`.${m![2]}\``,
      message:
        `Each kind of value has its own methods. Here the value is ${kind(m![1])}, which has no \`.${m![2]}\`. Check what this variable holds at this point.` +
        (m![1] === "list" && m![2] === "add" ? " To add to a list, use `.append()`." : ""),
    }),
    examples: ["x = [1]\nx.add(2)", "n = 5\nn.lower()"],
  },

  // ---- Functions and scope ---------------------------------------------------------
  {
    id: "scope/unbound-local",
    types: ["UnboundLocalError"],
    match: /cannot access local variable '(\w+)'/,
    explain: (_ctx, m) => ({
      title: `\`${m![1]}\` inside the function isn't the one outside`,
      message: `Because this function assigns to \`${m![1]}\`, Python treats \`${m![1]}\` inside it as a new, separate variable, and that one has no value yet. Pass the value in as a parameter and \`return\` the new value instead.`,
    }),
    examples: ["count = 0\ndef bump():\n    count += 1\nbump()"],
  },
  {
    id: "recursion/too-deep",
    types: ["RecursionError"],
    explain: () => ({
      title: "A function keeps calling itself",
      message:
        "The function calls itself again and again without stopping, until Python gives up. A function that calls itself needs a case where it returns an answer without calling itself again.",
    }),
    examples: ["def f(n):\n    return f(n)\nf(1)"],
  },
  {
    id: "import/not-found",
    types: ["ModuleNotFoundError"],
    match: /No module named '([\w.]+)'/,
    explain: (_ctx, m) => ({
      title: `Python can't find \`${m![1]}\``,
      message:
        "Check the spelling of the module name. Tracewise includes Python's standard library, so modules like `math` and `random` work, but extra packages aren't installed.",
    }),
    examples: ["import numpyy"],
  },
];
