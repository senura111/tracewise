#include <iostream>
#include <string>
using namespace std;

int main() {
    string text;
    getline(cin, text);
    int shift;
    cin >> shift;

    for (char& ch : text) {
        if (ch >= 'a' && ch <= 'z') {
            int position = ch - 'a';
            int newPosition = (position + shift) % 26;
            ch = 'a' + newPosition;
        }
    }

    cout << text << endl;
    return 0;
}
