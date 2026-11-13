#include <iostream>
using namespace std;

int main() {
    int age;
    cin >> age;

    if (age < 5) {
        cout << "free" << endl;
    } else if (age < 18) {
        cout << 6 << endl;
    } else if (age < 65) {
        cout << 10 << endl;
    } else {
        cout << 7 << endl;
    }
    return 0;
}
