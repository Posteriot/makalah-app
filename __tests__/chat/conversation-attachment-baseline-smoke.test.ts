import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const read = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8")

describe("conversation attachment baseline smoke", () => {
  it("chat route still resolves effective fileIds and builds file context", () => {
    // Phase 3: attachment resolution in entry/, file context in context/
    const entryAttachments = read("src/lib/chat-harness/entry/resolve-attachments.ts")
    const fileContext = read("src/lib/chat-harness/context/assemble-file-context.ts")

    expect(entryAttachments).toContain("resolveEffectiveFileIds")
    expect(entryAttachments).toContain("effectiveFileIds")
    expect(fileContext).toContain("effectiveFileIds.length > 0")
    expect(fileContext).toContain("[File:")
  })

  it("chat route still handles extraction pending and failed statuses", () => {
    // Phase 3: file context assembly now in context module
    const fileContext = read("src/lib/chat-harness/context/assemble-file-context.ts")

    expect(fileContext).toContain("File sedang diproses")
    expect(fileContext).toContain("File gagal diproses")
  })

  it("chat window still routes user sends via unified context helper", () => {
    const chatWindowSource = read("src/components/chat/ChatWindow.tsx")

    expect(chatWindowSource).toContain("const sendUserMessageWithContext = useCallback")
    expect(chatWindowSource).toContain("sendUserMessageWithContext({")
    expect(chatWindowSource).toContain("type: \"file_ids\"")
  })
})
