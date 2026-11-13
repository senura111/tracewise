```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string text;
    getline(cin, text);
    int shift;
    cin >> shift;

    for (char& ch : text) {
        if (ch >= 'a' && ch <= 'z') {
            int position = ch - 'a';
            int newPosition = (position + shift) % 26;
            ch = 'a' + newPosition;
        }
    }

    cout << text << endl;
    return 0;
}
```

1. `getline` reads the text (it can contain spaces); `cin >> shift` then reads the number on the next line.
2. `char& ch` is a **reference**: changing `ch` changes the letter inside `text`. With plain `char ch`, the loop would only change a copy.
3. Characters are stored as numbers, so `ch - 'a'` gives a position from 0 to 25.
4. `% 26` wraps the position around: for `y` with shift 3, `(24 + 3) % 26` is `1`, which is `b`.
5. `'a' + newPosition` turns the position back into a letter.

**Common mistake:** forgetting `% 26`. Then `z` shifted by 1 becomes `{`, the character after `z`.
