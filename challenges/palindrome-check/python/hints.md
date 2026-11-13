Do it in two steps: first make a cleaned-up version of the text, then compare it with its reverse.

---

`text.replace(" ", "")` removes every space, and `.lower()` makes everything lowercase. You can chain them: `text.replace(" ", "").lower()`.

---

A slice with a step of -1 reverses a string: `"abc"[::-1]` is `"cba"`. Then check `if cleaned == cleaned[::-1]:` and print `yes` or `no`.
