line = input()

scores = []
for part in line.split():
    scores.append(int(part))

highest = scores[0]
for score in scores:
    if score > highest:
        highest = score

average = sum(scores) / len(scores)

print(f"Highest: {highest}")
print(f"Average: {average:.1f}")
