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
        // Add word to kept, but only if it isn't already there
    }

    for (int i = 0; i < (int)kept.size(); i++) {
        if (i > 0) cout << " ";
        cout << kept[i];
    }
    cout << endl;
    return 0;
}
