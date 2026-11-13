import { describe, expect, it } from "vitest";
import { parsePythonTraceback } from "./errors";

const PYODIDE_FRAMES = `  File "/lib/python314.zip/_pyodide/_base.py", line 597, in eval_code
    .run(globals, locals)
     ^^^^^^^^^^^^^^^^^^^^
  File "/lib/python314.zip/_pyodide/_base.py", line 411, in run
    coroutine = eval(self.code, globals, locals)`;

describe("parsePythonTraceback", () => {
  it("keeps the learner's frame and drops Pyodide's", () => {
    const raw = `Traceback (most recent call last):
${PYODIDE_FRAMES}
  File "main.py", line 2, in <module>
    print(nmae)
          ^^^^
NameError: name 'nmae' is not defined. Did you mean: 'name'?`;

    expect(parsePythonTraceback(raw, "NameError")).toEqual({
      type: "NameError",
      message: "name 'nmae' is not defined. Did you mean: 'name'?",
      line: 2,
      traceback: `Traceback (most recent call last):
  File "main.py", line 2, in <module>
    print(nmae)
          ^^^^
NameError: name 'nmae' is not defined. Did you mean: 'name'?`,
    });
  });

  it("finds the line of a SyntaxError", () => {
    const raw = `Traceback (most recent call last):
${PYODIDE_FRAMES}
  File "main.py", line 3
    if number % 2 = 0:
       ^^^^^^^^^^
SyntaxError: invalid syntax. Maybe you meant '==' or ':=' instead of '='?`;

    const error = parsePythonTraceback(raw, "SyntaxError");
    expect(error.line).toBe(3);
    expect(error.message).toBe("invalid syntax. Maybe you meant '==' or ':=' instead of '='?");
    expect(error.traceback).not.toContain("_pyodide");
    expect(error.traceback).toContain("    if number % 2 = 0:");
  });

  it("reports the innermost line in the learner's code", () => {
    const raw = `Traceback (most recent call last):
${PYODIDE_FRAMES}
  File "main.py", line 5, in <module>
    greet()
  File "main.py", line 2, in greet
    return 1 / 0
           ~~^~~
ZeroDivisionError: division by zero`;

    const error = parsePythonTraceback(raw, "ZeroDivisionError");
    expect(error.line).toBe(2);
    expect(error.message).toBe("division by zero");
  });

  it("keeps notes such as repeated-line summaries", () => {
    const raw = `Traceback (most recent call last):
${PYODIDE_FRAMES}
  File "main.py", line 2, in f
    return f(n)
  [Previous line repeated 996 more times]
RecursionError: maximum recursion depth exceeded`;

    const error = parsePythonTraceback(raw, "RecursionError");
    expect(error.traceback).toContain("[Previous line repeated 996 more times]");
    expect(error.line).toBe(2);
  });

  it("renames <exec> to main.py", () => {
    const raw = `Traceback (most recent call last):
  File "<exec>", line 1, in <module>
ValueError: bad`;
    const error = parsePythonTraceback(raw, "ValueError");
    expect(error.traceback).toContain('File "main.py", line 1');
    expect(error.line).toBe(1);
  });

  it("drops an empty header when no frames are the learner's", () => {
    const raw = `Traceback (most recent call last):
${PYODIDE_FRAMES}
MemoryError`;
    const error = parsePythonTraceback(raw, "MemoryError");
    expect(error.traceback).toBe("MemoryError");
    expect(error.line).toBeNull();
    expect(error.message).toBe("");
  });
});
