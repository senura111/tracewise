Split the problem in two: first find out which rules are missing, then decide what to print. The number of rules met is `4 - len(missing)`.

---

Strings have helpful methods: `ch.islower()`, `ch.isupper()` and `ch.isdigit()` are `True` for a lowercase letter, an uppercase letter and a digit. Loop over the password and set a `True`/`False` flag for each kind of character you find.

---

Check the rules in order, appending each missing one: `if len(password) < 8: missing.append("at least 8 characters")`, then the same for the three flags. To print the list, `", ".join(missing)` puts a comma and a space between the items, and `if missing:` is only true when the list isn't empty.
