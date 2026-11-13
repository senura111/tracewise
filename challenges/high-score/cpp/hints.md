First turn the line of text into a `vector<int>`. An `istringstream` (from `<sstream>`) lets you read numbers out of a string exactly like `cin`: `while (numbers >> score) scores.push_back(score);`.

---

For the highest score, start by assuming the first one is the highest, then loop and update it whenever you find a bigger one. Add each score to a `total` in the same loop.

---

Divide as decimals, not whole numbers: `static_cast<double>(total) / scores.size()`. Print with one decimal place using `fixed << setprecision(1)` (from `<iomanip>`).
