#include <cctype>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    string password;
    getline(cin, password);

    vector<string> missing;
    // Check each rule. If the password doesn't meet it,
    // add the rule's name to missing.

    // Then print the strength, and the missing rules if there are any.

    return 0;
}
