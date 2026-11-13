```python
words = input().split()

counts = {}
for word in words:
    if word in counts:
        counts[word] += 1
    else:
        counts[word] = 1

for word, count in counts.items():
    print(f"{word}: {count}")
```

1. `counts = {}` creates an empty dictionary.
2. `word in counts` checks the **keys**. A new word gets a count of 1; a word already there gets 1 added.
3. `counts.items()` gives each `(key, value)` pair, and `for word, count in ...` unpacks them into two variables.
4. Since Python 3.7, dictionaries keep keys in the order they were first added, which is exactly the order this task asks for.

**Common mistake:** writing `counts[word] += 1` without the `if` raises a `KeyError` the first time a word appears, because there's no count to add to yet. `counts[word] = counts.get(word, 0) + 1` is a one-line alternative.
