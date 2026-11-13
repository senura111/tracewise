Work out each letter's **position** in the alphabet (a = 0, b = 1, … z = 25), add the shift, then turn the new position back into a letter.

---

In C++ a `char` is really a small number, so you can do maths with it: `'c' - 'a'` is `2`, and `'a' + 2` is `'c'`. The `&` in `for (char& ch : text)` lets the loop change the letters in `text` itself.

---

To wrap around after `z`, use the remainder: `(position + shift) % 26`. Only do this when `ch >= 'a' && ch <= 'z'`, then set `ch = 'a' + newPosition;`.
