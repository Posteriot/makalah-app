import { describe, expect, it } from "vitest"

import { compileNaskahSnapshot, PAGE_ESTIMATE_CHARS_PER_PAGE } from "./compiler"
import type {
  NaskahArtifactRecord,
  NaskahCompileInput,
  NaskahCompiledSnapshot,
  NaskahSection,
  NaskahSectionKey,
  NaskahSourceArtifactRef,
} from "./types"

// ────────────────────────────────────────────────────────────────────────────
// Fixture helpers
//
// These helpers ONLY use real field names from convex/schema.ts:537-688
// and src/lib/paper/stage-types.ts. Do not introduce alias fields (no
// `topik.title`, no `abstrak.content`, no `judul.finalTitle`). The compiler
// must operate on the same shape the Convex wrapper hands it.
// ────────────────────────────────────────────────────────────────────────────

type StageDataArg = Record<string, Record<string, unknown> | undefined>

function makeArtifact(
  id: string,
  overrides: Partial<Omit<NaskahArtifactRecord, "_id">> = {},
): NaskahArtifactRecord {
  return {
    _id: id,
    content: overrides.content ?? "",
    format: overrides.format,
    invalidatedAt: overrides.invalidatedAt,
    title: overrides.title,
  }
}

function makeArtifactsById(
  ...records: NaskahArtifactRecord[]
): Record<string, NaskahArtifactRecord> {
  return Object.fromEntries(records.map((r) => [r._id, r]))
}

function makeInput(
  args: {
    stageData?: StageDataArg
    artifactsById?: Record<string, NaskahArtifactRecord>
    paperTitle?: string | null
    workingTitle?: string | null
  } = {},
): NaskahCompileInput {
  return {
    stageData: args.stageData ?? {},
    artifactsById: args.artifactsById ?? {},
    paperTitle: args.paperTitle ?? null,
    workingTitle: args.workingTitle ?? null,
  }
}

function getSection(
  snapshot: NaskahCompiledSnapshot,
  key: NaskahSectionKey,
): NaskahSection | undefined {
  return snapshot.sections.find((s) => s.key === key)
}

function getRef(
  snapshot: NaskahCompiledSnapshot,
  stage: string,
): NaskahSourceArtifactRef | undefined {
  return snapshot.sourceArtifactRefs.find((r) => r.stage === stage)
}

// ────────────────────────────────────────────────────────────────────────────
// GROUP A — Availability gate
// ────────────────────────────────────────────────────────────────────────────

describe("compileNaskahSnapshot — availability gate", () => {
  it("A1: empty session is unavailable with empty_session reason", () => {
    const result = compileNaskahSnapshot(makeInput())

    expect(result.isAvailable).toBe(false)
    expect(result.reasonIfUnavailable).toBe("empty_session")
    expect(result.sections).toEqual([])
    expect(result.title).toBe("Paper Tanpa Judul")
    expect(result.titleSource).toBe("fallback")
    expect(result.sourceArtifactRefs).toEqual([])
  })

  it("A2: only topik validated yields unavailable with working title", () => {
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          topik: { validatedAt: 1, definitif: "Topik Kerja" },
        },
      }),
    )

    expect(result.isAvailable).toBe(false)
    expect(result.reasonIfUnavailable).toBe("no_validated_abstrak")
    expect(result.sections).toEqual([])
    expect(result.title).toBe("Topik Kerja")
    expect(result.titleSource).toBe("topik_definitif")
  })

  it("A3: topik + abstrak validated yields available with abstrak first", () => {
    const artifact = makeArtifact("artifacts_abstrak_1", {
      content: "Isi abstrak tervalidasi.",
    })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          topik: { validatedAt: 1, definitif: "Topik Kerja" },
          abstrak: { validatedAt: 2, artifactId: "artifacts_abstrak_1" },
        },
        artifactsById: makeArtifactsById(artifact),
      }),
    )

    expect(result.isAvailable).toBe(true)
    expect(result.reasonIfUnavailable).toBeUndefined()
    expect(result.sections).toHaveLength(1)
    expect(result.sections[0].key).toBe("abstrak")
    expect(result.sections[0].label).toBe("Abstrak")
    expect(result.title).toBe("Topik Kerja")
    expect(result.titleSource).toBe("topik_definitif")
  })
})

// ────────────────────────────────────────────────────────────────────────────
// GROUP B — Content source resolution (artifact → inline fallback)
// ────────────────────────────────────────────────────────────────────────────

describe("compileNaskahSnapshot — content source resolution", () => {
  it("B1: validated abstrak with only artifact resolves via artifact", () => {
    const artifact = makeArtifact("artifacts_abstrak_1", {
      content: "Body from artifact.",
    })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: { validatedAt: 1, artifactId: "artifacts_abstrak_1" },
        },
        artifactsById: makeArtifactsById(artifact),
      }),
    )

    const section = getSection(result, "abstrak")
    expect(section).toBeDefined()
    expect(section?.content).toBe("Body from artifact.")
    expect(section?.sourceArtifactId).toBe("artifacts_abstrak_1")
    expect(section?.sourceStage).toBe("abstrak")

    const ref = getRef(result, "abstrak")
    expect(ref).toMatchObject({
      stage: "abstrak",
      artifactId: "artifacts_abstrak_1",
      usedForRender: true,
      resolution: "artifact",
    })
  })

  it("B2: validated abstrak with only inline ringkasanPenelitian resolves via inline", () => {
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: {
            validatedAt: 1,
            ringkasanPenelitian: "Inline abstrak body.",
          },
        },
      }),
    )

    expect(result.isAvailable).toBe(true)
    const section = getSection(result, "abstrak")
    expect(section?.content).toBe("Inline abstrak body.")
    expect(section?.sourceArtifactId).toBeUndefined()

    const ref = getRef(result, "abstrak")
    expect(ref).toMatchObject({
      stage: "abstrak",
      artifactId: undefined,
      usedForRender: true,
      resolution: "inline",
    })
  })

  it("B3: validated abstrak with invalidated artifact falls back to inline when present", () => {
    const artifact = makeArtifact("artifacts_abstrak_1", {
      content: "Body from artifact.",
      invalidatedAt: 999,
    })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: {
            validatedAt: 1,
            artifactId: "artifacts_abstrak_1",
            ringkasanPenelitian: "Inline survivor.",
          },
        },
        artifactsById: makeArtifactsById(artifact),
      }),
    )

    expect(result.isAvailable).toBe(true)
    const section = getSection(result, "abstrak")
    expect(section?.content).toBe("Inline survivor.")
    expect(section?.sourceArtifactId).toBeUndefined()

    const ref = getRef(result, "abstrak")
    expect(ref?.resolution).toBe("inline")
    expect(ref?.usedForRender).toBe(true)
  })

  it("B4: validated abstrak with invalidated artifact and no inline drops the section", () => {
    const artifact = makeArtifact("artifacts_abstrak_1", {
      content: "Body from artifact.",
      invalidatedAt: 999,
    })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: { validatedAt: 1, artifactId: "artifacts_abstrak_1" },
        },
        artifactsById: makeArtifactsById(artifact),
      }),
    )

    expect(result.isAvailable).toBe(false)
    expect(result.reasonIfUnavailable).toBe("abstrak_guard_failed")
    expect(getSection(result, "abstrak")).toBeUndefined()

    const ref = getRef(result, "abstrak")
    expect(ref).toMatchObject({
      stage: "abstrak",
      artifactId: "artifacts_abstrak_1",
      usedForRender: false,
      resolution: "dropped",
    })
  })

  it("B5: artifactId referring to missing artifact falls back to inline when present", () => {
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: {
            validatedAt: 1,
            artifactId: "artifacts_missing_1",
            ringkasanPenelitian: "Phantom fallback.",
          },
        },
        artifactsById: {},
      }),
    )

    expect(result.isAvailable).toBe(true)
    const section = getSection(result, "abstrak")
    expect(section?.content).toBe("Phantom fallback.")
    const ref = getRef(result, "abstrak")
    expect(ref?.resolution).toBe("inline")
    expect(ref?.usedForRender).toBe(true)
  })

  it("B6: validated pendahuluan with only inline fields joins in canonical order", () => {
    const abstrakArtifact = makeArtifact("art_a", { content: "Abstrak body." })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: { validatedAt: 1, artifactId: "art_a" },
          pendahuluan: {
            validatedAt: 2,
            // Intentionally inserted in non-canonical order to prove the
            // compiler's extractor imposes canonical field order, not
            // JS object insertion order.
            hipotesis: "Hipotesis H.",
            latarBelakang: "Latar A.",
            tujuanPenelitian: "Tujuan C.",
            rumusanMasalah: "Rumusan B.",
            // signifikansiPenelitian and researchGapAnalysis intentionally
            // omitted to prove skipped fields do not produce empty \n\n
            // separators.
          },
        },
        artifactsById: makeArtifactsById(abstrakArtifact),
      }),
    )

    const section = getSection(result, "pendahuluan")
    expect(section).toBeDefined()
    expect(section?.sourceStage).toBe("pendahuluan")
    expect(section?.sourceArtifactId).toBeUndefined()
    expect(section?.content).toBe(
      "Latar A.\n\nRumusan B.\n\nTujuan C.\n\nHipotesis H.",
    )

    const ref = getRef(result, "pendahuluan")
    expect(ref).toMatchObject({
      stage: "pendahuluan",
      artifactId: undefined,
      usedForRender: true,
      resolution: "inline",
    })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// GROUP C — pembaruan_abstrak override
// ────────────────────────────────────────────────────────────────────────────

describe("compileNaskahSnapshot — pembaruan_abstrak override", () => {
  it("C1: both stages validated, pembaruan_abstrak artifact wins; abstrak marked overridden", () => {
    const abstrakArtifact = makeArtifact("artifacts_abstrak_1", {
      content: "Base abstrak body.",
    })
    const pembaruanArtifact = makeArtifact("artifacts_pembaruan_1", {
      content: "Updated abstrak body.",
    })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: { validatedAt: 1, artifactId: "artifacts_abstrak_1" },
          pembaruan_abstrak: {
            validatedAt: 2,
            artifactId: "artifacts_pembaruan_1",
          },
        },
        artifactsById: makeArtifactsById(abstrakArtifact, pembaruanArtifact),
      }),
    )

    const sections = result.sections.filter((s) => s.key === "abstrak")
    expect(sections).toHaveLength(1)
    expect(sections[0].content).toBe("Updated abstrak body.")
    expect(sections[0].sourceStage).toBe("pembaruan_abstrak")
    expect(sections[0].sourceArtifactId).toBe("artifacts_pembaruan_1")

    const pembaruanRef = getRef(result, "pembaruan_abstrak")
    const abstrakRef = getRef(result, "abstrak")
    expect(pembaruanRef).toMatchObject({
      usedForRender: true,
      resolution: "artifact",
    })
    // abstrak had a perfectly valid artifact but was discarded in favor of
    // the pembaruan_abstrak source. That is "overridden", not "dropped".
    // "dropped" is reserved for cases where the resolver itself failed.
    expect(abstrakRef).toMatchObject({
      usedForRender: false,
      resolution: "overridden",
    })
  })

  it("C2: pembaruan_abstrak validated but its artifact invalidated; abstrak wins", () => {
    const abstrakArtifact = makeArtifact("artifacts_abstrak_1", {
      content: "Base abstrak body.",
    })
    const pembaruanArtifact = makeArtifact("artifacts_pembaruan_1", {
      content: "Stale updated body.",
      invalidatedAt: 999,
    })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: { validatedAt: 1, artifactId: "artifacts_abstrak_1" },
          pembaruan_abstrak: {
            validatedAt: 2,
            artifactId: "artifacts_pembaruan_1",
          },
        },
        artifactsById: makeArtifactsById(abstrakArtifact, pembaruanArtifact),
      }),
    )

    const section = getSection(result, "abstrak")
    expect(section?.content).toBe("Base abstrak body.")
    expect(section?.sourceStage).toBe("abstrak")

    const pembaruanRef = getRef(result, "pembaruan_abstrak")
    const abstrakRef = getRef(result, "abstrak")
    expect(pembaruanRef?.usedForRender).toBe(false)
    expect(pembaruanRef?.resolution).toBe("dropped")
    expect(abstrakRef?.usedForRender).toBe(true)
    expect(abstrakRef?.resolution).toBe("artifact")
  })

  it("C3: pembaruan_abstrak with only inline ringkasanPenelitianBaru wins via inline", () => {
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: {
            validatedAt: 1,
            ringkasanPenelitian: "Base inline.",
          },
          pembaruan_abstrak: {
            validatedAt: 2,
            ringkasanPenelitianBaru: "Updated inline.",
          },
        },
      }),
    )

    const section = getSection(result, "abstrak")
    expect(section?.content).toBe("Updated inline.")
    expect(section?.sourceStage).toBe("pembaruan_abstrak")
    expect(section?.sourceArtifactId).toBeUndefined()

    const pembaruanRef = getRef(result, "pembaruan_abstrak")
    expect(pembaruanRef?.resolution).toBe("inline")
    expect(pembaruanRef?.usedForRender).toBe(true)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// GROUP D — Title resolution
// ────────────────────────────────────────────────────────────────────────────

describe("compileNaskahSnapshot — title resolution", () => {
  it("D1: validated judul with judulTerpilih wins as judul_final", () => {
    const artifact = makeArtifact("artifacts_abstrak_1", {
      content: "Body.",
    })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: { validatedAt: 1, artifactId: "artifacts_abstrak_1" },
          judul: { validatedAt: 3, judulTerpilih: "Final Title" },
        },
        artifactsById: makeArtifactsById(artifact),
        paperTitle: "Stale paper title",
        workingTitle: "Stale working title",
      }),
    )

    expect(result.title).toBe("Final Title")
    expect(result.titleSource).toBe("judul_final")
  })

  it("D2: paperTitle present without validated judul wins as paper_title", () => {
    const artifact = makeArtifact("artifacts_abstrak_1", { content: "Body." })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: { validatedAt: 1, artifactId: "artifacts_abstrak_1" },
        },
        artifactsById: makeArtifactsById(artifact),
        paperTitle: "Paper Title",
        workingTitle: "Working Title",
      }),
    )

    expect(result.title).toBe("Paper Title")
    expect(result.titleSource).toBe("paper_title")
  })

  it("D3: workingTitle alone wins as working_title", () => {
    const artifact = makeArtifact("artifacts_abstrak_1", { content: "Body." })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: { validatedAt: 1, artifactId: "artifacts_abstrak_1" },
        },
        artifactsById: makeArtifactsById(artifact),
        workingTitle: "Working Title",
      }),
    )

    expect(result.title).toBe("Working Title")
    expect(result.titleSource).toBe("working_title")
  })

  it("D4: topik.definitif is lowest-priority working title", () => {
    const artifact = makeArtifact("artifacts_abstrak_1", { content: "Body." })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          topik: { validatedAt: 1, definitif: "Topik Definitif" },
          abstrak: { validatedAt: 2, artifactId: "artifacts_abstrak_1" },
        },
        artifactsById: makeArtifactsById(artifact),
      }),
    )

    expect(result.title).toBe("Topik Definitif")
    expect(result.titleSource).toBe("topik_definitif")
  })

  it("D5: nothing available yields fallback", () => {
    const result = compileNaskahSnapshot(makeInput())
    expect(result.title).toBe("Paper Tanpa Judul")
    expect(result.titleSource).toBe("fallback")
  })

  it("D6: judul validated but judulTerpilih blank falls through to paperTitle", () => {
    const artifact = makeArtifact("artifacts_abstrak_1", { content: "Body." })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: { validatedAt: 1, artifactId: "artifacts_abstrak_1" },
          judul: { validatedAt: 3, judulTerpilih: "   " },
        },
        artifactsById: makeArtifactsById(artifact),
        paperTitle: "Paper Title",
      }),
    )

    expect(result.title).toBe("Paper Title")
    expect(result.titleSource).toBe("paper_title")
  })
})

// ────────────────────────────────────────────────────────────────────────────
// GROUP E — Compile guard (placeholder + empty)
// ────────────────────────────────────────────────────────────────────────────

describe("compileNaskahSnapshot — compile guard", () => {
  it("E1: content with a line-start [TODO] token drops the section", () => {
    const artifact = makeArtifact("artifacts_abstrak_1", {
      content: "Intro paragraph.\n[TODO]\nMore text.",
    })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: { validatedAt: 1, artifactId: "artifacts_abstrak_1" },
        },
        artifactsById: makeArtifactsById(artifact),
      }),
    )

    expect(result.isAvailable).toBe(false)
    expect(getSection(result, "abstrak")).toBeUndefined()
  })

  it("E2: content with the word TODO mid-prose does NOT drop the section", () => {
    const artifact = makeArtifact("artifacts_abstrak_1", {
      content: "We still have a TODO list to discuss in later work.",
    })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: { validatedAt: 1, artifactId: "artifacts_abstrak_1" },
        },
        artifactsById: makeArtifactsById(artifact),
      }),
    )

    expect(result.isAvailable).toBe(true)
    expect(getSection(result, "abstrak")).toBeDefined()
  })

  it("E3: content with a mustache hole {{variable}} drops the section", () => {
    const artifact = makeArtifact("artifacts_abstrak_1", {
      content: "Halo {{name}}, berikut abstrak.",
    })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: { validatedAt: 1, artifactId: "artifacts_abstrak_1" },
        },
        artifactsById: makeArtifactsById(artifact),
      }),
    )

    expect(result.isAvailable).toBe(false)
    expect(getSection(result, "abstrak")).toBeUndefined()
  })

  it("E4: whitespace-only content drops the section", () => {
    const artifact = makeArtifact("artifacts_abstrak_1", {
      content: "   \n\t  \n",
    })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: { validatedAt: 1, artifactId: "artifacts_abstrak_1" },
        },
        artifactsById: makeArtifactsById(artifact),
      }),
    )

    expect(result.isAvailable).toBe(false)
    expect(getSection(result, "abstrak")).toBeUndefined()
  })
})

// ────────────────────────────────────────────────────────────────────────────
// GROUP F — Section ordering and exclusion
// ────────────────────────────────────────────────────────────────────────────

describe("compileNaskahSnapshot — section ordering", () => {
  it("F1: gagasan / outline never emit sections even when validated", () => {
    const abstrakArtifact = makeArtifact("artifacts_abstrak_1", {
      content: "Abstrak body.",
    })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          gagasan: { validatedAt: 1, ringkasan: "Ide kasar." },
          topik: { validatedAt: 2, definitif: "Topik Kerja" },
          outline: { validatedAt: 3 },
          abstrak: { validatedAt: 4, artifactId: "artifacts_abstrak_1" },
        },
        artifactsById: makeArtifactsById(abstrakArtifact),
      }),
    )

    const keys = result.sections.map((s) => s.key)
    expect(keys).toContain("abstrak")
    expect(keys).not.toContain("gagasan" as NaskahSectionKey)
    expect(keys).not.toContain("outline" as NaskahSectionKey)
    expect(keys).not.toContain("topik" as NaskahSectionKey)
  })

  it("F2: sections array follows canonical academic order regardless of validation order", () => {
    const artifacts = [
      makeArtifact("a_abstrak", { content: "A" }),
      makeArtifact("a_pendahuluan", { content: "B" }),
      makeArtifact("a_tinjauan", { content: "C" }),
      makeArtifact("a_metodologi", { content: "D" }),
      makeArtifact("a_hasil", { content: "E" }),
      makeArtifact("a_diskusi", { content: "F" }),
      makeArtifact("a_kesimpulan", { content: "G" }),
      makeArtifact("a_daftar_pustaka", { content: "H" }),
      makeArtifact("a_lampiran", { content: "I" }),
    ]
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          lampiran: { validatedAt: 9, artifactId: "a_lampiran" },
          daftar_pustaka: { validatedAt: 8, artifactId: "a_daftar_pustaka" },
          kesimpulan: { validatedAt: 7, artifactId: "a_kesimpulan" },
          diskusi: { validatedAt: 6, artifactId: "a_diskusi" },
          hasil: { validatedAt: 5, artifactId: "a_hasil" },
          metodologi: { validatedAt: 4, artifactId: "a_metodologi" },
          tinjauan_literatur: { validatedAt: 3, artifactId: "a_tinjauan" },
          pendahuluan: { validatedAt: 2, artifactId: "a_pendahuluan" },
          abstrak: { validatedAt: 1, artifactId: "a_abstrak" },
        },
        artifactsById: makeArtifactsById(...artifacts),
      }),
    )

    expect(result.sections.map((s) => s.key)).toEqual([
      "abstrak",
      "pendahuluan",
      "tinjauan_literatur",
      "metodologi",
      "hasil",
      "diskusi",
      "kesimpulan",
      "daftar_pustaka",
      "lampiran",
    ])
  })
})

// ────────────────────────────────────────────────────────────────────────────
// GROUP G — pageEstimate formula
// ────────────────────────────────────────────────────────────────────────────

describe("compileNaskahSnapshot — pageEstimate", () => {
  it("G1: pageEstimate equals ceil(totalJoinedPlainTextLength / PAGE_ESTIMATE_CHARS_PER_PAGE)", () => {
    const abstrakBody = "a".repeat(3000)
    const pendahuluanBody = "b".repeat(4000)
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: { validatedAt: 1, artifactId: "art_a" },
          pendahuluan: { validatedAt: 2, artifactId: "art_p" },
        },
        artifactsById: makeArtifactsById(
          makeArtifact("art_a", { content: abstrakBody }),
          makeArtifact("art_p", { content: pendahuluanBody }),
        ),
      }),
    )

    const joined = result.sections.map((s) => s.content).join("\n\n")
    const expected = Math.max(
      1,
      Math.ceil(joined.length / PAGE_ESTIMATE_CHARS_PER_PAGE),
    )
    expect(result.pageEstimate).toBe(expected)
    expect(PAGE_ESTIMATE_CHARS_PER_PAGE).toBe(2200)
  })

  it("G2: single short section yields pageEstimate === 1", () => {
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: { validatedAt: 1, artifactId: "art_a" },
        },
        artifactsById: makeArtifactsById(
          makeArtifact("art_a", { content: "Pendek." }),
        ),
      }),
    )

    expect(result.pageEstimate).toBe(1)
  })

  it("G3: zero sections still yields pageEstimate >= 1 via max guard", () => {
    const result = compileNaskahSnapshot(makeInput())
    expect(result.pageEstimate).toBeGreaterThanOrEqual(1)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// GROUP I — sourceArtifactRefs invariants
// ────────────────────────────────────────────────────────────────────────────

describe("compileNaskahSnapshot — sourceArtifactRefs invariants", () => {
  it("I1: stages without validatedAt never appear in sourceArtifactRefs", () => {
    const artifact = makeArtifact("art_a", { content: "Body." })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: { validatedAt: 1, artifactId: "art_a" },
          pendahuluan: {
            // no validatedAt
            latarBelakang: "Draft yang belum tervalidasi.",
          },
        },
        artifactsById: makeArtifactsById(artifact),
      }),
    )

    const stages = result.sourceArtifactRefs.map((r) => r.stage)
    expect(stages).toContain("abstrak")
    expect(stages).not.toContain("pendahuluan")
  })

  it("I2: both pembaruan_abstrak and abstrak appear in refs when both validated", () => {
    const abstrakArtifact = makeArtifact("art_a", { content: "Base." })
    const pembaruanArtifact = makeArtifact("art_p", { content: "Updated." })
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          abstrak: { validatedAt: 1, artifactId: "art_a" },
          pembaruan_abstrak: { validatedAt: 2, artifactId: "art_p" },
        },
        artifactsById: makeArtifactsById(abstrakArtifact, pembaruanArtifact),
      }),
    )

    const stages = result.sourceArtifactRefs.map((r) => r.stage)
    expect(stages).toContain("abstrak")
    expect(stages).toContain("pembaruan_abstrak")
  })

  it("I3: refs order follows STAGE_ORDER deterministically", () => {
    const artifacts = [
      makeArtifact("a_abstrak", { content: "A" }),
      makeArtifact("a_pendahuluan", { content: "B" }),
      makeArtifact("a_pembaruan", { content: "C" }),
    ]
    const result = compileNaskahSnapshot(
      makeInput({
        stageData: {
          pendahuluan: { validatedAt: 3, artifactId: "a_pendahuluan" },
          pembaruan_abstrak: { validatedAt: 2, artifactId: "a_pembaruan" },
          abstrak: { validatedAt: 1, artifactId: "a_abstrak" },
        },
        artifactsById: makeArtifactsById(...artifacts),
      }),
    )

    const stages = result.sourceArtifactRefs.map((r) => r.stage)
    // STAGE_ORDER: ... abstrak, pendahuluan, ..., pembaruan_abstrak, ...
    // so the ref list must sort abstrak → pendahuluan → pembaruan_abstrak
    expect(stages).toEqual(["abstrak", "pendahuluan", "pembaruan_abstrak"])
  })
})
