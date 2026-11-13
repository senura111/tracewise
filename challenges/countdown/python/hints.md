You need to repeat "print a number" several times, with the number going down by one each time. That's a job for a loop.

---

`range(start, stop, step)` can count backwards with a negative step. `range(3, 0, -1)` gives `3, 2, 1`. Note that it stops **before** reaching `stop`.

---

Use `for number in range(n, 0, -1):` and print `number` inside the loop. Print `"Liftoff!"` after the loop, without indenting it, so it only happens once.
