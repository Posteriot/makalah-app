import { describe, expect, it } from "vitest"
import { STAGE_ORDER } from "../../../../convex/paperSessions/constants"
import {
  deriveTaskList,
  getPhaseForStage,
  PHASE_GROUPS,
} from "../task-derivation"

// ============================================================================
// 1. Empty stageData for all 14 stages
// ============================================================================

describe("deriveTaskList — empty stageData", () => {
  for (const stageId of STAGE_ORDER) {
    it(`${stageId}: first task active, rest pending, completed = 0`, () => {
      const result = deriveTaskList(stageId, {})

      expect(result.completed).toBe(0)
      expect(result.total).toBe(result.tasks.length)
      expect(result.total).toBeGreaterThan(0)

      expect(result.tasks[0].status).toBe("active")
      for (let i = 1; i < result.tasks.length; i++) {
        expect(result.tasks[i].status).toBe("pending")
      }
    })
  }
})

// ============================================================================
// 2. Fully filled stageData — representative set
// ============================================================================

describe("deriveTaskList — fully filled stageData", () => {
  it("gagasan: all 4 tasks complete", () => {
    const result = deriveTaskList("gagasan", {
      gagasan: {
        ideKasar: "Ide tentang AI",
        analisis: "Feasible karena...",
        angle: "Angle spesifik",
        referensiAwal: ["ref1", "ref2"],
      },
    })
    expect(result.completed).toBe(4)
    expect(result.total).toBe(4)
    expect(result.tasks.every((t) => t.status === "complete")).toBe(true)
  })

  it("topik: all 4 tasks complete", () => {
    const result = deriveTaskList("topik", {
      topik: {
        definitif: "Judul definitif",
        angleSpesifik: "Angle detail",
        argumentasiKebaruan: "Kebaruan karena...",
        researchGap: "Gap yang ditemukan",
      },
    })
    expect(result.completed).toBe(4)
    expect(result.total).toBe(4)
  })

  it("tinjauan_literatur: all 4 tasks complete", () => {
    const result = deriveTaskList("tinjauan_literatur", {
      tinjauan_literatur: {
        kerangkaTeoretis: "Kerangka...",
        reviewLiteratur: "Review...",
        gapAnalysis: "Gap...",
        referensi: ["ref1"],
      },
    })
    expect(result.completed).toBe(4)
    expect(result.total).toBe(4)
  })

  it("hasil: all 2 tasks complete", () => {
    const result = deriveTaskList("hasil", {
      hasil: {
        temuanUtama: ["temuan1"],
        metodePenyajian: "tabel",
      },
    })
    expect(result.completed).toBe(2)
    expect(result.total).toBe(2)
  })

  it("lampiran: items only (no tidakAdaLampiran) → 1 complete, 1 active", () => {
    const result = deriveTaskList("lampiran", {
      lampiran: {
        items: ["lampiran1"],
        tidakAdaLampiran: false,
      },
    })
    expect(result.completed).toBe(1)
    expect(result.tasks[0].status).toBe("complete")
    expect(result.tasks[1].status).toBe("active")
  })

  it("lampiran: items + tidakAdaLampiran=true → all 2 complete", () => {
    const result = deriveTaskList("lampiran", {
      lampiran: {
        items: ["lampiran1"],
        tidakAdaLampiran: true,
      },
    })
    expect(result.completed).toBe(2)
    expect(result.total).toBe(2)
  })

  it("judul: all 2 tasks complete", () => {
    const result = deriveTaskList("judul", {
      judul: {
        opsiJudul: ["Judul A", "Judul B"],
        judulTerpilih: "Judul A",
      },
    })
    expect(result.completed).toBe(2)
    expect(result.total).toBe(2)
  })
})

// ============================================================================
// 3. Partially filled stageData
// ============================================================================

describe("deriveTaskList — partially filled", () => {
  it("gagasan with 2/4 fields: tasks[0-1] complete, tasks[2] active, tasks[3] pending", () => {
    // Order: ideKasar, referensiAwal, analisis, angle
    const result = deriveTaskList("gagasan", {
      gagasan: {
        ideKasar: "Ide tentang AI",
        referensiAwal: [{ title: "Paper 1" }],
      },
    })

    expect(result.completed).toBe(2)
    expect(result.total).toBe(4)
    expect(result.tasks[0].status).toBe("complete")  // ideKasar
    expect(result.tasks[1].status).toBe("complete")  // referensiAwal
    expect(result.tasks[2].status).toBe("active")    // analisis
    expect(result.tasks[3].status).toBe("pending")   // angle
  })
})

// ============================================================================
// 4. Lampiran edge cases
// ============================================================================

describe("deriveTaskList — lampiran edge cases", () => {
  it("tidakAdaLampiran = true → both tasks complete even without items", () => {
    const result = deriveTaskList("lampiran", {
      lampiran: {
        tidakAdaLampiran: true,
      },
    })

    expect(result.completed).toBe(2)
    expect(result.total).toBe(2)
    expect(result.tasks[0].status).toBe("complete")
    expect(result.tasks[1].status).toBe("complete")
  })

  it("items populated without tidakAdaLampiran → first task complete, second active", () => {
    const result = deriveTaskList("lampiran", {
      lampiran: {
        items: ["lampiran1"],
      },
    })

    expect(result.completed).toBe(1)
    expect(result.tasks[0].status).toBe("complete")
    expect(result.tasks[1].status).toBe("active")
  })
})

// ============================================================================
// 5. Number fields
// ============================================================================

describe("deriveTaskList — number fields", () => {
  it("outline.totalWordCount = 5000 → complete", () => {
    const result = deriveTaskList("outline", {
      outline: {
        sections: ["section1"],
        totalWordCount: 5000,
      },
    })

    expect(result.tasks[1].status).toBe("complete")
    expect(result.completed).toBe(2)
  })

  it("outline.totalWordCount = 0 → not complete", () => {
    const result = deriveTaskList("outline", {
      outline: {
        sections: ["section1"],
        totalWordCount: 0,
      },
    })

    expect(result.tasks[0].status).toBe("complete")
    expect(result.tasks[1].status).toBe("active")
    expect(result.completed).toBe(1)
  })
})

// ============================================================================
// 5b. Number fields — negative values
// ============================================================================

describe("deriveTaskList — negative number values", () => {
  it("outline.totalWordCount = -1 → not complete", () => {
    const result = deriveTaskList("outline", {
      outline: {
        sections: ["section1"],
        totalWordCount: -1,
      },
    })

    expect(result.tasks[1].status).toBe("active")
    expect(result.completed).toBe(1)
  })
})

// ============================================================================
// 5c. StageData key mismatch — silent fallback to all pending
// ============================================================================

describe("deriveTaskList — stageData key mismatch", () => {
  it("wrong key in stageData → all tasks pending (first active)", () => {
    const result = deriveTaskList("gagasan", { topik: { ideKasar: "test" } })

    expect(result.completed).toBe(0)
    expect(result.tasks[0].status).toBe("active")
    result.tasks.slice(1).forEach((t) => {
      expect(t.status).toBe("pending")
    })
  })
})

// ============================================================================
// 6. Enum fields
// ============================================================================

describe("deriveTaskList — enum fields", () => {
  it("metodologi.pendekatanPenelitian = 'kualitatif' → complete", () => {
    const result = deriveTaskList("metodologi", {
      metodologi: {
        desainPenelitian: "Deskriptif",
        metodePerolehanData: "Survei",
        teknikAnalisis: "Tematik",
        pendekatanPenelitian: "kualitatif",
      },
    })

    expect(result.tasks[3].field).toBe("pendekatanPenelitian")
    expect(result.tasks[3].status).toBe("complete")
    expect(result.completed).toBe(4)
  })
})

// ============================================================================
// 7. PHASE_GROUPS covers all 14 stages exactly once
// ============================================================================

describe("PHASE_GROUPS", () => {
  it("covers all 14 stages exactly once, no duplicates", () => {
    const allStagesInPhases = PHASE_GROUPS.flatMap((g) => [...g.stages])

    // Covers all 14
    expect(allStagesInPhases).toHaveLength(STAGE_ORDER.length)

    // Every stage from STAGE_ORDER is present
    for (const stage of STAGE_ORDER) {
      expect(allStagesInPhases).toContain(stage)
    }

    // No duplicates
    const unique = new Set(allStagesInPhases)
    expect(unique.size).toBe(allStagesInPhases.length)
  })
})

// ============================================================================
// 8. getPhaseForStage
// ============================================================================

describe("getPhaseForStage", () => {
  it("gagasan → Foundation, index 0", () => {
    const result = getPhaseForStage("gagasan")
    expect(result).toEqual({ label: "Foundation", index: 0 })
  })

  it("tinjauan_literatur → Core Sections, index 1", () => {
    const result = getPhaseForStage("tinjauan_literatur")
    expect(result).toEqual({ label: "Core Sections", index: 1 })
  })

  it("diskusi → Results & Analysis, index 2", () => {
    const result = getPhaseForStage("diskusi")
    expect(result).toEqual({ label: "Results & Analysis", index: 2 })
  })

  it("judul → Finalization, index 3", () => {
    const result = getPhaseForStage("judul")
    expect(result).toEqual({ label: "Finalization", index: 3 })
  })
})
