#!/usr/bin/env python3
import argparse
import os
import re
from pathlib import Path

FUNC_DEF_RE = re.compile(r"\bfunction\s+([A-Za-z0-9_]+)\s*\(|const\s+([A-Za-z0-9_]+)\s*=\s*\(.*?\)\s*=>")
CALL_RE = re.compile(r"\b([A-Za-z0-9_]+)\s*\(")


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
    parser = argparse.ArgumentParser(description="Heuristic call graph for TS/JS files.")
    parser.add_argument("--root", default=os.getcwd(), help="Repo root")
    parser.add_argument("--paths", nargs="*", default=["src", "backend", "convex"], help="Paths to scan")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    files = find_code_files(root, args.paths)

    for file_path in files:
        rel = file_path.relative_to(root)
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        defs = set()
        for m in FUNC_DEF_RE.finditer(content):
            defs.add(m.group(1) or m.group(2))

        calls = set()
        for m in CALL_RE.finditer(content):
            calls.add(m.group(1))

        if defs or calls:
            print(f"\n{rel}")
            if defs:
                print("  defs:")
                for d in sorted(defs):
                    print(f"    - {d}")
            if calls:
                print("  calls:")
                for c in sorted(calls):
                    print(f"    - {c}")


if __name__ == "__main__":
    main()
