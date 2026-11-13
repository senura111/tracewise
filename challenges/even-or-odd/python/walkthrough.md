```python
number = int(input())

if number % 2 == 0:
    print("even")
else:
    print("odd")
```

1. `input()` gives back text, so `int(...)` turns it into a number we can do maths with.
2. `number % 2` is the remainder after dividing by 2. Even numbers leave `0`; odd numbers leave `1`.
3. `==` **compares** two values. (A single `=` would try to store a value instead, which is a SyntaxError here.)
4. `if`/`else` picks exactly one of the two `print` lines.

In Python, `-3 % 2` is `1`, so negative numbers work too. (C++ behaves differently. You'll see that in the C++ version of this challenge.)
