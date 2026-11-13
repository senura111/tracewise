text = input()

cleaned = text.replace(" ", "").lower()

if cleaned == cleaned[::-1]:
    print("yes")
else:
    print("no")
