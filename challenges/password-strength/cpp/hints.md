Split the problem in two: first find out which rules are missing, then decide what to print. The number of rules met is `4 - missing.size()`.

---

`<cctype>` has `islower(ch)`, `isupper(ch)` and `isdigit(ch)`. Loop over the password and set a `bool` flag for each kind of character you find.

---

Check the rules **in order**, pushing each missing one: `if (password.size() < 8) missing.push_back("at least 8 characters");`, then the three flags. To print the list, put `", "` before every item except the first.
