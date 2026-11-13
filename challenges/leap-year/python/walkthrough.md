```python
year = int(input())

if (year % 4 == 0 and year % 100 != 0) or year % 400 == 0:
    print(f"{year} is a leap year")
else:
    print(f"{year} is not a leap year")
```

1. `year % 4 == 0` is true when 4 divides the year exactly. `!=` means "not equal".
2. `year % 4 == 0 and year % 100 != 0` covers rules 1 and 2: divisible by 4 but not by 100.
3. `or year % 400 == 0` adds rule 3: years like 2000 are leap years even though they're divisible by 100.
4. The brackets make the grouping clear. Python works out `and` before `or` anyway, but brackets save the reader from having to remember that.

**Another way:** nested `if`s that follow the rules in order:

```python
if year % 400 == 0:
    leap = True
elif year % 100 == 0:
    leap = False
else:
    leap = year % 4 == 0
```

Checking the most specific rule (400) first is what makes this version work.
