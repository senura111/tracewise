#include <algorithm>
#include <cctype>
#include <iostream>
#include <string>
using namespace std;

int main() {
    string text;
    getline(cin, text);

    string cleaned = "";
    for (char ch : text) {
        if (ch != ' ') {
            cleaned += tolower(ch);
        }
    }

    string reversed = cleaned;
    reverse(reversed.begin(), reversed.end());

    if (cleaned == reversed) {
        cout << "yes" << endl;
    } else {
        cout << "no" << endl;
    }
    return 0;
}
