# forgeos-lens

## Word Count CLI (`word_count.py`)

A minimal command-line tool that counts lines, words, and characters in text files, similar to the Unix `wc` command.

### Usage

Run the script with one or more file paths as arguments:

```bash
python word_count.py file.txt
```

Output format (space-separated columns):

```
      42      198     1024 file.txt
```

- Column 1: Number of **lines**
- Column 2: Number of **words**
- Column 3: Number of **characters**
- Column 4: **File name**

### Multiple Files

Pass multiple files to get per-file counts plus a total row:

```bash
python word_count.py file1.txt file2.txt
```

### Requirements

- Python 3.6+
- No external dependencies (uses only the standard library)

### Examples

```bash
# Count a single file
$ python word_count.py README.md
       15       62      412 README.md

# Count multiple files
$ python word_count.py script.py README.md
       30      120      780 script.py
       15       62      412 README.md
       45      182     1192 (total)
```
