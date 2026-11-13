#include <iostream>
using namespace std;

int main() {
    int total;
    cin >> total;

    int hours = total / 60;
    int minutes = total % 60;

    cout << hours << "h " << minutes << "m" << endl;
    return 0;
}
