"Divisible by 4" means the remainder is 0: `year % 4 == 0`. Write each of the three rules as a check like that.

---

Python joins checks with `and` (both must be true) and `or` (at least one must be true). A year is a leap year if it's divisible by 4 **and not** by 100, **or** if it's divisible by 400.

---

`if (year % 4 == 0 and year % 100 != 0) or year % 400 == 0:` then print with an f-string: `print(f"{year} is a leap year")`, and use `else` for the other message.
