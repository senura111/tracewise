A `for` loop can visit a string one character at a time: `for ch in text:`.

---

`ch in "aeiou"` is `True` when `ch` is one of those letters. To handle capitals too, make the text lowercase first with `text.lower()`.

---

Loop with `for ch in text.lower():`, and inside it write `if ch in "aeiou":` followed by `count += 1`.
