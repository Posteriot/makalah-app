import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const projectRoot = resolve(__dirname, "..", "..")
const source = readFileSync(
  resolve(projectRoot, "src/components/chat/ChatInput.tsx"),
  "utf8"
)

describe("chat input style contract", () => {
  it("memakai token chat, scrollbar tipis, dan tidak menambah fullscreen desktop", () => {
    expect(source).toMatch(/--chat-/)
    expect(source.toLowerCase()).not.toContain("amber")
    expect(source).toContain("desktop-context-strip")
    expect(source).toContain("desktop-context-scroll")
    expect(source).toContain("desktop-chat-input-textarea")
    expect(source).toContain("scrollbar-thin")
    expect(source).toContain("Expand to fullscreen")
  })
})
