```cpp
#include <iostream>
using namespace std;

int main() {
    int total;
    cin >> total;

    int hours = total / 60;
    int minutes = total % 60;

    cout << hours << "h " << minutes << "m" << endl;
    return 0;
}
```

1. `cin >> total` reads a number straight into an `int`.
2. **Integer division:** when both numbers are `int`, `/` gives a whole number and drops the rest, so `135 / 60` is `2`. (This is like Python's `//`, not Python's `/`.)
3. `%` is the remainder: `135 % 60` is `15`.
4. `cout` prints each piece in order, so the `"h "` and `"m"` text goes exactly between the numbers.

**Watch out:** if `total` were a `double`, `total / 60` would be `2.25`. The type of the values decides what `/` does.
