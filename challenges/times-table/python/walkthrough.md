```python
n = int(input())

for i in range(1, 11):
    print(f"{n} x {i} = {n * i}")
```

1. `range(1, 11)` counts from 1 up to **and not including** 11, so it covers 1 to 10.
2. Inside an f-string, anything in `{ }` is worked out and inserted. `{n * i}` multiplies first, then inserts the answer.
3. The spaces in the f-string are printed exactly as written, which is how the output gets `3 x 1 = 3` with single spaces.

**Common mistake:** `range(1, 10)` stops at 9, so the last line (`x 10`) goes missing.
