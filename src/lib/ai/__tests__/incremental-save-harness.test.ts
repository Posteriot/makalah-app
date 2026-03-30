import { describe, it, expect } from "vitest"
import { buildIncrementalSavePrepareStep } from "../incremental-save-harness"

const EMPTY_GAGASAN_DATA = {}
const PARTIAL_GAGASAN_DATA = {
  referensiAwal: [{ title: "test", url: "http://test.com" }],
  ideKasar: "Some rough idea",
}
const ALMOST_COMPLETE_GAGASAN_DATA = {
  referensiAwal: [{ title: "test", url: "http://test.com" }],
  ideKasar: "Some rough idea",
  analisis: "Feasibility looks good",
}
const COMPLETE_GAGASAN_DATA = {
  referensiAwal: [{ title: "test", url: "http://test.com" }],
  ideKasar: "Some rough idea",
  analisis: "Feasibility looks good",
  angle: "Specific angle chosen",
}

describe("buildIncrementalSavePrepareStep", () => {
  describe("guards", () => {
    it("returns undefined when enableWebSearch is true", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: EMPTY_GAGASAN_DATA,
        stageStatus: "drafting",
        enableWebSearch: true,
      })
      expect(result).toBeUndefined()
    })

    it("returns undefined when stageStatus is not drafting", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: EMPTY_GAGASAN_DATA,
        stageStatus: "pending_validation",
        enableWebSearch: false,
      })
      expect(result).toBeUndefined()
    })

    it("returns undefined when stage is not supported (outline)", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "outline",
        stageData: {},
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result).toBeUndefined()
    })

    it("returns mature save config when all fields complete but no ringkasan", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: COMPLETE_GAGASAN_DATA,
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result).toBeDefined()
      expect(result!.targetField).toBe("_matureSave")
      expect(result!.maxToolSteps).toBe(4)
    })

    it("returns undefined when all fields complete AND ringkasan exists", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: { ...COMPLETE_GAGASAN_DATA, ringkasan: "Agreed angle on topic" },
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result).toBeUndefined()
    })
  })

  describe("incremental mode", () => {
    it("targets ideKasar when only referensiAwal is filled", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: {
          referensiAwal: [{ title: "ref", url: "http://ref.com" }],
        },
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result).toBeDefined()
      expect(result!.targetField).toBe("ideKasar")
      expect(result!.maxToolSteps).toBe(2)
    })

    it("targets analisis when ideKasar is filled", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: PARTIAL_GAGASAN_DATA,
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result).toBeDefined()
      expect(result!.targetField).toBe("analisis")
    })

    it("targets angle when analisis is filled", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: ALMOST_COMPLETE_GAGASAN_DATA,
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result).toBeDefined()
      expect(result!.targetField).toBe("angle")
    })

    it("prepareStep forces saveStageDraft at step 0, none at step 1", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: PARTIAL_GAGASAN_DATA,
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      const step0 = result!.prepareStep({ stepNumber: 0 })
      expect(step0!.toolChoice).toEqual({ type: "tool", toolName: "saveStageDraft" })
      expect(step0!.activeTools).toEqual(["saveStageDraft"])

      const step1 = result!.prepareStep({ stepNumber: 1 })
      expect(step1!.toolChoice).toBe("none")
      // activeTools NOT restricted — model needs tool context for yaml-spec generation
      expect(step1!.activeTools).toBeUndefined()
    })
  })

  describe("auto-persist field skipping", () => {
    it("skips referensiAwal even when empty (auto-persisted by server)", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: {},
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result!.targetField).toBe("ideKasar")
    })

    it("skips referensiPendukung for topik", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "topik",
        stageData: {},
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result!.targetField).toBe("definitif")
    })
  })

  describe("system note", () => {
    it("includes field name, INCREMENTAL_SAVE, and saveStageDraft", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "gagasan",
        stageData: { referensiAwal: [{ title: "t" }] },
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result!.systemNote).toContain("ideKasar")
      expect(result!.systemNote).toContain("INCREMENTAL_SAVE")
      expect(result!.systemNote).toContain("saveStageDraft")
    })
  })

  describe("topik stage support", () => {
    it("targets definitif as first field", () => {
      const result = buildIncrementalSavePrepareStep({
        currentStage: "topik",
        stageData: {},
        stageStatus: "drafting",
        enableWebSearch: false,
      })
      expect(result).toBeDefined()
      expect(result!.targetField).toBe("definitif")
    })
  })
})
