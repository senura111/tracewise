import { describe, expect, it } from "vitest";
import { splitInputLines } from "./input";

describe("splitInputLines", () => {
  it("gives one entry per line, ignoring the final newline", () => {
    expect(splitInputLines("hello\n3\n")).toEqual(["hello", "3"]);
  });

  it("keeps a last line without a newline", () => {
    expect(splitInputLines("a\nb")).toEqual(["a", "b"]);
  });

  it("keeps deliberately empty lines", () => {
    expect(splitInputLines("\n\nx\n")).toEqual(["", "", "x"]);
  });

  it("treats empty input as no lines", () => {
    expect(splitInputLines("")).toEqual([]);
  });

  it("handles Windows line endings", () => {
    expect(splitInputLines("a\r\nb\r\n")).toEqual(["a", "b"]);
  });
});
