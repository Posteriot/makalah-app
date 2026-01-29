#!/usr/bin/env python3
import argparse
import os
from collections import defaultdict


EXCLUDE_DIRS = {
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  ".turbo",
  ".cache",
}


def should_skip_dir(name):
  return name in EXCLUDE_DIRS or name.startswith(".codex")


def walk_paths(root, targets):
  files = []
  for target in targets:
    base = os.path.join(root, target)
    if not os.path.isdir(base):
      continue
    for dirpath, dirnames, filenames in os.walk(base):
      dirnames[:] = [d for d in dirnames if not should_skip_dir(d)]
      for fname in filenames:
        if fname.startswith("."):
          continue
        files.append(os.path.join(dirpath, fname))
  return sorted(files)


def summarize_tree(files, root):
  counts = defaultdict(int)
  for f in files:
    rel = os.path.relpath(f, root)
    top = rel.split(os.sep, 1)[0]
    counts[top] += 1
  return counts


def main():
  parser = argparse.ArgumentParser(
    description="Scan codebase untuk daftar file src/ dan convex/"
  )
  parser.add_argument(
    "--root",
    default=os.getcwd(),
    help="Root project (default: cwd)",
  )
  parser.add_argument(
    "--targets",
    default="src,convex",
    help="Comma-separated target folders (default: src,convex)",
  )
  args = parser.parse_args()

  root = os.path.abspath(args.root)
  targets = [t.strip() for t in args.targets.split(",") if t.strip()]

  files = walk_paths(root, targets)
  counts = summarize_tree(files, root)

  print("# Scan Codebase")
  print(f"- Root: {root}")
  print(f"- Targets: {', '.join(targets) if targets else '-'}")
  print("")
  print("## Ringkasan Folder")
  for key in sorted(counts.keys()):
    print(f"- {key}: {counts[key]} file")
  print("")
  print("## Daftar File")
  for f in files:
    rel = os.path.relpath(f, root)
    print(f"- {rel}")


if __name__ == "__main__":
  main()
