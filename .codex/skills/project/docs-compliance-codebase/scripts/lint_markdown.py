#!/usr/bin/env python3
import argparse
import os
import sys


def find_markdown_files(paths):
    files = []
    for p in paths:
        if os.path.isfile(p) and p.endswith(".md"):
            files.append(p)
        elif os.path.isdir(p):
            for root, _, filenames in os.walk(p):
                for name in filenames:
                    if name.endswith(".md"):
                        files.append(os.path.join(root, name))
    return files


def lint_file(path):
    issues = []
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        lines = f.readlines()

    h1_count = 0
    last_level = 0

    for idx, raw in enumerate(lines, start=1):
        line = raw.rstrip("\n")

        if line.endswith(" "):
            issues.append((idx, "Trailing spaces"))

        if line.lstrip().startswith("#"):
            stripped = line.lstrip()
            level = 0
            for ch in stripped:
                if ch == "#":
                    level += 1
                else:
                    break
            title = stripped[level:].strip()

            if title == "":
                issues.append((idx, "Empty heading"))

            if level == 1:
                h1_count += 1

            if last_level != 0 and level > last_level + 1:
                issues.append((idx, f"Heading level jump from H{last_level} to H{level}"))

            last_level = level

    if h1_count == 0:
        issues.append((0, "Missing H1 heading"))
    elif h1_count > 1:
        issues.append((0, "Multiple H1 headings"))

    return issues


def main():
    parser = argparse.ArgumentParser(description="Lint Markdown files for structure rules.")
    parser.add_argument("paths", nargs="+", help="Files or directories to scan")
    args = parser.parse_args()

    files = sorted(set(find_markdown_files(args.paths)))
    if not files:
        print("No Markdown files found.")
        return 1

    total_issues = 0
    for path in files:
        issues = lint_file(path)
        if issues:
            print(f"\n{path}")
            for line_no, msg in issues:
                loc = f"{line_no}" if line_no > 0 else "-"
                print(f"  Line {loc}: {msg}")
            total_issues += len(issues)

    if total_issues == 0:
        print("All files passed Markdown lint rules.")
        return 0

    print(f"\nTotal issues: {total_issues}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
