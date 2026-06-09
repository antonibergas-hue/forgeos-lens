# ForgeOS Lens

Collection of utilities and tools for the ForgeOS platform.

## Temperature Converter CLI

A minimal command-line tool that converts temperatures between Celsius and Fahrenheit.

### Usage

```bash
# Convert Celsius to Fahrenheit
python temp_converter.py 100 --c2f
# Output: 100.0°C = 212.0°F

# Convert Fahrenheit to Celsius
python temp_converter.py 32 --f2c
# Output: 32.0°F = 0.0°C
```

### Arguments

| Argument | Description |
|----------|-------------|
| `value` | Temperature value to convert (accepts negative numbers and decimals) |
| `--c2f` | Convert from Celsius to Fahrenheit |
| `--f2c` | Convert from Fahrenheit to Celsius |

### Examples

```bash
# Boiling point of water
python temp_converter.py 100 --c2f    # 100°C → 212°F

# Freezing point of water
python temp_converter.py 0 --c2f      # 0°C → 32°F
python temp_converter.py 32 --f2c     # 32°F → 0°C

# Negative temperatures
python temp_converter.py -40 --c2f    # -40°C → -40°F (intersection point)

# Human body temperature
python temp_converter.py 98.6 --f2c   # 98.6°F → 37°C
```

### Requirements

- Python 3.6+
- No external dependencies (uses only standard library)
