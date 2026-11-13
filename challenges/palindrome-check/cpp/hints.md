Do it in two steps: first build a cleaned-up copy of the text, then compare it with its reverse.

---

Loop over the characters and add each one that isn't a space: `if (ch != ' ') cleaned += tolower(ch);`. Note the single quotes around the space.

---

`reverse(s.begin(), s.end())` (from `<algorithm>`) reverses a string in place, so reverse a **copy**: `string reversed = cleaned;` then `reverse(reversed.begin(), reversed.end());`. Then compare with `==`.
