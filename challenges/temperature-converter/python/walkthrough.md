```python
def celsius_to_fahrenheit(celsius):
    return celsius * 9 / 5 + 32


celsius = float(input())
fahrenheit = celsius_to_fahrenheit(celsius)
print(f"{fahrenheit:.1f}")
```

1. `def` defines a function. `celsius` is its **parameter**: inside the function, it holds whatever value the function was called with.
2. `return` sends a value back to where the function was called. Here, the result of the formula is stored in `fahrenheit`.
3. Python follows normal maths order: `*` and `/` before `+`. So this is `((celsius * 9) / 5) + 32`.
4. `float(input())` allows decimals like `21.5`, and `:.1f` prints exactly one decimal place.

**Return vs print:** if the function did `print(celsius * 9 / 5 + 32)` instead of returning it, the number would appear, but the function would still return `None`, and the last line would crash. A function that **returns** its answer can be reused anywhere.
