#include <iomanip>
#include <iostream>
using namespace std;

double celsius_to_fahrenheit(double celsius) {
    // Return the temperature in Fahrenheit:
    // multiply by 9, divide by 5, then add 32
    return 0;
}

int main() {
    double celsius;
    cin >> celsius;
    double fahrenheit = celsius_to_fahrenheit(celsius);
    cout << fixed << setprecision(1) << fahrenheit << endl;
    return 0;
}
