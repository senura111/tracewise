```cpp
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <vector>
using namespace std;

int main() {
    string line;
    getline(cin, line);
    istringstream words(line);

    map<string, int> counts;
    vector<string> order;
    string word;
    while (words >> word) {
        if (counts.count(word) == 0) {
            order.push_back(word);
        }
        counts[word]++;
    }

    for (const string& w : order) {
        cout << w << ": " << counts[w] << endl;
    }
    return 0;
}
```

1. `counts.count(word)` is `0` if the word isn't in the map yet: that's its first appearance, so it goes into `order`.
2. `counts[word]++` creates the entry (starting at 0) if needed, then adds 1. Unlike Python's dictionaries, this never gives a "missing key" error.
3. The final loop goes through `order`, so the words come out in the order they first appeared.

**Why the extra vector?** Looping over the `map` itself would print `and, cat, hat, the`, alphabetically, because a `map` keeps its keys sorted. Python's dictionaries remember insertion order; C++'s `map` doesn't.
