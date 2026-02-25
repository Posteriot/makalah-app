#!/usr/bin/env bash
set -euo pipefail

FILES=(
  "src/components/chat/messages/TemplateGrid.tsx"
  "src/components/admin/cms/ChatEmptyStateEditor.tsx"
)

for file in "${FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Guard gagal: file tidak ditemukan: $file" >&2
    exit 1
  fi
done

check_forbidden() {
  local pattern="$1"
  local label="$2"

  if rg -n --no-heading "$pattern" "${FILES[@]}"; then
    echo "Guard gagal: ditemukan pola terlarang ($label)." >&2
    exit 1
  fi
}

check_forbidden 'DEFAULT_' 'default constant'
check_forbidden 'fallbackPreviewUrl' 'fallback preview image'
check_forbidden '\?\?\s*"sidebar"' 'sidebar label fallback'
check_forbidden '\?\?\s*"Atau gunakan template' 'template label fallback'
check_forbidden '\?\?\s*"Mari berdiskusi' 'heading/template text fallback'
check_forbidden '\?\?\s*"/logo/' 'logo source fallback'

echo "Guard lolos: chat-empty-state bebas fallback/static."
