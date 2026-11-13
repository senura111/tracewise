/**
 * Rules for C++: compile errors and warnings from Clang, and crashes while
 * running. Messages are matched against what Clang 22 really prints; every
 * rule's examples are checked by `npm run check:explainer`.
 */
import { closestName, replaceWord } from "../python/helpers";
import type { ExplainRule } from "../types";
import { HEADER_FOR, cppFunctionLine, cppIdentifiers, declarationLine, includes, recursiveFunction } from "./helpers";

const E = ["CompileError"];
const W = ["CompileWarning"];
const R = ["RuntimeError"];
const I = "#include <iostream>\n#include <string>\nusing namespace std;\n";

const UNDECLARED = /use of undeclared identifier '(\w+)'/;

export const CPP_RULES: ExplainRule[] = [
  // ---- Missing pieces -------------------------------------------------------------
  {
    id: "cpp/no-main",
    types: E,
    match: /^no main function$/,
    explain: () => ({
      title: "Every C++ program needs `int main()`",
      message:
        "C++ starts running your program at the function called `main`. Add it, and put your code inside its braces: `int main() { ... }`.",
    }),
    examples: [I + "int mian() {\n    return 0;\n}\n"],
  },
  {
    id: "cpp/missing-semicolon",
    types: E,
    match: /expected ';'/,
    explain: ({ lineText }) => {
      const text = lineText.trimEnd();
      return {
        title: "Missing semicolon `;`",
        message:
          "In C++ every statement ends with a semicolon `;`. (Python doesn't need them, but C++ does.) Add one at the end of this line.",
        fix: text && !/[;{}]$/.test(text) ? `${text.trim()};` : undefined,
      };
    },
    examples: [I + 'int main() {\n    cout << "hi"\n    return 0;\n}\n', I + "int main() {\n    int x = 5\n    cout << x;\n}\n"],
  },
  {
    id: "cpp/missing-include",
    types: E,
    match: /use of undeclared identifier '(\w+)'|unknown type name '(\w+)'/,
    when: ({ code }, m) => {
      const name = m![1] ?? m![2];
      return name in HEADER_FOR && !includes(code, HEADER_FOR[name]);
    },
    explain: (_ctx, m) => {
      const name = m![1] ?? m![2];
      const header = HEADER_FOR[name];
      return {
        title: `Add \`#include <${header}>\``,
        message:
          name === "std"
            ? "`std::cout` and friends come from the `<iostream>` library, which has to be included at the top of the program."
            : `\`${name}\` comes from the \`<${header}>\` library. Add \`#include <${header}>\` at the top of your program, with the other \`#include\` lines.`,
        fix: `#include <${header}>`,
        fixLine: 1,
      };
    },
    examples: ["int main() {\n    std::cout << 1;\n}\n", I + "int main() {\n    cout << setprecision(2) << 1.5;\n}\n"],
  },
  {
    id: "cpp/needs-std",
    types: E,
    match: /(?:use of undeclared identifier|unknown type name) '(\w+)'; did you mean 'std::\1'\?/,
    explain: (_ctx, m) => ({
      title: `\`${m![1]}\` lives in \`std\``,
      message: `Names from C++'s standard library, like \`cout\`, \`cin\` and \`string\`, belong to the \`std\` namespace. Write \`std::${m![1]}\`, or add \`using namespace std;\` once after your \`#include\` lines.`,
      fix: "using namespace std;",
    }),
    examples: ["#include <iostream>\nint main() {\n    cout << 1;\n}\n", "#include <string>\nint main() {\n    string s;\n}\n"],
  },
  {
    id: "cpp/compiler-suggestion",
    types: E,
    match: /use of undeclared identifier '(\w+)'; did you mean '(\w+)'\?/,
    explain: ({ lineText }, m) => ({
      title: `Did you mean \`${m![2]}\`?`,
      message: `C++ doesn't know \`${m![1]}\`, but it does know \`${m![2]}\`. Check the spelling, including capital letters: C++ treats \`${m![1]}\` and \`${m![2]}\` as different names.`,
      fix: replaceWord(lineText.trim(), m![1], m![2]),
    }),
    examples: [I + "int main() {\n    Int x = 5;\n}\n"],
  },
  {
    id: "cpp/undeclared-typo",
    types: E,
    match: UNDECLARED,
    when: ({ code }, m) => closestName(m![1], cppIdentifiers(code)) !== null,
    explain: ({ code, lineText }, m) => {
      const suggestion = closestName(m![1], cppIdentifiers(code))!;
      return {
        title: `Did you mean \`${suggestion}\`?`,
        message: `There's nothing called \`${m![1]}\`, but there is a \`${suggestion}\`. Check the spelling: C++ treats different spellings, and different capital letters, as different names.`,
        fix: replaceWord(lineText.trim(), m![1], suggestion),
      };
    },
    examples: [I + "int main() {\n    int total = 0;\n    cout << totl;\n}\n"],
  },
  {
    id: "cpp/undeclared",
    types: E,
    match: UNDECLARED,
    explain: (_ctx, m) => ({
      title: `\`${m![1]}\` hasn't been declared`,
      message: `In C++ every variable must be declared with its type before it's used, for example \`int ${m![1]} = 0;\`. If you meant the text ${m![1]}, put it in double quotes: \`"${m![1]}"\`.`,
    }),
    examples: [I + "int main() {\n    total = 5;\n}\n", I + "int main() {\n    cout << hello;\n}\n"],
  },
  {
    id: "cpp/unknown-type",
    types: E,
    match: /unknown type name '(\w+)'/,
    explain: (_ctx, m) => ({
      title: `C++ doesn't know the type \`${m![1]}\``,
      message:
        "Check the spelling of the type. Common ones are `int`, `double`, `bool`, `char` and `string`. Types from a library also need that library's `#include`.",
    }),
    examples: [I + "int main() {\n    number x = 5;\n}\n"],
  },

  // ---- Brackets --------------------------------------------------------------------
  {
    id: "cpp/missing-brace",
    types: E,
    match: /expected '\}'/,
    explain: () => ({
      title: "A `{` is never closed",
      message:
        "Every `{` needs a matching `}`. Check the blocks above this point: each `if`, loop and function body that opens with `{` must close with `}`.",
    }),
    examples: [I + "int main() {\n    cout << 1;\n"],
  },
  {
    id: "cpp/extra-brace",
    types: E,
    match: /extraneous closing brace/,
    explain: () => ({
      title: "There's an extra `}`",
      message: "This `}` doesn't close anything. Remove it, or check whether a `{` is missing earlier.",
    }),
    examples: [I + "int main() {\n    cout << 1;\n}\n}\n"],
  },
  {
    id: "cpp/missing-paren",
    types: E,
    match: /expected '\)'/,
    explain: () => ({
      title: "A `(` is never closed",
      message: "This line opens a `(` without a matching `)`. Count the brackets on the line: each `(` needs a `)`.",
    }),
    examples: [I + "int main() {\n    cout << (1 + 2;\n}\n"],
  },

  // ---- Types -------------------------------------------------------------------------
  {
    id: "cpp/stream-arrows",
    types: E,
    match: /invalid operands to binary expression \('(istream|ostream)'/,
    explain: (_ctx, m) => ({
      title: m![1] === "istream" ? "`cin` reads with `>>`" : "`cout` prints with `<<`",
      message:
        m![1] === "istream"
          ? "The arrows point the way the data goes: from `cin` into your variable, so `cin >> x;`."
          : "The arrows point the way the data goes: from your value into `cout`, so `cout << x;`.",
    }),
    examples: [I + "int main() {\n    int x;\n    cin << x;\n}\n", I + "int main() {\n    cout >> 5;\n}\n"],
  },
  {
    id: "cpp/text-plus-text",
    types: E,
    match: /invalid operands to binary expression \('const char\[\d+\]' and 'const char\[\d+\]'\)/,
    explain: () => ({
      title: "Two pieces of quoted text can't be joined with `+`",
      message:
        'In C++, text in quotes is a basic character array, and two of them can\'t be added. Make the first one a `string`: `string("Hello, ") + "world"`, or print them with `<<`.',
    }),
    examples: [I + 'int main() {\n    string s = "Hello, " + "world";\n}\n'],
  },
  {
    id: "cpp/char-not-string",
    types: E,
    match: /cannot initialize a variable of type 'char' with an lvalue of type 'const char\[\d+\]'|comparison between pointer and integer/,
    explain: () => ({
      title: "Use single quotes for one character",
      message:
        "In C++, `'a'` (single quotes) is one character, a `char`, while `\"a\"` (double quotes) is text. To store or compare a single character, use single quotes.",
    }),
    examples: [I + 'int main() {\n    char c = "a";\n}\n', I + 'int main() {\n    string s = "a";\n    if (s[0] == "a") cout << 1;\n}\n'],
  },
  {
    id: "cpp/text-as-number",
    types: E,
    match:
      /no viable conversion from 'string'.* to '(int|double|float|long)'|assigning to '(int|double|float|long)' from incompatible type|cannot initialize a variable of type '(int|double|float|long)' with an (?:lvalue|rvalue) of type '(?:const char|string)/,
    explain: () => ({
      title: "Text can't be stored in a number variable",
      message:
        'Each C++ variable has a fixed type. To turn text like `"5"` into a number, use `stoi(text)` for whole numbers or `stod(text)` for decimals. `cin >> number` does the conversion for you when reading input.',
    }),
    examples: [I + 'int main() {\n    string s = "5";\n    int n = s;\n}\n', I + 'int main() {\n    int n;\n    n = "5";\n}\n'],
  },
  {
    id: "cpp/remainder-of-decimal",
    types: E,
    match: /invalid operands to binary expression \('(double|float)' and '(int|double|float)'\)|invalid operands to binary expression \('(int)' and '(double|float)'\)/,
    when: ({ lineText }) => lineText.includes("%"),
    explain: () => ({
      title: "`%` only works with whole numbers",
      message:
        "The remainder operator `%` needs two whole numbers (`int`). Use `int` variables here, or `fmod(a, b)` from `<cmath>` for decimals.",
    }),
    examples: [I + "int main() {\n    double d = 5.5;\n    cout << d % 2;\n}\n"],
  },

  // ---- Functions -----------------------------------------------------------------------
  {
    id: "cpp/argument-mismatch",
    types: E,
    match: /no matching function for call to '(\w+)'/,
    explain: ({ lines }, m) => {
      const line = cppFunctionLine(lines, m![1]);
      return {
        title: `\`${m![1]}()\` was called with the wrong values`,
        message: `The values in the brackets must match the parameters in \`${m![1]}\`'s definition${line ? ` (line ${line})` : ""}: the same number of them, of the right types.`,
        fixLine: line,
      };
    },
    examples: [
      I + "int twice(int x) { return 2 * x; }\nint main() {\n    cout << twice(1, 2);\n}\n",
      I + "int add(int a, int b) { return a + b; }\nint main() {\n    cout << add(1);\n}\n",
    ],
  },
  {
    id: "cpp/void-returns-value",
    types: E,
    match: /void function '(\w+)' should not return a value/,
    explain: (_ctx, m) => ({
      title: `\`${m![1]}\` is \`void\`, so it can't return a value`,
      message: `\`void\` means "gives nothing back". If \`${m![1]}\` should give back an answer, change \`void\` to its type, for example \`int\`.`,
    }),
    examples: [I + "void f() { return 5; }\nint main() {}\n"],
  },
  {
    id: "cpp/exceptions-disabled",
    types: E,
    match: /cannot use '(throw|try)' with exceptions disabled/,
    explain: () => ({
      title: "Exceptions aren't available here",
      message:
        "Tracewise's C++ compiler runs without exceptions, so `throw`, `try` and `catch` can't be used. Check for the problem with an `if` instead, and print a message.",
    }),
    examples: [I + "int main() {\n    throw 1;\n}\n"],
  },

  // ---- Warnings worth a beginner's attention ------------------------------------------------
  {
    id: "cpp/assign-in-condition",
    types: W,
    match: /using the result of an assignment as a condition/,
    explain: ({ lineText }) => ({
      title: "Did you mean `==`?",
      message:
        "A single `=` stores a value, so this condition changes the variable and is almost always true. To compare, use `==`.",
      fix: lineText.trim().replace(/(?<![=!<>])=(?!=)/, "=="),
    }),
    examples: [I + "int main() {\n    int x = 1;\n    if (x = 5) cout << x;\n}\n"],
  },
  {
    id: "cpp/text-plus-number",
    types: W,
    match: /adding '\w+' to a string does not append to the string/,
    explain: () => ({
      title: "`+` doesn't join text and a number",
      message:
        '`"Age: " + age` doesn\'t add the number to the text: it skips that many characters into it. With `cout`, separate the parts with `<<`: `cout << "Age: " << age;`. To build a string, use `to_string(age)`.',
    }),
    examples: [I + 'int main() {\n    int age = 5;\n    cout << "Age: " + age;\n}\n'],
  },
  {
    id: "cpp/no-starting-value",
    types: W,
    match: /variable '(\w+)' is uninitialized when used here/,
    explain: ({ lines }, m) => ({
      title: `\`${m![1]}\` has no starting value`,
      message: `In C++, declaring \`int ${m![1]};\` doesn't set it to 0: it holds whatever happened to be in memory. Give it a starting value, for example \`int ${m![1]} = 0;\`.`,
      fixLine: declarationLine(lines, m![1]),
    }),
    examples: [I + "int main() {\n    int total;\n    total += 5;\n    cout << total;\n}\n"],
  },
  {
    id: "cpp/missing-return",
    types: W,
    match: /non-void function does not return a value/,
    explain: () => ({
      title: "This function doesn't always `return` a value",
      message:
        "A function declared with a type, like `int twice(int x)`, must finish with `return` and a value. Without it, whoever called it gets garbage.",
    }),
    examples: [I + "int twice(int x) {\n    int y = x * 2;\n}\nint main() {\n    cout << twice(2);\n}\n"],
  },
  {
    id: "cpp/empty-if",
    types: W,
    match: /if statement has empty body/,
    explain: ({ lineText }) => ({
      title: "Stray `;` after `if (...)`",
      message:
        "The `;` straight after `if (...)` ends the `if` right there, so the block below it always runs. Remove that `;`.",
      fix: lineText.trim().replace(/;\s*$/, ""),
    }),
    examples: [I + "int main() {\n    int x = 1;\n    if (x == 2);\n    {\n        cout << x;\n    }\n}\n"],
  },

  // ---- Crashes while running ------------------------------------------------------------------
  {
    id: "cpp/divide-by-zero",
    types: R,
    match: /divide by zero|remainder by zero/,
    explain: () => ({
      title: "Dividing by zero",
      message:
        "The program divided a whole number by 0 (or used `%` with 0), which crashes it. Check the value on the right of `/` or `%` before dividing.",
    }),
    examples: [I + "int main() {\n    int a = 5, b = 0;\n    cout << a / b;\n}\n"],
  },
  {
    // Deep recursion overflows the program's stack, which lives in its own
    // memory, so it shows up as an out-of-bounds access rather than a stack error.
    id: "cpp/too-deep",
    types: R,
    match: /memory access out of bounds|call stack|Maximum call stack size exceeded/,
    when: ({ code }) => recursiveFunction(code) !== null,
    explain: ({ code }) => ({
      title: `\`${recursiveFunction(code)}\` may keep calling itself`,
      message:
        "The program ran out of room, and a function here calls itself. If it never reaches a case where it returns without calling itself again, it goes on until the program crashes. Check that it has a stopping case, and that each call gets closer to it.",
    }),
    examples: [I + "int f(int n) {\n    return f(n + 1) + 1;\n}\nint main() {\n    cout << f(1);\n}\n"],
  },
  {
    id: "cpp/out-of-memory-range",
    types: R,
    match: /memory access out of bounds/,
    explain: () => ({
      title: "The program reached outside its memory",
      message:
        "This usually means a position far outside an array or `vector`, for example `v[1000000]`. Positions start at 0, and the last one is `size() - 1`.",
    }),
    examples: [I + "#include <vector>\nint main() {\n    vector<int> v(3);\n    cout << v[100000000];\n}\n"],
  },
  {
    id: "cpp/aborted",
    types: R,
    match: /unreachable/,
    explain: () => ({
      title: "The program stopped itself",
      message:
        "Something the program relied on failed. The usual causes are `.at(i)` with a position that doesn't exist, or `stoi(...)` on text that isn't a number.",
    }),
    examples: [I + "#include <vector>\nint main() {\n    vector<int> v = {1, 2, 3};\n    cout << v.at(3);\n}\n", I + 'int main() {\n    cout << stoi("seven");\n}\n'],
  },
];

export const CPP_FALLBACKS: Record<string, { title: string; message: string }> = {
  CompileError: {
    title: "The code didn't compile",
    message:
      "The compiler couldn't understand something on this line, or just before it. Read its message below: the first error is usually the real one, and later ones often follow from it.",
  },
  CompileWarning: {
    title: "This might be a mistake",
    message: "The code compiled, but the compiler thinks this line might not do what you meant.",
  },
  RuntimeError: {
    title: "The program crashed",
    message: "The program stopped unexpectedly while it was running. Check the input it got and the last thing it printed.",
  },
};
