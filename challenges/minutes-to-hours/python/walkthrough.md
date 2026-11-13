```python
total = int(input())

hours = total // 60
minutes = total % 60

print(f"{hours}h {minutes}m")
```

1. `int(input())` reads the line and turns it into a whole number.
2. `//` is **floor division**: it divides and keeps only the whole part. `135 // 60` is `2`.
3. `%` is the **remainder** (also called modulo): what's left after taking out as many 60s as possible. `135 % 60` is `15`.
4. The f-string puts both values into the text exactly where the `{...}` are.

**Common mistake:** using `/` instead of `//`. `135 / 60` is `2.25`, which would print `2.25h`.
