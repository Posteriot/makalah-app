import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const repoRoot = process.cwd()

const read = (relativePath: string) =>
  readFileSync(path.join(repoRoot, relativePath), "utf8")

describe("attachment baseline smoke guards", () => {
  it("chat submit still sends document fileIds through request body", () => {
    const chatWindow = read("src/components/chat/ChatWindow.tsx")

    expect(chatWindow).toMatch(/sendMessage\(\{\s*text:\s*input\s*\},\s*\{\s*body:\s*\{\s*fileIds\s*\}\s*\}\s*\)/)
  })

  it("chat route still reads and processes fileIds context branch", () => {
    const route = read("src/app/api/chat/route.ts")

    expect(route).toContain("const { messages, conversationId, fileIds } = body")
    expect(route).toContain("if (fileIds && fileIds.length > 0)")
    expect(route).toContain("fileContextLength")
  })

  it("chat history mapping still exposes file_ids annotation for chip rendering", () => {
    const chatWindow = read("src/components/chat/ChatWindow.tsx")

    expect(chatWindow).toContain("type: \"file_ids\"")
    expect(chatWindow).toContain("msg.fileIds")
  })
})
