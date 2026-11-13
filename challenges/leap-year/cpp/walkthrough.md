```cpp
#include <iostream>
using namespace std;

int main() {
    int year;
    cin >> year;

    if ((year % 4 == 0 && year % 100 != 0) || year % 400 == 0) {
        cout << year << " is a leap year" << endl;
    } else {
        cout << year << " is not a leap year" << endl;
    }
    return 0;
}
```

1. `year % 4 == 0` is true when 4 divides the year exactly. `!=` means "not equal".
2. `&&` is "and": divisible by 4 **and** not by 100 covers rules 1 and 2.
3. `||` is "or": `|| year % 400 == 0` adds rule 3, so 2000 counts as a leap year.
4. The inner brackets make the grouping clear. C++ works out `&&` before `||` anyway, and Clang even warns when you mix them without brackets, because the result surprises so many people.

**Another way:** check the most specific rule first:

```cpp
bool leap;
if (year % 400 == 0) leap = true;
else if (year % 100 == 0) leap = false;
else leap = year % 4 == 0;
```
