import { describe, expect, it } from "vitest";
import type { CodeError } from "../../runners/types";
import { explainFor, explainWarnings } from "../explain";
import { declarationLine, hasMain, includes, recursiveFunction } from "./helpers";

const err = (type: string, message: string, line: number | null = 1): CodeError => ({ type, message, line, traceback: "" });

describe("C++ explanations", () => {
  it("suggests the semicolon", () => {
    const e = explainFor("cpp", err("CompileError", "expected ';' after expression", 2), 'int main() {\n    cout << "hi"\n}');
    expect(e.ruleId).toBe("cpp/missing-semicolon");
    expect(e.fix).toBe('cout << "hi";');
  });

  it("asks for the right #include", () => {
    const code = "#include <iostream>\nusing namespace std;\nint main() { cout << setprecision(2); }";
    const e = explainFor("cpp", err("CompileError", "use of undeclared identifier 'setprecision'"), code);
    expect(e.ruleId).toBe("cpp/missing-include");
    expect(e.fix).toBe("#include <iomanip>");
    expect(e.fixLine).toBe(1);
  });

  it("explains std:: when the header is already there", () => {
    const code = "#include <iostream>\nint main() { cout << 1; }";
    const e = explainFor("cpp", err("CompileError", "use of undeclared identifier 'cout'; did you mean 'std::cout'?"), code);
    expect(e.ruleId).toBe("cpp/needs-std");
  });

  it("points an uninitialised variable at its declaration", () => {
    const code = "int main() {\n    int total;\n    total += 5;\n}";
    const e = explainFor("cpp", err("CompileWarning", "variable 'total' is uninitialized when used here [-Wuninitialized]", 3), code);
    expect(e.ruleId).toBe("cpp/no-starting-value");
    expect(e.fixLine).toBe(2);
  });

  it("falls back for unknown compile errors", () => {
    expect(explainFor("cpp", err("CompileError", "something new"), "int main() {}").ruleId).toBe("fallback/CompileError");
  });

  it("only shows warnings that have a rule", () => {
    const warnings = [
      err("CompileWarning", "unused variable 'y' [-Wunused-variable]", 2),
      err("CompileWarning", "using the result of an assignment as a condition without parentheses [-Wparentheses]", 3),
    ];
    const shown = explainWarnings("cpp", warnings, "int main() {\n int y;\n if (x = 5) {}\n}");
    expect(shown.map((s) => s.explanation.ruleId)).toEqual(["cpp/assign-in-condition"]);
  });
});

describe("C++ helpers", () => {
  it("finds main, ignoring comments and strings", () => {
    expect(hasMain("int main() { return 0; }")).toBe(true);
    expect(hasMain('// int main()\nint mian() { cout << "main()"; }')).toBe(false);
  });

  it("checks for an #include", () => {
    expect(includes("#include <iostream>\n# include <string>", "string")).toBe(true);
    expect(includes("#include <iostream>", "iomanip")).toBe(false);
  });

  it("finds a declaration line", () => {
    expect(declarationLine(["int main() {", "    int total;", "    total += 1;"], "total")).toBe(2);
    expect(declarationLine(["    int a = 1, total = 0;"], "total")).toBe(1);
  });

  it("spots a function that calls itself", () => {
    expect(recursiveFunction("int f(int n) {\n  return f(n - 1);\n}\nint main() { f(1); }")).toBe("f");
    expect(recursiveFunction("int twice(int x) { return 2 * x; }\nint main() { twice(1); }")).toBeNull();
  });
});
