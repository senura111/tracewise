---
title: Password Strength
difficulty: medium
topics: [security, strings, conditionals]
order: 14
---

Your program is given a password (one line). Check it against four rules:

1. at least 8 characters
2. a lowercase letter
3. an uppercase letter
4. a digit

On the first line, print how strong it is:

- `strong` if it meets all 4 rules
- `medium` if it meets 3
- `weak` if it meets 2 or fewer

If any rules aren't met, print a second line starting with `missing: ` followed by the missing rules, **in the order above**, separated by a comma and a space. For example, `password` gives:

```
weak
missing: an uppercase letter, a digit
```

Use exactly these names for the rules: `at least 8 characters`, `a lowercase letter`, `an uppercase letter`, `a digit`.

**Real-world note:** rules like these are only a rough guide. A long passphrase of random words is usually stronger than a short password stuffed with symbols, and real checkers also reject passwords that appear in lists of leaked ones.
