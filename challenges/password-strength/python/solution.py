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
