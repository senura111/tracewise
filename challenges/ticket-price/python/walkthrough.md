```python
age = int(input())

if age < 5:
    print("free")
elif age < 18:
    print(6)
elif age < 65:
    print(10)
else:
    print(7)
```

1. Python checks each condition from top to bottom and runs **only the first** block whose condition is true.
2. So by the time it reaches `elif age < 18`, it already knows the age is at least 5. There's no need to write `age >= 5 and age < 18`.
3. `else` catches everyone left over: 65 and older.

**Watch the edges.** "5 to 17" means 17 is included and 18 is not, so the check is `age < 18`. Writing `age <= 18` would charge an 18-year-old the child price. The hidden tests check every boundary.
