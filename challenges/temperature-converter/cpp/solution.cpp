#include <iomanip>
#include <iostream>
using namespace std;

double celsius_to_fahrenheit(double celsius) {
    return celsius * 9 / 5 + 32;
}

int main() {
    double celsius;
    cin >> celsius;
    double fahrenheit = celsius_to_fahrenheit(celsius);
    cout << fixed << setprecision(1) << fahrenheit << endl;
    return 0;
}
