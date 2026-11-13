text = input()
shift = int(input())

result = ""
for ch in text:
    # Shift lowercase letters; keep everything else the same
    result += ch

print(result)
