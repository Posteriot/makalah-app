import { describe, expect, it } from "vitest"
import {
  buildExactSourceInspectionRouterNote,
  buildExactSourceInspectionSystemMessage,
  EXACT_SOURCE_INSPECTION_RULES,
} from "./exact-source-guardrails"

describe("chat exact source guardrails", () => {
  it("builds the exact-source system message used by the route", () => {
    const message = buildExactSourceInspectionSystemMessage()

    expect(message).toEqual({
      role: "system",
      content: EXACT_SOURCE_INSPECTION_RULES,
    })
    expect(message.content).toContain("inspectSourceDocument")
    expect(message.content).toContain("natural narrative language")
  })

  it("omits the follow-up note when no prior sources exist", () => {
    expect(buildExactSourceInspectionRouterNote(false)).toBe("")
  })

  it("builds the follow-up note used by the route when prior sources exist", () => {
    const note = buildExactSourceInspectionRouterNote(true)

    expect(note).toContain("RAG SOURCE CHUNKS AVAILABLE")
    expect(note).toContain("inspectSourceDocument")
    expect(note).toContain("enableWebSearch=false")
  })
})
