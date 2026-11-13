```python
line = input()

scores = []
for part in line.split():
    scores.append(int(part))

highest = scores[0]
for score in scores:
    if score > highest:
        highest = score

average = sum(scores) / len(scores)

print(f"Highest: {highest}")
print(f"Average: {average:.1f}")
```

1. `line.split()` breaks the line at spaces into a list of strings. The loop converts each to a number and **appends** it to `scores`.
2. To find the highest, start with the first score, then compare every score against the best so far. Starting with `0` instead would break when every score is negative, which one of the hidden tests checks.
3. `sum(scores)` adds them up and `len(scores)` counts them.
4. `:.1f` rounds to one decimal place when printing, so `5.333...` shows as `5.3` and `10` shows as `10.0`.

**Shortcuts:** Python has `max(scores)` built in, and `scores = [int(p) for p in line.split()]` builds the list in one line. Writing the loops yourself first shows what those shortcuts do.
