```cpp
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;

    for (int number = n; number >= 1; number--) {
        cout << number << endl;
    }
    cout << "Liftoff!" << endl;
    return 0;
}
```

1. The `for` loop's three parts: `int number = n` starts at `n`, `number >= 1` keeps going while that's true, and `number--` subtracts 1 after each round.
2. The line inside the braces runs once per number.
3. `"Liftoff!"` is printed after the loop, so only once.
4. When `n` is 0, `number >= 1` is false straight away, so the loop never runs and only `Liftoff!` is printed.

**Common mistake:** writing `number > 1` stops at 2, so the `1` goes missing. Writing `number++` instead of `number--` makes the loop count up forever (Tracewise stops it after a few seconds).
