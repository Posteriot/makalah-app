import { describe, it, expect } from "vitest"
import {
  getSearchSystemPrompt,
  augmentUserMessageForSearch,
} from "@/lib/ai/search-system-prompt"

describe("getSearchSystemPrompt", () => {
  it("returns a non-empty system prompt", () => {
    const prompt = getSearchSystemPrompt()
    expect(prompt).toBeTruthy()
    expect(prompt).toContain("research assistant")
  })
})

describe("augmentUserMessageForSearch", () => {
  it("appends search hints to the last user message", () => {
    const messages = [
      { role: "system", content: "system prompt" },
      { role: "user", content: "What is AI?" },
    ]
    const result = augmentUserMessageForSearch(messages)
    expect(result[1].content).toContain("What is AI?")
    expect(result[1].content).toContain("Search broadly")
  })

  it("includes priority source hints for academic databases", () => {
    const messages = [{ role: "user", content: "test query" }]
    const result = augmentUserMessageForSearch(messages)
    const content = result[0].content as string
    expect(content).toContain("Google Scholar")
    expect(content).toContain("Scopus")
    expect(content).toContain("SINTA")
    expect(content).toContain("Garuda")
    expect(content).toContain("ResearchGate")
  })

  it("includes priority source hints for Indonesian universities", () => {
    const messages = [{ role: "user", content: "test query" }]
    const result = augmentUserMessageForSearch(messages)
    const content = result[0].content as string
    expect(content).toContain("UI, UGM")
    expect(content).toContain("UGM")
    expect(content).toContain("ITB")
    expect(content).toContain("UIN")
    expect(content).toContain("Unair")
  })

  it("includes priority source hints for Indonesian media", () => {
    const messages = [{ role: "user", content: "test query" }]
    const result = augmentUserMessageForSearch(messages)
    const content = result[0].content as string
    expect(content).toContain("Kompas")
    expect(content).toContain("Tempo")
    expect(content).toContain("Republika")
  })

  it("includes non-exclusion clause", () => {
    const messages = [{ role: "user", content: "test query" }]
    const result = augmentUserMessageForSearch(messages)
    const content = result[0].content as string
    expect(content).toContain("do not exclude other credible sources")
  })

  it("does not mutate original messages array", () => {
    const messages = [{ role: "user", content: "original" }]
    const result = augmentUserMessageForSearch(messages)
    expect(messages[0].content).toBe("original")
    expect(result[0].content).not.toBe("original")
  })

  it("modifies only the last user message when multiple exist", () => {
    const messages = [
      { role: "user", content: "first question" },
      { role: "assistant", content: "response" },
      { role: "user", content: "second question" },
    ]
    const result = augmentUserMessageForSearch(messages)
    expect(result[0].content).toBe("first question")
    expect(result[2].content).toContain("second question")
    expect(result[2].content).toContain("Google Scholar")
  })

  it("returns messages unchanged if no user message exists", () => {
    const messages = [{ role: "system", content: "sys" }]
    const result = augmentUserMessageForSearch(messages)
    expect(result).toEqual(messages)
  })
})
