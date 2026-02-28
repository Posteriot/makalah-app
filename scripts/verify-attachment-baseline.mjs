#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

const checks = [
  {
    label: "ChatInput disable guard masih pakai rule legacy (akan diubah di task lanjut)",
    file: "src/components/chat/ChatInput.tsx",
    includes: [
      "disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}",
    ],
  },
  {
    label: "ChatWindow submit guard masih mode legacy sebelum enforcement task",
    file: "src/components/chat/ChatWindow.tsx",
    includes: [
      "if (!input.trim() && attachedFiles.length === 0) return",
    ],
  },
  {
    label: "ChatWindow tetap kirim fileIds via body",
    file: "src/components/chat/ChatWindow.tsx",
    includes: [
      "sendMessage({ text: input }, { body: { fileIds } })",
    ],
  },
  {
    label: "Chat route tetap baca fileIds dari body",
    file: "src/app/api/chat/route.ts",
    includes: [
      "const { messages, conversationId, fileIds } = body",
      "if (fileIds && fileIds.length > 0)",
    ],
  },
  {
    label: "History mapping file_ids annotation tetap ada",
    file: "src/components/chat/ChatWindow.tsx",
    includes: [
      "annotations: msg.fileIds ? [{ type: \"file_ids\"",
    ],
  },
]

const failures = []

for (const check of checks) {
  const targetPath = path.join(root, check.file)
  const source = fs.readFileSync(targetPath, "utf8")

  for (const expected of check.includes) {
    if (!source.includes(expected)) {
      failures.push(`${check.label} | missing: ${expected}`)
    }
  }
}

if (failures.length > 0) {
  console.error("[verify-attachment-baseline] FAIL")
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log("[verify-attachment-baseline] PASS")
for (const check of checks) {
  console.log(`- ${check.label}`)
}
