```python
name = input()
print("Hello, " + name + "!")
```

1. `input()` waits for one line of text and gives it back as a **string**. We store it in `name`.
2. `+` joins strings end to end, so `"Hello, " + "Ada" + "!"` becomes `"Hello, Ada!"`.
3. `print()` shows the result and moves to a new line.

Watch the space after the comma: `"Hello,"` without it would print `Hello,Ada!`, and the tests would fail.

**Another way:** an f-string puts variables straight into text: `print(f"Hello, {name}!")`.
