"Divisible by 4" means the remainder is 0: `year % 4 == 0`. Write each of the three rules as a check like that.

---

C++ joins checks with `&&` (and: both must be true) and `||` (or: at least one must be true). A year is a leap year if it's divisible by 4 **and not** by 100, **or** if it's divisible by 400.

---

`if ((year % 4 == 0 && year % 100 != 0) || year % 400 == 0)` then `cout << year << " is a leap year" << endl;`, and use `else` for the other message.
