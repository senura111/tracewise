import { describe, expect, it } from "vitest";
import { OutputLimiter } from "./outputLimit";

describe("OutputLimiter", () => {
  it("passes output through while under the limits", () => {
    const limiter = new OutputLimiter({ maxChars: 100, maxLines: 10 });
    expect(limiter.take("hello\n")).toBe("hello\n");
    expect(limiter.take("world\n")).toBe("world\n");
    expect(limiter.exceeded).toBe(false);
  });

  it("cuts off at the character limit", () => {
    const limiter = new OutputLimiter({ maxChars: 8, maxLines: 10 });
    expect(limiter.take("abcde")).toBe("abcde");
    expect(limiter.take("fghij")).toBe("fgh");
    expect(limiter.exceeded).toBe(true);
    expect(limiter.take("more")).toBe("");
  });

  it("allows exactly maxLines lines, then stops", () => {
    const limiter = new OutputLimiter({ maxChars: 1000, maxLines: 3 });
    expect(limiter.take("1\n2\n")).toBe("1\n2\n");
    expect(limiter.take("3\n")).toBe("3\n");
    expect(limiter.exceeded).toBe(false);
    expect(limiter.take("4\n5\n")).toBe("4");
    expect(limiter.exceeded).toBe(true);
  });

  it("handles a single chunk with many lines", () => {
    const limiter = new OutputLimiter({ maxChars: 1000, maxLines: 2 });
    expect(limiter.take("a\nb\nc\nd\n")).toBe("a\nb\nc");
    expect(limiter.exceeded).toBe(true);
  });
});
