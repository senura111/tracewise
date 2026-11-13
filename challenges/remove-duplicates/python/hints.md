Build a new list, `kept`, as you go through the words. The question for each word is: "have I already kept this one?"

---

`word in kept` is `True` if the word is already in the list; `word not in kept` is the opposite.

---

Loop with `for word in words:`, and inside it write `if word not in kept:` followed by `kept.append(word)`. The starter's last line already joins the list back together with spaces.
