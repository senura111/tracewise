There are 60 minutes in an hour. How many **whole** hours fit into the total? Whatever doesn't fit is the minutes left over.

---

When both sides are `int`, C++'s `/` throws away the remainder: `135 / 60` is `2`. `%` gives just the remainder: `135 % 60` is `15`.

---

Store `total / 60` in `int hours` and `total % 60` in `int minutes`, then print: `cout << hours << "h " << minutes << "m" << endl;`
