import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const read = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8")

describe("conversation attachment baseline smoke", () => {
  it("chat route still reads request fileIds and builds file context", () => {
    const routeSource = read("src/app/api/chat/route.ts")

    expect(routeSource).toContain("const { messages, conversationId, fileIds } = body")
    expect(routeSource).toContain("if (fileIds && fileIds.length > 0)")
    expect(routeSource).toContain("fileContext += `[File: ${file.name}]\\n`")
  })

  it("chat route still handles extraction pending and failed statuses", () => {
    const routeSource = read("src/app/api/chat/route.ts")

    expect(routeSource).toContain("File sedang diproses")
    expect(routeSource).toContain("File gagal diproses")
  })

  it("chat window submit path still sends body.fileIds when attachments exist", () => {
    const chatWindowSource = read("src/components/chat/ChatWindow.tsx")

    expect(chatWindowSource).toContain("sendMessage({ text: input }, { body: { fileIds } })")
    expect(chatWindowSource).toContain("type: \"file_ids\"")
  })
})
