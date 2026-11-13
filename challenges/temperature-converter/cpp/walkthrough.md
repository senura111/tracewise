```cpp
#include <iomanip>
#include <iostream>
using namespace std;

double celsius_to_fahrenheit(double celsius) {
    return celsius * 9 / 5 + 32;
}

int main() {
    double celsius;
    cin >> celsius;
    double fahrenheit = celsius_to_fahrenheit(celsius);
    cout << fixed << setprecision(1) << fahrenheit << endl;
    return 0;
}
```

1. `double celsius_to_fahrenheit(double celsius)` says the function takes a `double` and gives back a `double`.
2. `return` sends the result back to where the function was called, so it ends up in `fahrenheit`.
3. C++ works left to right for `*` and `/`: `celsius * 9` is a `double`, so dividing it by 5 keeps the decimals.
4. `fixed << setprecision(1)` prints exactly one decimal place.

**The integer-division trap:** `9 / 5 * celsius` looks the same, but `9 / 5` is worked out first, and with two whole numbers C++ gives `1`. The formula would then just add 32. Writing `9.0 / 5` also fixes it.
