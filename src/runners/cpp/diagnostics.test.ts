import { describe, expect, it } from "vitest";
import { compileError, compileWarnings, parseClangOutput } from "./diagnostics";

// Real Clang 22 output (YoWASP), lightly trimmed.
const ERRORS = `main.cpp:5:17: error: expected ';' after expression
    5 |     cout << "hi"
      |                 ^
      |                 ;
main.cpp:6:5: error: use of undeclared identifier 'totl'
    6 |     totl = 2;
      |     ^
2 errors generated.`;

const WARNING = `main.cpp:6:11: warning: using the result of an assignment as a condition without parentheses [-Wparentheses]
    6 |     if (x = 5) cout << x;
      |         ~~^~~
main.cpp:5:9: warning: unused variable 'y' [-Wunused-variable]
2 warnings generated.`;

describe("parseClangOutput", () => {
  it("reads errors with their line and column", () => {
    expect(parseClangOutput(ERRORS)).toEqual([
      { severity: "error", message: "expected ';' after expression", line: 5, column: 17, flag: undefined },
      { severity: "error", message: "use of undeclared identifier 'totl'", line: 6, column: 5, flag: undefined },
    ]);
  });

  it("separates a warning's flag from its message", () => {
    const [first] = parseClangOutput(WARNING);
    expect(first).toMatchObject({
      severity: "warning",
      message: "using the result of an assignment as a condition without parentheses",
      flag: "-Wparentheses",
    });
  });

  it("reads linker errors", () => {
    expect(parseClangOutput("wasm-ld: error: /tmp/main-1.o: undefined symbol: twice(int)")).toEqual([
      { severity: "error", message: "undefined symbol: twice(int)", line: null, column: null },
    ]);
  });
});

describe("compileError", () => {
  it("uses the first error and keeps the output without the summary line", () => {
    const error = compileError(ERRORS);
    expect(error).toMatchObject({ type: "CompileError", message: "expected ';' after expression", line: 5 });
    expect(error.traceback).toContain('cout << "hi"');
    expect(error.traceback).not.toContain("errors generated");
  });
});

describe("compileWarnings", () => {
  it("returns every warning with its flag", () => {
    expect(compileWarnings(WARNING).map((w) => [w.line, w.message])).toEqual([
      [6, "using the result of an assignment as a condition without parentheses [-Wparentheses]"],
      [5, "unused variable 'y' [-Wunused-variable]"],
    ]);
  });
});
