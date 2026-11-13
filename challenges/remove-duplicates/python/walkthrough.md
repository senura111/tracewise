```python
words = input().split()

kept = []
for word in words:
    if word not in kept:
        kept.append(word)

print(" ".join(kept))
```

1. `input().split()` turns the line into a list of words.
2. For each word, `word not in kept` checks whether it has been seen before. Only new words get appended, so the first appearance wins and the order stays the same.
3. `" ".join(kept)` glues the list back into one string with a space between each word.

**Why not `set()`?** `set(words)` removes duplicates too, but a set has no guaranteed order, so the words could come out shuffled. (`list(dict.fromkeys(words))` keeps the order, but it's less obvious to read.)
