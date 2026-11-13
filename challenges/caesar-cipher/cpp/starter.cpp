#include <iostream>
#include <string>
using namespace std;

int main() {
    string text;
    getline(cin, text);
    int shift;
    cin >> shift;

    for (char& ch : text) {
        // Shift lowercase letters; keep everything else the same
    }

    cout << text << endl;
    return 0;
}
