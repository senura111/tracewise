Build a new vector, `kept`, as you go through the words. For each word, ask: "have I already kept this one?"

---

`find(kept.begin(), kept.end(), word)` (from `<algorithm>`) searches the vector. If the word isn't there, it returns `kept.end()`.

---

Inside the loop: `if (find(kept.begin(), kept.end(), word) == kept.end()) kept.push_back(word);`. The starter already prints `kept` with spaces between the words.
