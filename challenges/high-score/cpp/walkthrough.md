```cpp
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>
using namespace std;

int main() {
    string line;
    getline(cin, line);

    vector<int> scores;
    istringstream numbers(line);
    int score;
    while (numbers >> score) {
        scores.push_back(score);
    }

    int highest = scores[0];
    int total = 0;
    for (int s : scores) {
        if (s > highest) {
            highest = s;
        }
        total += s;
    }

    double average = static_cast<double>(total) / scores.size();

    cout << "Highest: " << highest << endl;
    cout << "Average: " << fixed << setprecision(1) << average << endl;
    return 0;
}
```

1. `istringstream numbers(line)` treats the line like its own little input. `numbers >> score` reads one number at a time, and the `while` stops when there are none left.
2. `push_back` adds each number to the end of the `vector`.
3. The highest starts as the **first** score rather than `0`, so all-negative scores (a hidden test) still work.
4. `static_cast<double>(total)` makes the division a decimal one. Without it, `16 / 3` would be `5`, because both sides are whole numbers.
5. `fixed << setprecision(1)` prints exactly one decimal place: `5.3`, and `10.0` rather than `10`.

**Why not `while (cin >> score)` directly?** That keeps reading until the input ends. When you press Run and type the scores yourself, the input never "ends", so the program would wait forever. Reading one line first avoids that.
