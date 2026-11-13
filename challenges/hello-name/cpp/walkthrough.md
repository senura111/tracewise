```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    getline(cin, name);
    cout << "Hello, " << name << "!" << endl;
    return 0;
}
```

1. `#include <iostream>` and `#include <string>` bring in input/output and the `string` type. `using namespace std;` lets you write `cout` instead of `std::cout`.
2. `getline(cin, name)` reads the **whole line**. `cin >> name` would stop at the first space, so `Mary Jane` would become just `Mary`, and one of the hidden tests would fail.
3. `<<` sends each piece to `cout` in order, and `endl` ends the line.

**No prompts in C++:** unlike Python's `input("Name: ")`, anything you print with `cout`, including a prompt like `"Enter your name: "`, counts as output, and the tests check all of it.
