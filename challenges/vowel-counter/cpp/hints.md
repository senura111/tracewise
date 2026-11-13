A range-based `for` loop visits a string one character at a time: `for (char ch : text)`.

---

`tolower(ch)` (from `<cctype>`) gives the lowercase version of a letter, so you only need to check lowercase vowels. A single character uses single quotes: `'a'`.

---

Inside the loop: `char lower = tolower(ch);` then `if (lower == 'a' || lower == 'e' || lower == 'i' || lower == 'o' || lower == 'u') count++;`. The `||` means "or".
