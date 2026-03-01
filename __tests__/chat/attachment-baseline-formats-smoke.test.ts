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
    const route = read("src/app/api/chat/route.ts")

    expect(route).toContain("fileIds: requestFileIds")
    expect(route).toContain("const attachmentResolution = resolveEffectiveFileIds({")
    expect(route).toContain("const effectiveFileIds = attachmentResolution.effectiveFileIds")
    expect(route).toContain("if (effectiveFileIds.length > 0)")
    expect(route).toContain("fileContextLength")
  })

  it("chat history mapping still exposes file_ids annotation for chip rendering", () => {
    const chatWindow = read("src/components/chat/ChatWindow.tsx")

    expect(chatWindow).toContain("type: \"file_ids\"")
    expect(chatWindow).toContain("msg.fileIds")
  })
})
