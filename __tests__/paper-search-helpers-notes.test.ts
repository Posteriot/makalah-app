import { describe, it, expect } from "vitest"
import {
  getPaperToolsOnlyNote,
  getResearchIncompleteNote,
  getFunctionToolsModeNote,
} from "@/lib/ai/paper-search-helpers"

describe("paper-search-helpers system notes", () => {
  describe("getPaperToolsOnlyNote", () => {
    describe("active search stages (gagasan, tinjauan_literatur)", () => {
      const gagasanNote = getPaperToolsOnlyNote("gagasan")
      const tinjauanNote = getPaperToolsOnlyNote("tinjauan_literatur")

      it("does NOT reference google_search", () => {
        expect(gagasanNote).not.toContain("google_search")
        expect(tinjauanNote).not.toContain("google_search")
      })

      it("indicates NO WEB SEARCH in header", () => {
        expect(gagasanNote).toContain("FUNCTION TOOLS MODE (NO WEB SEARCH)")
        expect(tinjauanNote).toContain("FUNCTION TOOLS MODE (NO WEB SEARCH)")
      })

      it("tells model search is unavailable", () => {
        expect(gagasanNote).toContain("Web search is NOT available")
        expect(gagasanNote).toContain("Do NOT promise to search")
      })

      it("suggests asking user to request search", () => {
        expect(gagasanNote).toContain("Ask user to explicitly request a search")
      })

      it("lists real available tools", () => {
        expect(gagasanNote).toContain("updateStageData")
        expect(gagasanNote).toContain("submitStageForValidation")
        expect(gagasanNote).toContain("createArtifact")
        expect(gagasanNote).toContain("updateArtifact")
      })

      it("does NOT contain Indonesian instructions", () => {
        expect(gagasanNote).not.toContain("TIDAK TERSEDIA")
        expect(gagasanNote).not.toContain("JANGAN")
        expect(gagasanNote).not.toContain("TERLARANG")
      })
    })

    describe("review/derivation stages", () => {
      const reviewNote = getPaperToolsOnlyNote("pendahuluan")
      const diskusiNote = getPaperToolsOnlyNote("diskusi")
      const noStageNote = getPaperToolsOnlyNote()

      it("uses simpler header without NO WEB SEARCH", () => {
        expect(reviewNote).toContain("FUNCTION TOOLS MODE")
        expect(reviewNote).not.toContain("NO WEB SEARCH")
      })

      it("tells model to use approved material", () => {
        expect(reviewNote).toContain("Use approved material from previous stages")
      })

      it("does NOT suggest asking user to search", () => {
        expect(reviewNote).not.toContain("Ask user to explicitly request a search")
      })

      it("does not require new web search", () => {
        expect(reviewNote).toContain("does not require new web search")
      })

      it("lists real available tools", () => {
        expect(reviewNote).toContain("updateStageData")
        expect(reviewNote).toContain("submitStageForValidation")
        expect(reviewNote).toContain("createArtifact")
        expect(reviewNote).toContain("updateArtifact")
      })

      it("works for undefined stage", () => {
        expect(noStageNote).toContain("FUNCTION TOOLS MODE")
        expect(noStageNote).not.toContain("NO WEB SEARCH")
      })

      it("works for diskusi stage", () => {
        expect(diskusiNote).toContain("does not require new web search")
      })

      it("does NOT contain Indonesian instructions", () => {
        expect(reviewNote).not.toContain("TIDAK TERSEDIA")
        expect(reviewNote).not.toContain("JANGAN")
        expect(reviewNote).not.toContain("TERLARANG")
      })
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
