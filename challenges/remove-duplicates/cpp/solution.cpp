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
