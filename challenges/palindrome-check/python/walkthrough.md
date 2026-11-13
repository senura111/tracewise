```python
text = input()

cleaned = text.replace(" ", "").lower()

if cleaned == cleaned[::-1]:
    print("yes")
else:
    print("no")
```

1. `replace(" ", "")` swaps every space for nothing, which removes them.
2. `.lower()` means `T` and `t` count as the same letter.
3. `cleaned[::-1]` is a **slice** that walks the string from end to start, giving it reversed.
4. If the cleaned text equals its own reverse, it's a palindrome.

**Without slicing:** compare characters from both ends, moving inwards:

```python
is_palindrome = True
for i in range(len(cleaned) // 2):
    if cleaned[i] != cleaned[-1 - i]:
        is_palindrome = False
```

Both versions give the same answers. The slice is shorter; the loop shows what "reads the same backwards" means.
