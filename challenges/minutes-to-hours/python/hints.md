There are 60 minutes in an hour. How many **whole** hours fit into the total? Whatever doesn't fit is the minutes left over.

---

Python has two operators for this. `//` divides and throws away the remainder: `135 // 60` is `2`. `%` gives just the remainder: `135 % 60` is `15`.

---

Store `total // 60` in `hours` and `total % 60` in `minutes`, then print them with an f-string: `print(f"{hours}h {minutes}m")`.
