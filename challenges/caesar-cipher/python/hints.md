Work out each letter's **position** in the alphabet (a = 0, b = 1, … z = 25), add the shift, then turn the new position back into a letter.

---

`ord("c")` gives the number the computer uses for `c`. Subtracting `ord("a")` turns it into a position: `ord("c") - ord("a")` is `2`. `chr()` goes the other way.

---

To wrap around after `z`, use the remainder: `(position + shift) % 26`. Then the new letter is `chr(ord("a") + new_position)`. Only do this when `"a" <= ch <= "z"`.
