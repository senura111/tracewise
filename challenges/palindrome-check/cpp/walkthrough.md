```cpp
#include <algorithm>
#include <cctype>
#include <iostream>
#include <string>
using namespace std;

int main() {
    string text;
    getline(cin, text);

    string cleaned = "";
    for (char ch : text) {
        if (ch != ' ') {
            cleaned += tolower(ch);
        }
    }

    string reversed = cleaned;
    reverse(reversed.begin(), reversed.end());

    if (cleaned == reversed) {
        cout << "yes" << endl;
    } else {
        cout << "no" << endl;
    }
    return 0;
}
```

1. The loop builds `cleaned` from every character that isn't a space, made lowercase with `tolower`.
2. `string reversed = cleaned;` makes a **copy**. `reverse` changes the string it's given, so reversing `cleaned` itself would leave nothing to compare against.
3. In C++, `==` compares two strings character by character.

**Without `reverse`:** compare from both ends, moving inwards:

```cpp
bool same = true;
for (int i = 0; i < (int)cleaned.size() / 2; i++) {
    if (cleaned[i] != cleaned[cleaned.size() - 1 - i]) same = false;
}
```
