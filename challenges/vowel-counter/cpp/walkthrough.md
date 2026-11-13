```cpp
#include <cctype>
#include <iostream>
#include <string>
using namespace std;

int main() {
    string text;
    getline(cin, text);

    int count = 0;
    for (char ch : text) {
        char lower = tolower(ch);
        if (lower == 'a' || lower == 'e' || lower == 'i' || lower == 'o' || lower == 'u') {
            count++;
        }
    }

    cout << count << endl;
    return 0;
}
```

1. `getline` reads the whole line, spaces included.
2. `for (char ch : text)` visits each character of the string in turn.
3. `tolower(ch)` turns `A` into `a`, so one check covers both cases. It comes from `<cctype>`.
4. `||` means "or". `'a'` in single quotes is one character; `"a"` in double quotes would be text, and comparing a `char` with text is a compile error.
5. `count++` adds 1. `count` started at `0`, which matters in C++: an `int` declared without a value holds garbage.

**Another way:** `string("aeiou").find(lower) != string::npos` checks whether `lower` is in `"aeiou"`.
