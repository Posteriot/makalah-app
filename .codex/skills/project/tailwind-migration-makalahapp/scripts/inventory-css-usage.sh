#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"
OUT_DIR="${ROOT_DIR}/tmp"

export ROOT_DIR
export OUT_DIR

mkdir -p "${OUT_DIR}"

# 1) Extract class selectors (including pseudo selectors) with @layer detection.
python3 - <<'PY'
import os
import re
from pathlib import Path

root_dir = Path(os.environ["ROOT_DIR"]).resolve()
out_dir = Path(os.environ["OUT_DIR"]).resolve()

css_files = sorted(root_dir.glob("src/**/*.css"))

# Track class definitions with layer context and file:line
entries = []

for css_file in css_files:
    layer_stack = []  # (layer_name, depth)
    depth = 0
    pending_layer = None

    try:
        lines = css_file.read_text(encoding="utf-8").splitlines()
    except Exception:
        # Skip unreadable files
        continue

    for idx, line in enumerate(lines, start=1):
        # Detect @layer with opening brace
        m = re.search(r"@layer\s+([a-zA-Z0-9_-]+)\s*{", line)
        if m:
            pending_layer = m.group(1)

        # Capture selectors before '{'
        if "{" in line:
            selector_part = line.split("{")[0].strip()
            # Ignore at-rules (except @layer already handled)
            if selector_part and not selector_part.startswith("@"):
                # Split by commas for multi-selectors
                for sel in selector_part.split(","):
                    for cls in re.findall(r"\.([a-zA-Z0-9_-]+)", sel):
                        layer = layer_stack[-1][0] if layer_stack else "(none)"
                        entries.append((cls, layer, f"{css_file.relative_to(root_dir)}:{idx}"))

        # Update brace depth
        depth += line.count("{") - line.count("}")

        # Push layer after depth update so contents are inside the layer
        if pending_layer:
            layer_stack.append((pending_layer, depth))
            pending_layer = None

        # Pop layers when depth returns
        while layer_stack and depth < layer_stack[-1][1]:
            layer_stack.pop()

# Write definitions
out_path = out_dir / "css-class-definitions.txt"
unique_entries = sorted(set(entries), key=lambda x: (x[0], x[1], x[2]))
with out_path.open("w", encoding="utf-8") as f:
    for cls, layer, loc in unique_entries:
        f.write(f"{cls}\t{layer}\t{loc}\n")

# Write class list for later mapping
class_list = sorted({cls for cls, _, _ in unique_entries})
(out_dir / "css-class-list.txt").write_text("\n".join(class_list) + ("\n" if class_list else ""), encoding="utf-8")
PY

# 2) Find className usage in TS/TSX (raw lines for manual review)
rg --no-heading -g "*.ts" -g "*.tsx" "className=\"|className=\'|className=\{" "${ROOT_DIR}/src" \
  > "${OUT_DIR}/css-class-usage.txt"

# 3) Build class -> files map using class list (chunked regex for speed)
python3 - <<'PY'
import os
import re
from pathlib import Path

root_dir = Path(os.environ["ROOT_DIR"]).resolve()
out_dir = Path(os.environ["OUT_DIR"]).resolve()

class_list_path = out_dir / "css-class-list.txt"
if not class_list_path.exists():
    (out_dir / "css-class-usage-map.txt").write_text("", encoding="utf-8")
    raise SystemExit(0)

classes = [c for c in class_list_path.read_text(encoding="utf-8").splitlines() if c.strip()]
if not classes:
    (out_dir / "css-class-usage-map.txt").write_text("", encoding="utf-8")
    raise SystemExit(0)

usage_map = {c: set() for c in classes}

ts_files = list(root_dir.glob("src/**/*.ts")) + list(root_dir.glob("src/**/*.tsx"))

# Chunk classes to keep regex size manageable
chunk_size = 200
chunks = [classes[i:i + chunk_size] for i in range(0, len(classes), chunk_size)]
chunk_patterns = [re.compile(r"\b(?:" + "|".join(map(re.escape, chunk)) + r")\b") for chunk in chunks]

for ts_file in ts_files:
    try:
        content = ts_file.read_text(encoding="utf-8")
    except Exception:
        continue

    for chunk, pattern in zip(chunks, chunk_patterns):
        matches = set(pattern.findall(content))
        if not matches:
            continue
        for cls in matches:
            usage_map[cls].add(str(ts_file.relative_to(root_dir)))

# Write map
out_path = out_dir / "css-class-usage-map.txt"
with out_path.open("w", encoding="utf-8") as f:
    for cls in sorted(usage_map.keys()):
        files = sorted(usage_map[cls])
        if files:
            f.write(f"{cls}: {', '.join(files)}\n")
        else:
            f.write(f"{cls}: (unused)\n")
PY

printf "Wrote:\n- %s\n- %s\n- %s\n" \
  "${OUT_DIR}/css-class-definitions.txt" \
  "${OUT_DIR}/css-class-usage.txt" \
  "${OUT_DIR}/css-class-usage-map.txt"
