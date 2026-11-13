/** General explanations used when no specific rule matches. */

export const FALLBACKS: Record<string, { title: string; message: string }> = {
  SyntaxError: {
    title: "Python couldn't read this line",
    message:
      "Something on this line (or the end of the line before it) isn't written the way Python expects. Check for missing brackets, quotes, colons or commas.",
  },
  IndentationError: {
    title: "The indentation isn't right here",
    message: "Python uses indentation to see which lines belong together. Check that each block is indented by 4 spaces and lines up.",
  },
  TabError: {
    title: "Tabs and spaces are mixed",
    message: "Re-indent this block using spaces only, 4 per level.",
  },
  NameError: {
    title: "Python doesn't know this name",
    message: "A name used on this line hasn't been given a value yet. Check the spelling, and that it's set on an earlier line.",
  },
  TypeError: {
    title: "This kind of value can't be used like that",
    message:
      "An operation on this line got the wrong kind of value, for example text where a number was needed. Check what each variable holds here.",
  },
  ValueError: {
    title: "The right kind of value, but not a usable one",
    message: "A function on this line got a value it can't work with. Check the value, especially if it came from `input()`.",
  },
  IndexError: {
    title: "That position doesn't exist",
    message: "Positions start at 0 and the last one is `len(...) - 1`. Check for a position that's one too high.",
  },
  KeyError: {
    title: "That key isn't in the dictionary",
    message: "Check the spelling of the key, or use `in` to check before looking it up.",
  },
  ZeroDivisionError: {
    title: "Dividing by zero",
    message: "Check the value on the right of `/`, `//` or `%`.",
  },
  AttributeError: {
    title: "This value doesn't have that",
    message: "The value on this line has no method or property with that name. Check the spelling and what kind of value it is.",
  },
  RecursionError: {
    title: "A function keeps calling itself",
    message: "A function that calls itself needs a case where it stops.",
  },
  OverflowError: {
    title: "That number is too big",
    message: "A calculation produced a number too large to work with. Check for something growing much faster than you expected.",
  },
  AssertionError: {
    title: "An `assert` check failed",
    message: "The condition after `assert` on this line was false.",
  },
};

export const GENERIC_FALLBACK = {
  title: "Python stopped with an error",
  message: "Read the last line of Python's message below: it names the problem. The line number shows where Python noticed it.",
};
