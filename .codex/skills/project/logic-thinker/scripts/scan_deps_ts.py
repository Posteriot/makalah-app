#!/usr/bin/env python3
import argparse
import os
import re
from pathlib import Path

IMPORT_RE = re.compile(r"^\s*(import|export)\s+.*?from\s+['\"]([^'\"]+)['\"]")


def is_code_file(path):
    return path.suffix in {".ts", ".tsx", ".js", ".jsx"}


def find_code_files(root, targets):
    files = []
    for rel in targets:
        base = root / rel
        if not base.exists():
            continue
        if base.is_file() and is_code_file(base):
            files.append(base)
            continue
        if base.is_dir():
            for path in base.rglob("*"):
                if path.is_file() and is_code_file(path):
                    files.append(path)
    return sorted(set(files))


def main():
    parser = argparse.ArgumentParser(description="Scan TS/JS import dependencies (heuristic).")
    parser.add_argument("--root", default=os.getcwd(), help="Repo root")
    parser.add_argument("--paths", nargs="*", default=["src", "backend", "convex"], help="Paths to scan")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    files = find_code_files(root, args.paths)

    for file_path in files:
        rel = file_path.relative_to(root)
        imports = []
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                m = IMPORT_RE.match(line)
                if m:
                    imports.append(m.group(2))

        if imports:
            print(f"\n{rel}")
            for imp in sorted(set(imports)):
                print(f"  -> {imp}")


if __name__ == "__main__":
    main()
