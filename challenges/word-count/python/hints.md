A **dictionary** maps keys to values. Here each word is a key, and its value is how many times you've seen it so far.

---

For each word: if it's already a key (`word in counts`), add 1 with `counts[word] += 1`. Otherwise this is its first appearance, so set `counts[word] = 1`.

---

To print, loop over the pairs with `for word, count in counts.items():` and print `f"{word}: {count}"`. Python dictionaries remember the order keys were added, so first-seen order comes for free.
