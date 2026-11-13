words = input().split()

kept = []
for word in words:
    if word not in kept:
        kept.append(word)

print(" ".join(kept))
