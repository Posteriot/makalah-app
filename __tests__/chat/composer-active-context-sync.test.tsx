import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const read = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8")

describe("composer active context sync", () => {
  it("hydrates and syncs attachment composer from conversation attachment context", () => {
    const source = read("src/components/chat/ChatWindow.tsx")

    expect(source).toContain("api.conversationAttachmentContexts.getByConversation")
    expect(source).toContain("const activeContextAttachments = useMemo")
    expect(source).toContain("if (isAttachmentDraftDirty) return")
    expect(source).toContain("setAttachedFiles(activeContextAttachments)")
  })
})
