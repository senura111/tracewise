```python
text = input()
shift = int(input())

result = ""
for ch in text:
    if "a" <= ch <= "z":
        position = ord(ch) - ord("a")
        new_position = (position + shift) % 26
        result += chr(ord("a") + new_position)
    else:
        result += ch

print(result)
```

1. The loop visits the text one character at a time and builds up `result`.
2. `"a" <= ch <= "z"` is true only for lowercase letters, so spaces and punctuation go straight to the `else`.
3. `ord(ch) - ord("a")` turns a letter into a position from 0 to 25.
4. `% 26` makes the position wrap: for `y` with shift 3, `(24 + 3) % 26` is `1`, which is `b`.
5. `chr(ord("a") + new_position)` turns the position back into a letter.

**Common mistake:** forgetting `% 26`. Then `z` shifted by 1 becomes `{`, the character after `z` in the computer's table.
