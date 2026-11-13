```python
text = input()

count = 0
for ch in text.lower():
    if ch in "aeiou":
        count += 1

print(count)
```

1. `text.lower()` makes a lowercase copy, so `A` and `a` both become `a`. The original `text` isn't changed.
2. The loop visits each character in turn.
3. `ch in "aeiou"` checks whether the character appears in the string `"aeiou"`.
4. `count += 1` is short for `count = count + 1`.
5. `print(count)` is outside the loop, so it prints once, at the end.

**Common mistake:** putting `print(count)` inside the loop prints a running total on every line instead of one answer.
