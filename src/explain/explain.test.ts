import { describe, expect, it } from "vitest";
import type { CodeError } from "../runners/types";
import { explainError, PYTHON_RULES } from "./explain";
import { assignmentLines, closestName, editDistance, identifiers, rawInputAssignment } from "./python/helpers";

// Messages below are copied from real Python 3.14 (Pyodide 314) output.
const err = (type: string, message: string, line: number | null = 1): CodeError => ({
  type,
  message,
  line,
  traceback: "",
});

describe("explainError", () => {
  it("points the input() mistake at the line where input() is read", () => {
    const code = "text = input()\nshift = input()\n\nposition = 1\nnew_position = (position + shift) % 26";
    const e = explainError(err("TypeError", "unsupported operand type(s) for +: 'int' and 'str'", 5), code);
    expect(e.ruleId).toBe("type/input-not-converted");
    expect(e.line).toBe(5);
    expect(e.fixLine).toBe(2);
    expect(e.fix).toBe("shift = int(input())");
  });

  it("keeps the prompt when suggesting int(input(...))", () => {
    const code = 'age = input("Age: ")\nif age < 18:\n    print("child")';
    const e = explainError(err("TypeError", "'<' not supported between instances of 'str' and 'int'", 2), code);
    expect(e.fix).toBe('age = int(input("Age: "))');
  });

  it("suggests == for = in a condition", () => {
    const code = "x = 5\nif x % 2 = 0:\n    print(x)";
    const e = explainError(
      err("SyntaxError", "cannot assign to expression here. Maybe you meant '==' instead of '='?", 2),
      code,
    );
    expect(e.ruleId).toBe("syntax/assign-in-condition");
    expect(e.fix).toBe("if x % 2 == 0:");
  });

  it("suggests the colon", () => {
    const e = explainError(err("SyntaxError", "expected ':'", 2), "x = 4\nif x > 3\n    print(x)");
    expect(e.fix).toBe("if x > 3:");
  });

  it("indents the line after a block header", () => {
    const e = explainError(
      err("IndentationError", "expected an indented block after 'if' statement on line 1", 2),
      "if True:\nprint(1)",
    );
    expect(e.title).toContain("`if`");
    expect(e.fix).toBe("    print(1)");
  });

  it("spots a typo of the learner's own variable", () => {
    const e = explainError(err("NameError", "name 'nmae' is not defined", 2), "name = 'a'\nprint(nmae)");
    expect(e.ruleId).toBe("name/typo");
    expect(e.title).toBe("Did you mean `name`?");
    expect(e.fix).toBe("print(name)");
  });

  it("explains capitalisation using Python's own suggestion", () => {
    const e = explainError(err("NameError", "name 'Print' is not defined. Did you mean: 'print'?"), "Print('hi')");
    expect(e.ruleId).toBe("name/wrong-case");
    expect(e.fix).toBe("print('hi')");
  });

  it("ignores Python's unhelpful suggestion for a word missing its quotes", () => {
    const e = explainError(err("NameError", "name 'hello' is not defined. Did you mean: 'help'?"), "print(hello)");
    expect(e.ruleId).toBe("name/unknown");
    expect(e.message).toContain('`"hello"`');
  });

  it("explains a counter that was never started", () => {
    const e = explainError(err("NameError", "name 'count' is not defined", 2), "for i in range(3):\n    count += 1");
    expect(e.ruleId).toBe("name/used-before-set");
    expect(e.message).toContain("count = 0");
  });

  it("names the function that forgot to return", () => {
    const code = "def celsius_to_fahrenheit(c):\n    pass\n\nc = 1.0\nf = celsius_to_fahrenheit(c)\nprint(f\"{celsius_to_fahrenheit(c):.1f}\")";
    const e = explainError(err("TypeError", "unsupported format string passed to NoneType.__format__", 6), code);
    expect(e.ruleId).toBe("type/none");
    expect(e.title).toContain("celsius_to_fahrenheit");
    expect(e.fixLine).toBe(1);
  });

  it("traces None back through a variable to the function that produced it", () => {
    const code =
      "def celsius_to_fahrenheit(celsius):\n    # multiply by 9, divide by 5, then add 32\n    pass\n\n\n" +
      'celsius = float(input())\nfahrenheit = celsius_to_fahrenheit(celsius)\nprint(f"{fahrenheit:.1f}")';
    const e = explainError(err("TypeError", "unsupported format string passed to NoneType.__format__", 8), code);
    expect(e.title).toBe("`fahrenheit` is `None`");
    expect(e.message).toContain("`celsius_to_fahrenheit()` on line 7");
    expect(e.message).toContain("finishes without a `return`");
    expect(e.fixLine).toBe(1);
  });

  it("gives the counting advice for a KeyError with +=", () => {
    const e = explainError(err("KeyError", "'the'", 2), 'counts = {}\ncounts["the"] += 1');
    expect(e.ruleId).toBe("key/missing");
    expect(e.message).toContain("counts.get(word, 0)");
  });

  it("falls back to a general explanation for an unknown message", () => {
    const e = explainError(err("ValueError", "math domain error"), "import math\nmath.sqrt(-1)");
    expect(e.ruleId).toBe("fallback/ValueError");
  });

  it("falls back to a generic explanation for an unusual error type", () => {
    const e = explainError(err("StopIteration", ""), "next(iter([]))");
    expect(e.ruleId).toBe("fallback/StopIteration");
    expect(e.title).toBe("Python stopped with an error");
  });

  it("gives every rule a unique id and at least one example", () => {
    const ids = PYTHON_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PYTHON_RULES.every((r) => r.examples.length > 0)).toBe(true);
  });
});

describe("helpers", () => {
  it("counts a swap of neighbouring letters as one edit", () => {
    expect(editDistance("nmae", "name")).toBe(1);
    expect(editDistance("kitten", "sitting")).toBe(3);
  });

  it("finds a close spelling, but not for unrelated names", () => {
    expect(closestName("totl", ["total", "x"])).toBe("total");
    expect(closestName("hello", ["world", "print"])).toBeNull();
    expect(closestName("x", ["y"])).toBeNull();
  });

  it("sees variables inside f-strings but not words inside plain strings", () => {
    expect([...identifiers('print(f"{total:.1f} and {n}")')].sort()).toEqual(["n", "print", "total"]);
    expect([...identifiers('print("total")')]).toEqual(["print"]);
  });

  it("finds where a name gets a value", () => {
    const lines = ["total = 0", "for n in nums:", "    total += n", "if total == 3:", "def total(x):"];
    expect(assignmentLines(lines, "total")).toEqual([1, 3, 5]);
    expect(assignmentLines(lines, "n")).toEqual([2]);
  });

  it("finds a variable read straight from input()", () => {
    expect(rawInputAssignment(["a = int(input())", "b = input('x')"], ["a", "b"])).toEqual({ name: "b", line: 2 });
    expect(rawInputAssignment(["a = int(input())"], ["a"])).toBeNull();
  });
});
