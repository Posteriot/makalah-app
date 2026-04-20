import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const repoRoot = process.cwd()

const read = (relativePath: string) =>
  readFileSync(path.join(repoRoot, relativePath), "utf8")

describe("attachment baseline smoke guards", () => {
  it("chat window still maps replace-mode attachments to body.fileIds", () => {
    const chatWindow = read("src/components/chat/ChatWindow.tsx")

    expect(chatWindow).toContain("body.fileIds = filesForContext.map((file) => file.fileId)")
    expect(chatWindow).toContain("sendMessage({ text }, { body })")
  })

  it("chat route still resolves request fileIds into effective context branch", () => {
    // Phase 3 extraction: attachment resolution now in entry/ and context/ modules
    const entryAttachments = read("src/lib/chat-harness/entry/resolve-attachments.ts")
    const fileContext = read("src/lib/chat-harness/context/assemble-file-context.ts")

    expect(entryAttachments).toContain("resolveEffectiveFileIds")
    expect(entryAttachments).toContain("effectiveFileIds")
    expect(fileContext).toContain("docFileCount")
    expect(fileContext).toContain("imageFileCount")
    expect(fileContext).toContain("resolveAttachmentRuntimeEnv")
  })

  it("chat history mapping still exposes file_ids annotation for chip rendering", () => {
    const chatWindow = read("src/components/chat/ChatWindow.tsx")

    expect(chatWindow).toContain("type: \"file_ids\"")
    expect(chatWindow).toContain("msg.fileIds")
  })
})
