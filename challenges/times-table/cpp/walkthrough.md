```cpp
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;

    for (int i = 1; i <= 10; i++) {
        cout << n << " x " << i << " = " << n * i << endl;
    }
    return 0;
}
```

1. The loop runs with `i` from 1 up to and **including** 10, because the condition is `i <= 10`.
2. `<<` sends each piece to `cout` in order. The spaces live inside the text pieces `" x "` and `" = "`.
3. `n * i` is worked out first, then printed.

**Common mistake:** `i < 10` stops at 9, so the `x 10` line goes missing.
