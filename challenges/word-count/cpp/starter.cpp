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
    vector<string> order; // words in the order they first appear
    string word;
    while (words >> word) {
        // Count the word, and remember the order words first appear
    }

    // Print each word and its count, like: the: 2

    return 0;
}
