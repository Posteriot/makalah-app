import { describe, it, expect } from "vitest"
import {
  PAPER_TOOLS_ONLY_NOTE,
  getResearchIncompleteNote,
  getFunctionToolsModeNote,
} from "@/lib/ai/paper-search-helpers"

describe("paper-search-helpers system notes", () => {
  describe("PAPER_TOOLS_ONLY_NOTE", () => {
    it("does NOT reference google_search", () => {
      expect(PAPER_TOOLS_ONLY_NOTE).not.toContain("google_search")
    })

    it("is written in English", () => {
      expect(PAPER_TOOLS_ONLY_NOTE).toContain("FUNCTION TOOLS MODE")
      expect(PAPER_TOOLS_ONLY_NOTE).toContain("Web search is NOT available")
      expect(PAPER_TOOLS_ONLY_NOTE).toContain("Do NOT promise to search")
    })

    it("lists real available tools", () => {
      expect(PAPER_TOOLS_ONLY_NOTE).toContain("updateStageData")
      expect(PAPER_TOOLS_ONLY_NOTE).toContain("submitStageForValidation")
      expect(PAPER_TOOLS_ONLY_NOTE).toContain("createArtifact")
      expect(PAPER_TOOLS_ONLY_NOTE).toContain("updateArtifact")
    })

    it("does NOT contain Indonesian instructions", () => {
      expect(PAPER_TOOLS_ONLY_NOTE).not.toContain("TIDAK TERSEDIA")
      expect(PAPER_TOOLS_ONLY_NOTE).not.toContain("JANGAN")
      expect(PAPER_TOOLS_ONLY_NOTE).not.toContain("TERLARANG")
    })
  })

  describe("getResearchIncompleteNote", () => {
    const note = getResearchIncompleteNote("gagasan", "Need 2 initial references")

    it("does NOT reference google_search", () => {
      expect(note).not.toContain("google_search")
    })

    it("is written in English", () => {
      expect(note).toContain("RESEARCH INCOMPLETE")
      expect(note).toContain("Express your intent to search")
    })

    it("includes stage name and requirement", () => {
      expect(note).toContain("GAGASAN")
      expect(note).toContain("Need 2 initial references")
    })

    it("does NOT contain Indonesian instructions", () => {
      expect(note).not.toContain("INSTRUKSI WAJIB")
      expect(note).not.toContain("Gunakan tool")
    })
  })

  describe("getFunctionToolsModeNote", () => {
    const note = getFunctionToolsModeNote("search completed, 3 sources found")

    it("is written in English", () => {
      expect(note).toContain("FUNCTION_TOOLS")
      expect(note).toContain("AVAILABLE")
      expect(note).toContain("TASK")
    })

    it("lists real tools", () => {
      expect(note).toContain("createArtifact")
      expect(note).toContain("updateStageData")
      expect(note).toContain("submitStageForValidation")
    })

    it("does NOT contain Indonesian", () => {
      expect(note).not.toContain("TERSEDIA")
      expect(note).not.toContain("TUGAS")
    })

    it("includes search info parameter", () => {
      expect(note).toContain("search completed, 3 sources found")
    })
  })
})
