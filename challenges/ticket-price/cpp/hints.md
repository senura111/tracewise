There are four price bands, so you need a way to pick exactly one of four options.

---

Use `if`, then `else if` for the middle bands, then `else` for the last one. C++ checks them from top to bottom and stops at the first one that's true.

---

Go from youngest to oldest: `if (age < 5)` prints `free`, `else if (age < 18)` prints `6`, `else if (age < 65)` prints `10`, and `else` prints `7`.
