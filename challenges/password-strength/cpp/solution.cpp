#include <cctype>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    string password;
    getline(cin, password);

    bool hasLower = false;
    bool hasUpper = false;
    bool hasDigit = false;
    for (char ch : password) {
        if (islower(ch)) hasLower = true;
        else if (isupper(ch)) hasUpper = true;
        else if (isdigit(ch)) hasDigit = true;
    }

    vector<string> missing;
    if (password.size() < 8) missing.push_back("at least 8 characters");
    if (!hasLower) missing.push_back("a lowercase letter");
    if (!hasUpper) missing.push_back("an uppercase letter");
    if (!hasDigit) missing.push_back("a digit");

    int rulesMet = 4 - missing.size();
    if (rulesMet == 4) {
        cout << "strong" << endl;
    } else if (rulesMet == 3) {
        cout << "medium" << endl;
    } else {
        cout << "weak" << endl;
    }

    if (!missing.empty()) {
        cout << "missing: ";
        for (int i = 0; i < (int)missing.size(); i++) {
            if (i > 0) cout << ", ";
            cout << missing[i];
        }
        cout << endl;
    }
    return 0;
}
