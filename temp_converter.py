#!/usr/bin/env python3
"""
Temperature Converter CLI

A minimal command-line tool that converts temperatures between
Celsius and Fahrenheit scales.

Usage:
    python temp_converter.py <value> --c2f
    python temp_converter.py <value> --f2c

Examples:
    python temp_converter.py 100 --c2f   # Converts 100°C to 212°F
    python temp_converter.py 32 --f2c    # Converts 32°F to 0°C
"""

import argparse
import sys


def celsius_to_fahrenheit(celsius: float) -> float:
    """Convert Celsius to Fahrenheit.

    Formula: F = C × 9/5 + 32

    Args:
        celsius: Temperature value in Celsius.

    Returns:
        Temperature value in Fahrenheit.
    """
    return celsius * 9 / 5 + 32


def fahrenheit_to_celsius(fahrenheit: float) -> float:
    """Convert Fahrenheit to Celsius.

    Formula: C = (F - 32) × 5/9

    Args:
        fahrenheit: Temperature value in Fahrenheit.

    Returns:
        Temperature value in Celsius.
    """
    return (fahrenheit - 32) * 5 / 9


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments.

    Returns:
        Parsed namespace containing 'value' and 'conversion' fields.
    """
    parser = argparse.ArgumentParser(
        description="Convert temperatures between Celsius and Fahrenheit.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  %(prog)s 100 --c2f   # 100°C -> 212°F
  %(prog)s 32 --f2c    # 32°F -> 0°C
  %(prog)s -40 --c2f  # -40°C -> -40°F (intersection point)
  %(prog)s 98.6 --f2c # 98.6°F -> 37°C
""",
    )
    parser.add_argument(
        "value",
        type=float,
        help="Temperature value to convert (can be negative or decimal)",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--c2f",
        action="store_true",
        help="Convert from Celsius to Fahrenheit",
    )
    group.add_argument(
        "--f2c",
        action="store_true",
        help="Convert from Fahrenheit to Celsius",
    )
    return parser.parse_args()


def main() -> int:
    """Main entry point for the temperature converter CLI.

    Returns:
        Exit code (0 for success, 1 for error).
    """
    try:
        args = parse_args()
    except SystemExit as e:
        # argparse calls sys.exit on error; propagate the exit code
        return e.code if e.code is not None else 1

    value = args.value

    if args.c2f:
        result = celsius_to_fahrenheit(value)
        unit_from = "°C"
        unit_to = "°F"
    else:
        result = fahrenheit_to_celsius(value)
        unit_from = "°F"
        unit_to = "°C"

    print(f"{value}{unit_from} = {result}{unit_to}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
