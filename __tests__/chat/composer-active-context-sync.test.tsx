import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const read = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8")

describe("composer active context sync", () => {
  it("keeps active context on server while composer stays draft-only after send", () => {
    const source = read("src/components/chat/ChatWindow.tsx")

    expect(source).toContain("api.conversationAttachmentContexts.getByConversation")
    expect(source).toContain("const activeContextAttachments = useMemo")
    expect(source).toContain("if (isAttachmentDraftDirty)")
    expect(source).toContain("mode: \"inherit\" as const")
    expect(source).toContain("setAttachedFiles([])")
  })
})
