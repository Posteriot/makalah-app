import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const read = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8")

describe("chat window unified send helper", () => {
  it("routes all user sends through sendUserMessageWithContext helper", () => {
    const source = read("src/components/chat/ChatWindow.tsx")

    expect(source).toContain("const sendUserMessageWithContext = useCallback")
    expect(source).toContain("const sendMessageWithPendingIndicator = useCallback")
    expect(source).toContain("sendUserMessageWithContext({")

    const sendMessageCalls = source.match(/sendMessage\(/g) ?? []
    expect(sendMessageCalls.length).toBe(2)
  })
})
