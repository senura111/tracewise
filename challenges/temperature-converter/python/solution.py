def celsius_to_fahrenheit(celsius):
    return celsius * 9 / 5 + 32


celsius = float(input())
fahrenheit = celsius_to_fahrenheit(celsius)
print(f"{fahrenheit:.1f}")
