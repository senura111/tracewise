```cpp
#include <iostream>
using namespace std;

int main() {
    int number;
    cin >> number;

    if (number % 2 == 0) {
        cout << "even" << endl;
    } else {
        cout << "odd" << endl;
    }
    return 0;
}
```

1. `cin >> number` reads the number into an `int`.
2. `number % 2` is the remainder after dividing by 2. Even numbers leave `0`.
3. `==` compares; a single `=` would store a value instead. (Clang warns about that mistake, and Tracewise shows the warning on the line.)
4. `if`/`else` picks exactly one of the two lines to run.

**C++ is different from Python here:** in C++, `-3 % 2` is `-1`, not `1`. So `if (number % 2 == 1)` would wrongly call `-3` even. Checking `== 0` works for negative numbers too, which is what the hidden test with `-3` checks.
