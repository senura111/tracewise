```cpp
#include <iostream>
using namespace std;

int main() {
    int age;
    cin >> age;

    if (age < 5) {
        cout << "free" << endl;
    } else if (age < 18) {
        cout << 6 << endl;
    } else if (age < 65) {
        cout << 10 << endl;
    } else {
        cout << 7 << endl;
    }
    return 0;
}
```

1. C++ checks each condition from top to bottom and runs **only the first** block whose condition is true.
2. So by the time it reaches `else if (age < 18)`, it already knows the age is at least 5: no need for `age >= 5 && age < 18`.
3. `else` catches everyone left: 65 and over.
4. In C++ the conditions need brackets `( )`, and each block goes in braces `{ }`.

**Watch the edges:** "5 to 17" includes 17 but not 18, so the check is `age < 18`. The hidden tests try every boundary.
