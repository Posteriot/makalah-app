import { describe, expect, it } from "vitest"
import {
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
})
