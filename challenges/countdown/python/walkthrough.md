```python
n = int(input())

for number in range(n, 0, -1):
    print(number)

print("Liftoff!")
```

1. `range(n, 0, -1)` produces `n, n-1, ..., 1`. It starts at `n`, steps by `-1`, and stops **before** `0`.
2. The indented `print(number)` runs once for each number.
3. `print("Liftoff!")` isn't indented, so it runs once, after the loop has finished.
4. When `n` is 0, `range(0, 0, -1)` is empty, so the loop body never runs and only `Liftoff!` is printed.

**Another way:** a `while` loop works too:

```python
while n > 0:
    print(n)
    n = n - 1
```

Forgetting `n = n - 1` makes the loop run forever. That's why Tracewise stops programs after a few seconds.
