First turn the line of text into a list of numbers. `line.split()` splits the text at spaces: `"3 9 4".split()` is `["3", "9", "4"]`. Those are still strings, so convert each one with `int()`.

---

For the highest score, start by assuming the first score is the highest, then loop through the rest and update it whenever you find a bigger one. The average is the total divided by how many there are: `sum(scores) / len(scores)`.

---

To print exactly one decimal place, use a format inside the f-string: `f"Average: {average:.1f}"`. The `.1f` means "1 digit after the decimal point".
