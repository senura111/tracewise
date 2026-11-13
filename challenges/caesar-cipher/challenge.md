---
title: Caesar Cipher
difficulty: medium
topics: [strings, loops, security]
order: 10
---

Julius Caesar hid his messages by shifting every letter a fixed number of places along the alphabet. With a shift of 3, `a` becomes `d`, `b` becomes `e`, and so on. Near the end, the alphabet **wraps around**: `x` becomes `a`.

Your program is given two lines:

1. the text to encrypt
2. the shift, a whole number from 0 to 26

Shift every **lowercase letter** and print the result. Leave everything else (spaces, punctuation, digits) exactly as it is.

**Why this isn't secure:** there are only 26 possible shifts, so an attacker can simply try them all. That's called a *brute-force attack*.
