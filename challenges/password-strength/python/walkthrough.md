```python
password = input()

has_lower = False
has_upper = False
has_digit = False
for ch in password:
    if ch.islower():
        has_lower = True
    elif ch.isupper():
        has_upper = True
    elif ch.isdigit():
        has_digit = True

missing = []
if len(password) < 8:
    missing.append("at least 8 characters")
if not has_lower:
    missing.append("a lowercase letter")
if not has_upper:
    missing.append("an uppercase letter")
if not has_digit:
    missing.append("a digit")

rules_met = 4 - len(missing)
if rules_met == 4:
    print("strong")
elif rules_met == 3:
    print("medium")
else:
    print("weak")

if missing:
    print("missing: " + ", ".join(missing))
```

1. The loop sets three **flags**. Each starts as `False` and becomes `True` as soon as a matching character turns up.
2. The four separate `if` statements (not `elif`) check every rule, appending the missing ones **in the order the task lists them**.
3. Counting what's missing is easier than counting what's met: `rules_met = 4 - len(missing)`.
4. An empty list counts as false, so `if missing:` skips the second line for strong passwords.

**Shortcut:** `any(ch.isdigit() for ch in password)` checks for a digit in one line.

**Security note:** length matters more than character variety. Each extra character multiplies the number of guesses an attacker needs, so a long passphrase beats `Pa55!`.
