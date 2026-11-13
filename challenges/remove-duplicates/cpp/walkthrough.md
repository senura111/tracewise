```cpp
#include <algorithm>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>
using namespace std;

int main() {
    string line;
    getline(cin, line);
    istringstream words(line);

    vector<string> kept;
    string word;
    while (words >> word) {
        if (find(kept.begin(), kept.end(), word) == kept.end()) {
            kept.push_back(word);
        }
    }

    for (int i = 0; i < (int)kept.size(); i++) {
        if (i > 0) cout << " ";
        cout << kept[i];
    }
    cout << endl;
    return 0;
}
```

1. `words >> word` reads one word at a time from the line, skipping the spaces.
2. `find` looks through `kept`. If it reaches the end without finding the word, it returns `kept.end()`, meaning "not found", so this is the word's first appearance.
3. Only new words are added, so the first appearance wins and the order stays the same.
4. The printing loop puts a space **before** every word except the first, so there's no space at the end.

**Why not `set<string>`?** A `set` removes duplicates too, but it sorts the words alphabetically, which would change the order.
