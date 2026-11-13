import { describe, expect, it } from "vitest";
import { compareOutput, normalizeOutput } from "./compare";

describe("normalizeOutput", () => {
  it("ignores line-ending style, trailing spaces and trailing blank lines", () => {
    expect(normalizeOutput("a  \r\nb\t\n\n\n")).toEqual(["a", "b"]);
  });

  it("keeps leading spaces and blank lines in the middle", () => {
    expect(normalizeOutput("  a\n\nb\n")).toEqual(["  a", "", "b"]);
  });
});

describe("compareOutput", () => {
  it("passes identical output, even with a missing final newline", () => {
    const result = compareOutput("Hello, Ada!\n", "Hello, Ada!");
    expect(result.passed).toBe(true);
    expect(result.firstDifference).toBeNull();
  });

  it("finds the first differing line", () => {
    const result = compareOutput("1\n2\n3\n", "1\n2\n4\n");
    expect(result.passed).toBe(false);
    expect(result.firstDifference).toBe(2);
  });

  it("points at the first missing line when output stops early", () => {
    const result = compareOutput("3\n2\n1\nLiftoff!\n", "3\n2\n1\n");
    expect(result.firstDifference).toBe(3);
    expect(result.note).toMatch(/missing the last 1 line\b/);
  });

  it("notices empty output", () => {
    expect(compareOutput("even\n", "").note).toMatch(/didn't print anything/);
  });

  it("notices capital letters", () => {
    expect(compareOutput("Hello, Ada!\n", "hello, ada!\n").note).toMatch(/capital letters/);
  });

  it("notices spacing", () => {
    expect(compareOutput("Hello, Ada!\n", "Hello,Ada!\n").note).toMatch(/spaces/);
  });

  it("notices a decimal where a whole number was expected", () => {
    expect(compareOutput("2h 15m\n", "2.0h 15.0m\n").note).toMatch(/whole number/);
  });

  it("does not flag a real decimal such as 2.05", () => {
    expect(compareOutput("2\n", "2.05\n").note).toBeNull();
  });

  it("notices extra lines around a correct answer", () => {
    const note = compareOutput("khoor\n", "Enter text:\nkhoor\n").note;
    expect(note).toMatch(/1 line too many/);
  });

  it("notices a prompt printed in front of the answer", () => {
    const note = compareOutput("even\n", "Enter a number: even\n").note;
    expect(note).toMatch(/extra text in front/);
    expect(note).toMatch(/prompts/);
  });

  it("gives no note for an ordinary wrong answer", () => {
    expect(compareOutput("zab\n", "z{|\n").note).toBeNull();
  });
});
