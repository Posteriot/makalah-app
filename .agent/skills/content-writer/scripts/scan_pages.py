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


def walk_pages(root):
  base = os.path.join(root, "src", "app")
  pages = []
  if not os.path.isdir(base):
    return pages
  for dirpath, dirnames, filenames in os.walk(base):
    dirnames[:] = [d for d in dirnames if not should_skip_dir(d)]
    for fname in filenames:
      if fname == "page.tsx" or fname == "page.jsx":
        pages.append(os.path.join(dirpath, fname))
  return sorted(pages)


def group_by_top_segment(paths, base):
  groups = defaultdict(list)
  for p in paths:
    rel = os.path.relpath(p, base)
    top = rel.split(os.sep, 1)[0]
    groups[top].append(rel)
  return groups


def main():
  parser = argparse.ArgumentParser(
    description="Scan pages di src/app/**/page.(t|j)sx"
  )
  parser.add_argument(
    "--root",
    default=os.getcwd(),
    help="Root project (default: cwd)",
  )
  args = parser.parse_args()

  root = os.path.abspath(args.root)
  pages = walk_pages(root)
  base = os.path.join(root, "src", "app")
  groups = group_by_top_segment(pages, base)

  print("# Scan Pages")
  print(f"- Root: {root}")
  print(f"- Base: src/app")
  print("")
  print("## Ringkasan")
  print(f"- Total pages: {len(pages)}")
  for key in sorted(groups.keys()):
    print(f"- {key}: {len(groups[key])} pages")
  print("")
  print("## Daftar Pages")
  for p in pages:
    rel = os.path.relpath(p, root)
    print(f"- {rel}")


if __name__ == "__main__":
  main()
