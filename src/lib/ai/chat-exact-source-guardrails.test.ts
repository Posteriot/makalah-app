import { describe, expect, it } from "vitest"
import {
  buildDeterministicExactSourcePrepareStep,
  buildDeterministicExactSourceClarifyNote,
  buildDeterministicExactSourceForceInspectNote,
  buildExactSourceInspectionRouterNote,
  buildExactSourceInspectionSystemMessage,
  EXACT_SOURCE_INSPECTION_RULES,
  EXACT_SOURCE_NARRATIVE_BANNED_PHRASES,
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

  it("builds a deterministic force-inspect note with exact source identity", () => {
    const note = buildDeterministicExactSourceForceInspectNote({
      sourceId: "source-1",
      title: "Judul Artikel",
      originalUrl: "https://example.com/original",
      resolvedUrl: "https://example.com/resolved",
      siteName: "Contoh Media",
    })

    expect(note).toContain("sourceId")
    expect(note).toContain("source-1")
    expect(note).toContain("Judul Artikel")
    expect(note).toContain("Do not answer from memory")
  })

  it("builds a deterministic clarify note without internal jargon", () => {
    const note = buildDeterministicExactSourceClarifyNote()

    expect(note).toContain("Ask a brief clarification question")
    expect(note).toContain("Do not guess")
    expect(note).not.toContain("metadata sumber")
  })

  it("blocks semi-internal user-facing phrases", () => {
    expect(EXACT_SOURCE_NARRATIVE_BANNED_PHRASES).toEqual(
      expect.arrayContaining([
        "metadata sumber",
        "data yang tersimpan",
        "hasil pencarian sebelumnya",
        "aku akan cek metadata",
      ])
    )
    expect(EXACT_SOURCE_INSPECTION_RULES).toContain("Do not say phrases like")
  })

  it("builds prepareStep wiring for deterministic exact-source force-inspect mode", () => {
    const routePlan = buildDeterministicExactSourcePrepareStep({
      messages: [
        { role: "system", content: "base-system" },
        { role: "user", content: "siapa penulisnya?" },
      ],
      resolution: {
        mode: "force-inspect",
        reason: "unique-source-match",
        matchedSource: {
          sourceId: "source-1",
          title: "Judul Artikel",
          originalUrl: "https://example.com/original",
          resolvedUrl: "https://example.com/resolved",
          siteName: "Contoh Media",
        },
      },
    })

    expect(routePlan.messages[1]?.content).toContain("sourceId=\"source-1\"")
    expect(routePlan.maxToolSteps).toBe(2)
    expect(routePlan.prepareStep?.({ stepNumber: 0 })).toEqual({
      toolChoice: { type: "tool", toolName: "inspectSourceDocument" },
      activeTools: ["inspectSourceDocument"],
    })
    expect(routePlan.prepareStep?.({ stepNumber: 1 })).toEqual({
      toolChoice: "none",
      activeTools: [],
    })
  })

  it("injects only a clarify note when exact-source target is ambiguous", () => {
    const routePlan = buildDeterministicExactSourcePrepareStep({
      messages: [
        { role: "system", content: "base-system" },
        { role: "user", content: "judul lengkapnya?" },
      ],
      resolution: {
        mode: "clarify",
        reason: "ambiguous-source-match",
      },
    })

    expect(routePlan.messages[1]?.content).toContain("Ask a brief clarification question")
    expect(routePlan.prepareStep).toBeUndefined()
    expect(routePlan.maxToolSteps).toBeUndefined()
  })

  it("keeps legacy flow untouched for non exact follow-up", () => {
    const baseMessages = [
      { role: "system" as const, content: "base-system" },
      { role: "user" as const, content: "ringkas sumber tadi" },
    ]

    const routePlan = buildDeterministicExactSourcePrepareStep({
      messages: baseMessages,
      resolution: {
        mode: "none",
        reason: "not-an-exact-source-request",
      },
    })

    expect(routePlan.messages).toEqual(baseMessages)
    expect(routePlan.prepareStep).toBeUndefined()
    expect(routePlan.maxToolSteps).toBeUndefined()
  })
})
