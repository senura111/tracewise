text = input()
shift = int(input())

result = ""
for ch in text:
    if "a" <= ch <= "z":
        position = ord(ch) - ord("a")
        new_position = (position + shift) % 26
        result += chr(ord("a") + new_position)
    else:
        result += ch

print(result)
