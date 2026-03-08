import { describe, it, expect } from "vitest"
import {
  composeSkillInstructions,
  getSkill,
  getToolExamples,
  referenceIntegritySkill,
  sourceQualitySkill,
} from "@/lib/ai/skills"
import type { SkillContext, ValidationResult, ToolExample } from "@/lib/ai/skills"

describe("Skill Registry", () => {
  describe("composeSkillInstructions", () => {
    it("should return only SOURCE QUALITY CRITERIA when no recent sources", () => {
      const context: SkillContext = {
        isPaperMode: false,
        currentStage: null,
        hasRecentSources: false,
        availableSources: [],
      }

      const result = composeSkillInstructions(context)

      expect(result).toContain("SOURCE QUALITY CRITERIA")
      expect(result).not.toContain("REFERENCE INTEGRITY")
    })

    it("should return both instructions when has recent sources", () => {
      const context: SkillContext = {
        isPaperMode: true,
        currentStage: "gagasan",
        hasRecentSources: true,
        availableSources: [
          { url: "https://scholar.google.com/paper-1", title: "Paper 1" },
        ],
      }

      const result = composeSkillInstructions(context)

      expect(result).toContain("REFERENCE INTEGRITY")
      expect(result).toContain("SOURCE QUALITY CRITERIA")
    })
  })

  describe("getSkill", () => {
    it("should find reference-integrity by name", () => {
      const skill = getSkill("reference-integrity")

      expect(skill).toBeDefined()
      expect(skill?.name).toBe("reference-integrity")
    })

    it("should find source-quality by name", () => {
      const skill = getSkill("source-quality")

      expect(skill).toBeDefined()
      expect(skill?.name).toBe("source-quality")
    })

    it("should return undefined for unknown name", () => {
      const skill = getSkill("nonexistent-skill")

      expect(skill).toBeUndefined()
    })
  })

  describe("getToolExamples", () => {
    it("should return examples for createArtifact containing sources", () => {
      const result = getToolExamples("createArtifact")

      expect(result).not.toBe("")
      expect(result).toContain("sources")
    })

    it("should return examples for updateStageData containing referensiAwal", () => {
      const result = getToolExamples("updateStageData")

      expect(result).not.toBe("")
      expect(result).toContain("referensiAwal")
    })

    it("should return empty string for unknown tool", () => {
      const result = getToolExamples("unknownTool")

      expect(result).toBe("")
    })
  })

  describe("re-exports", () => {
    it("should export referenceIntegritySkill", () => {
      expect(referenceIntegritySkill).toBeDefined()
      expect(referenceIntegritySkill.name).toBe("reference-integrity")
    })

    it("should export sourceQualitySkill", () => {
      expect(sourceQualitySkill).toBeDefined()
      expect(sourceQualitySkill.name).toBe("source-quality")
    })
  })
})
