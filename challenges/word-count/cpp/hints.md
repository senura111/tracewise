A `map<string, int>` maps each word to how many times you've seen it. `counts[word]++` adds 1, and starts a new word at 0 first.

---

A `map` keeps its keys sorted **alphabetically**, not in the order they arrived. To print in first-seen order, also keep a `vector<string> order` and add each word to it the first time you see it: `if (counts.count(word) == 0) order.push_back(word);`.

---

After counting, loop over `order` (not the map) and print `w << ": " << counts[w]`.
