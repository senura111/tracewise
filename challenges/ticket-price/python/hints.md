There are four price bands, so you need a way to pick exactly one of four options.

---

Use `if`, then `elif` ("else if") for the middle bands, then `else` for the last one. Python checks them from top to bottom and stops at the first one that's true.

---

Go from youngest to oldest: `if age < 5:` print `free`, `elif age < 18:` print `6`, `elif age < 65:` print `10`, `else:` print `7`. Because the checks run in order, `age < 18` only runs for people who are already 5 or older.
