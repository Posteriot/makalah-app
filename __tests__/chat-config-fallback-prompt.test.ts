import { describe, expect, it } from "vitest"
import { getMinimalFallbackPrompt } from "@/lib/ai/chat-config"

describe("getMinimalFallbackPrompt", () => {
  it("uses next-turn confirmation flow instead of automatic search execution", () => {
    const prompt = getMinimalFallbackPrompt()

    expect(prompt).not.toContain("executes it automatically")
    expect(prompt).not.toContain("orchestrator executes it automatically")
    expect(prompt).toContain("ASK the user to confirm")
    expect(prompt).toContain("The user must send a message to trigger the search")
    expect(prompt).toContain('Do NOT say "please wait"')
  })

  it("avoids stale Indonesian search examples in model instructions", () => {
    const prompt = getMinimalFallbackPrompt()

    expect(prompt).not.toContain("Saya akan mencari")
    expect(prompt).toContain("I need to search for references about X")
  })
})
