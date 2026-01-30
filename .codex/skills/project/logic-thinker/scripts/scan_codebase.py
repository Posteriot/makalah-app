#!/usr/bin/env python3
import argparse
import os
from pathlib import Path


def gather_files(base, max_depth):
    base = Path(base)
    items = []
    for path in base.rglob("*"):
        if path.is_file():
            rel = path.relative_to(base)
            if len(rel.parts) <= max_depth:
                items.append(str(rel))
    return sorted(items)


def main():
    parser = argparse.ArgumentParser(description="Read-only codebase scan for logic analysis.")
    parser.add_argument("--root", default=os.getcwd(), help="Repo root")
    parser.add_argument("--max-depth", type=int, default=3, help="Max relative depth to list")
    parser.add_argument("--paths", nargs="*", default=["src", "backend", "convex", "package.json"], help="Paths to scan")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    print(f"Root: {root}")

    for rel in args.paths:
        target = root / rel
        if not target.exists():
            print(f"\n{rel}: MISSING")
            continue

        if target.is_file():
            print(f"\n{rel}: FILE")
            print(f"  - {rel}")
            continue

        print(f"\n{rel}: DIR")
        items = gather_files(target, args.max_depth)
        for item in items:
            print(f"  - {rel}/{item}")


if __name__ == "__main__":
    main()
