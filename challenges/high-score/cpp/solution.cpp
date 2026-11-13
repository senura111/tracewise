#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>
using namespace std;

int main() {
    string line;
    getline(cin, line);

    vector<int> scores;
    istringstream numbers(line);
    int score;
    while (numbers >> score) {
        scores.push_back(score);
    }

    int highest = scores[0];
    int total = 0;
    for (int s : scores) {
        if (s > highest) {
            highest = s;
        }
        total += s;
    }

    double average = static_cast<double>(total) / scores.size();

    cout << "Highest: " << highest << endl;
    cout << "Average: " << fixed << setprecision(1) << average << endl;
    return 0;
}
