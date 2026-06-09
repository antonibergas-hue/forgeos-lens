#!/usr/bin/env python3
"""word_count.py - A minimal word-count CLI tool (like Unix `wc`).

Counts the number of lines, words, and characters in a text file
and outputs the results in a format similar to the standard `wc` command.

Usage:
    python word_count.py <file_path>
    python word_count.py file1.txt file2.txt
"""

import sys
from pathlib import Path


def count_file(file_path: str) -> dict:
    """Count lines, words, and characters in a text file.

    Args:
        file_path: Path to the text file to analyze.

    Returns:
        A dictionary with keys 'lines', 'words', 'chars', and 'filename'.

    Raises:
        FileNotFoundError: If the file does not exist.
        PermissionError: If the file cannot be read due to permissions.
    """
    path = Path(file_path)
    content = path.read_text(encoding="utf-8")

    lines = content.splitlines()
    line_count = len(lines)
    word_count = sum(len(line.split()) for line in lines)
    char_count = len(content)

    return {
        "lines": line_count,
        "words": word_count,
        "chars": char_count,
        "filename": path.name,
    }


def format_output(counts: dict) -> str:
    """Format the counts in `wc`-style output.

    Args:
        counts: Dictionary with 'lines', 'words', 'chars', and 'filename'.

    Returns:
        A formatted string: '<lines> <words> <chars> <filename>'
    """
    return f"{counts['lines']:>7} {counts['words']:>7} {counts['chars']:>7} {counts['filename']}"


def main() -> None:
    """Entry point for the word-count CLI."""
    if len(sys.argv) < 2:
        print("Usage: python word_count.py <file_path> [file2.txt ...]")
        print("\nCounts lines, words, and characters in the given text file(s).")
        sys.exit(1)

    results = []
    for file_arg in sys.argv[1:]:
        try:
            counts = count_file(file_arg)
            results.append(counts)
            print(format_output(counts))
        except FileNotFoundError:
            print(f"word_count.py: {file_arg}: No such file or directory", file=sys.stderr)
        except PermissionError:
            print(f"word_count.py: {file_arg}: Permission denied", file=sys.stderr)
        except Exception as e:
            print(f"word_count.py: {file_arg}: {e}", file=sys.stderr)

    # Print totals if more than one file was provided
    if len(results) > 1:
        totals = {
            "lines": sum(r["lines"] for r in results),
            "words": sum(r["words"] for r in results),
            "chars": sum(r["chars"] for r in results),
            "filename": "(total)",
        }
        print(format_output(totals))


if __name__ == "__main__":
    main()
