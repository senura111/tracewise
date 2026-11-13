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
