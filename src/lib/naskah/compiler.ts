import {
  PaperStageId,
  STAGE_ORDER,
} from "../../../convex/paperSessions/constants"
import type {
  NaskahArtifactRecord,
  NaskahCompileInput,
  NaskahCompiledSnapshot,
  NaskahResolution,
  NaskahSection,
  NaskahSectionKey,
  NaskahSectionLabel,
  NaskahSourceArtifactRef,
  NaskahTitleSource,
  NaskahUnavailabilityReason,
} from "./types"

/**
 * Character budget per estimated page. Matches the plan and design doc.
 * Changes to this constant intentionally invalidate page estimates in
 * stored snapshots — the rebuild pass will produce fresh numbers.
 */
export const PAGE_ESTIMATE_CHARS_PER_PAGE = 2200

/**
 * Mapping from internal workflow stage keys to final naskah section keys.
 * Stages that don't appear here never produce a section:
 * - `gagasan`, `outline` are workflow-only and are ignored entirely.
 * - `topik` and `judul` contribute title metadata only.
 * - `pembaruan_abstrak` contributes to the `abstrak` section via override,
 *   so it's not listed here directly — the compiler handles it explicitly.
 */
const CONTENT_STAGE_TO_SECTION_KEY: Partial<
  Record<PaperStageId, NaskahSectionKey>
> = {
  abstrak: "abstrak",
  pendahuluan: "pendahuluan",
  tinjauan_literatur: "tinjauan_literatur",
  metodologi: "metodologi",
  hasil: "hasil",
  diskusi: "diskusi",
  kesimpulan: "kesimpulan",
  daftar_pustaka: "daftar_pustaka",
  lampiran: "lampiran",
}

const SECTION_LABELS: Record<NaskahSectionKey, NaskahSectionLabel> = {
  abstrak: "Abstrak",
  pendahuluan: "Pendahuluan",
  tinjauan_literatur: "Tinjauan Literatur",
  metodologi: "Metodologi",
  hasil: "Hasil",
  diskusi: "Diskusi",
  kesimpulan: "Kesimpulan",
  daftar_pustaka: "Daftar Pustaka",
  lampiran: "Lampiran",
}

/**
 * Canonical order sections must appear in the compiled snapshot, regardless
 * of validation order or stageData insertion order.
 */
const SECTION_KEY_ORDER: NaskahSectionKey[] = [
  "abstrak",
  "pendahuluan",
  "tinjauan_literatur",
  "metodologi",
  "hasil",
  "diskusi",
  "kesimpulan",
  "daftar_pustaka",
  "lampiran",
]

// ────────────────────────────────────────────────────────────────────────────
// Compile guard
// ────────────────────────────────────────────────────────────────────────────

const PLACEHOLDER_LINE_REGEX = /^\s*\[(TODO|TBD|PLACEHOLDER)\]\s*$/im
const MUSTACHE_HOLE_REGEX = /\{\{\s*\w+\s*\}\}/

function passesGuard(content: string): boolean {
  if (content.trim() === "") return false
  if (PLACEHOLDER_LINE_REGEX.test(content)) return false
  if (MUSTACHE_HOLE_REGEX.test(content)) return false
  return true
}

// ────────────────────────────────────────────────────────────────────────────
// Inline content extractors
//
// Each content stage has an explicit extractor that pulls the legacy inline
// field(s) from `stageData[stage]`. Field names come directly from
// `convex/schema.ts:537-688` — no invented aliases.
// ────────────────────────────────────────────────────────────────────────────

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function joinNonEmpty(
  fields: Array<string | undefined>,
  separator: string,
): string {
  return fields
    .map((f) => (typeof f === "string" ? f.trim() : ""))
    .filter((s) => s.length > 0)
    .join(separator)
}

function extractInlineContent(
  stage: PaperStageId,
  stageObj: Record<string, unknown>,
): string | null {
  switch (stage) {
    case "abstrak": {
      return asString(stageObj.ringkasanPenelitian) ?? null
    }
    case "pembaruan_abstrak": {
      return asString(stageObj.ringkasanPenelitianBaru) ?? null
    }
    case "pendahuluan": {
      const joined = joinNonEmpty(
        [
          asString(stageObj.latarBelakang),
          asString(stageObj.rumusanMasalah),
          asString(stageObj.tujuanPenelitian),
          asString(stageObj.researchGapAnalysis),
          asString(stageObj.signifikansiPenelitian),
          asString(stageObj.hipotesis),
        ],
        "\n\n",
      )
      return joined.length > 0 ? joined : null
    }
    case "tinjauan_literatur": {
      const joined = joinNonEmpty(
        [
          asString(stageObj.kerangkaTeoretis),
          asString(stageObj.reviewLiteratur),
          asString(stageObj.gapAnalysis),
          asString(stageObj.justifikasiPenelitian),
        ],
        "\n\n",
      )
      return joined.length > 0 ? joined : null
    }
    case "metodologi": {
      const joined = joinNonEmpty(
        [
          asString(stageObj.desainPenelitian),
          asString(stageObj.metodePerolehanData),
          asString(stageObj.teknikAnalisis),
          asString(stageObj.alatInstrumen),
          asString(stageObj.etikaPenelitian),
        ],
        "\n\n",
      )
      return joined.length > 0 ? joined : null
    }
    case "hasil": {
      const temuan = stageObj.temuanUtama
      if (Array.isArray(temuan)) {
        const bullets = temuan
          .map((t) =>
            typeof t === "string" && t.trim().length > 0 ? `- ${t.trim()}` : "",
          )
          .filter((s) => s.length > 0)
        return bullets.length > 0 ? bullets.join("\n") : null
      }
      if (typeof temuan === "string") {
        return temuan
      }
      return null
    }
    case "diskusi": {
      const joined = joinNonEmpty(
        [
          asString(stageObj.interpretasiTemuan),
          asString(stageObj.perbandinganLiteratur),
          asString(stageObj.implikasiTeoretis),
          asString(stageObj.implikasiPraktis),
          asString(stageObj.keterbatasanPenelitian),
          asString(stageObj.saranPenelitianMendatang),
        ],
        "\n\n",
      )
      return joined.length > 0 ? joined : null
    }
    case "kesimpulan": {
      const jawaban = stageObj.jawabanRumusanMasalah
      let jawabanStr: string | undefined
      if (Array.isArray(jawaban)) {
        const bullets = jawaban
          .map((j) =>
            typeof j === "string" && j.trim().length > 0 ? `- ${j.trim()}` : "",
          )
          .filter((s) => s.length > 0)
        jawabanStr = bullets.length > 0 ? bullets.join("\n") : undefined
      } else if (typeof jawaban === "string") {
        jawabanStr = jawaban
      }
      const joined = joinNonEmpty(
        [
          asString(stageObj.ringkasanHasil),
          jawabanStr,
          asString(stageObj.implikasiPraktis),
          asString(stageObj.saranPraktisi),
          asString(stageObj.saranPeneliti),
          asString(stageObj.saranKebijakan),
        ],
        "\n\n",
      )
      return joined.length > 0 ? joined : null
    }
    case "daftar_pustaka": {
      const entries = stageObj.entries
      if (!Array.isArray(entries)) return null
      const refs = entries
        .map((e) => {
          if (e && typeof e === "object") {
            const full = (e as Record<string, unknown>).fullReference
            return typeof full === "string" ? full.trim() : ""
          }
          return ""
        })
        .filter((s) => s.length > 0)
      return refs.length > 0 ? refs.join("\n") : null
    }
    case "lampiran": {
      const items = stageObj.items
      if (!Array.isArray(items)) return null
      const contents = items
        .map((i) => {
          if (i && typeof i === "object") {
            const c = (i as Record<string, unknown>).content
            return typeof c === "string" ? c.trim() : ""
          }
          return ""
        })
        .filter((s) => s.length > 0)
      return contents.length > 0 ? contents.join("\n\n") : null
    }
    default:
      return null
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Stage content resolver
// ────────────────────────────────────────────────────────────────────────────

type StageResolution =
  | { via: "artifact"; content: string; artifactId: string }
  | { via: "inline"; content: string }
  | { via: "dropped" }

function resolveStageContent(
  stage: PaperStageId,
  stageObj: Record<string, unknown>,
  artifactsById: Record<string, NaskahArtifactRecord | undefined>,
): StageResolution {
  // Primary: non-invalidated validated artifact body that passes the guard.
  const artifactId = asString(stageObj.artifactId)
  if (artifactId) {
    const artifact = artifactsById[artifactId]
    if (
      artifact &&
      artifact.invalidatedAt == null &&
      typeof artifact.content === "string" &&
      passesGuard(artifact.content)
    ) {
      return {
        via: "artifact",
        content: artifact.content,
        artifactId: artifact._id,
      }
    }
  }

  // Fallback: legacy inline fields extracted per stage.
  const inlineContent = extractInlineContent(stage, stageObj)
  if (inlineContent != null && passesGuard(inlineContent)) {
    return { via: "inline", content: inlineContent }
  }

  return { via: "dropped" }
}

// ────────────────────────────────────────────────────────────────────────────
// Title resolution
// ────────────────────────────────────────────────────────────────────────────

function resolveTitle(input: NaskahCompileInput): {
  title: string
  titleSource: NaskahTitleSource
} {
  const judulStage = input.stageData.judul
  if (judulStage && typeof judulStage.validatedAt === "number") {
    const judulTerpilih = asString(judulStage.judulTerpilih)
    if (judulTerpilih && judulTerpilih.trim().length > 0) {
      return { title: judulTerpilih.trim(), titleSource: "judul_final" }
    }
  }

  if (typeof input.paperTitle === "string" && input.paperTitle.trim().length > 0) {
    return { title: input.paperTitle.trim(), titleSource: "paper_title" }
  }

  if (
    typeof input.workingTitle === "string" &&
    input.workingTitle.trim().length > 0
  ) {
    return { title: input.workingTitle.trim(), titleSource: "working_title" }
  }

  const topikStage = input.stageData.topik
  if (topikStage && typeof topikStage.validatedAt === "number") {
    const definitif = asString(topikStage.definitif)
    if (definitif && definitif.trim().length > 0) {
      return { title: definitif.trim(), titleSource: "topik_definitif" }
    }
  }

  return { title: "Paper Tanpa Judul", titleSource: "fallback" }
}

// ────────────────────────────────────────────────────────────────────────────
// Main compiler
// ────────────────────────────────────────────────────────────────────────────

/**
 * Compile a validated stageData snapshot + artifact map into a read-only
 * naskah snapshot.
 *
 * Eligibility rule: a stage is considered only when
 * `stageData[stage].validatedAt != null`. Content resolution then independently
 * tries the validated non-invalidated artifact body first, then falls back to
 * legacy inline fields. A section is dropped only when BOTH sources fail.
 *
 * The `abstrak` section key supports a single override: `pembaruan_abstrak`
 * beats `abstrak` when both are validated. The loser is retained in
 * `sourceArtifactRefs` with `resolution: "overridden"` so the Task 3 rebuild
 * diff can detect provenance transitions.
 */
export function compileNaskahSnapshot(
  input: NaskahCompileInput,
): NaskahCompiledSnapshot {
  const { title, titleSource } = resolveTitle(input)

  interface ConsideredMember {
    stage: PaperStageId
    sectionKey: NaskahSectionKey
    stageObj: Record<string, unknown>
  }

  const considered: ConsideredMember[] = []

  for (const stage of STAGE_ORDER) {
    const stageObj = input.stageData[stage]
    if (!stageObj) continue
    if (typeof stageObj.validatedAt !== "number") continue

    // Title-only contributors — not considered as section producers.
    if (stage === "topik" || stage === "judul") continue
    // Ignored workflow stages.
    if (stage === "gagasan" || stage === "outline") continue

    let sectionKey: NaskahSectionKey
    if (stage === "pembaruan_abstrak") {
      sectionKey = "abstrak"
    } else {
      const mapped = CONTENT_STAGE_TO_SECTION_KEY[stage]
      if (!mapped) continue
      sectionKey = mapped
    }

    considered.push({ stage, sectionKey, stageObj })
  }

  // Group considered members by section key so we can handle overrides.
  const groups = new Map<NaskahSectionKey, ConsideredMember[]>()
  for (const c of considered) {
    const existing = groups.get(c.sectionKey)
    if (existing) {
      existing.push(c)
    } else {
      groups.set(c.sectionKey, [c])
    }
  }

  // Precedence for the abstrak override. Higher wins.
  function precedence(stage: PaperStageId): number {
    if (stage === "pembaruan_abstrak") return 2
    if (stage === "abstrak") return 1
    return 0
  }

  const sourceArtifactRefs: NaskahSourceArtifactRef[] = []
  const sections: NaskahSection[] = []

  for (const [sectionKey, members] of groups) {
    const sorted = [...members].sort(
      (a, b) => precedence(b.stage) - precedence(a.stage),
    )

    // Resolve content for every member once.
    const resolved = sorted.map((m) => ({
      member: m,
      resolution: resolveStageContent(m.stage, m.stageObj, input.artifactsById),
    }))

    // Winner = first member in precedence order whose resolver did not drop.
    const winnerIdx = resolved.findIndex((r) => r.resolution.via !== "dropped")

    if (winnerIdx >= 0) {
      const winner = resolved[winnerIdx]
      const winnerResolution = winner.resolution
      if (winnerResolution.via !== "dropped") {
        sections.push({
          key: sectionKey,
          label: SECTION_LABELS[sectionKey],
          content: winnerResolution.content,
          sourceStage: winner.member.stage,
          sourceArtifactId:
            winnerResolution.via === "artifact"
              ? winnerResolution.artifactId
              : undefined,
        })
      }
    }

    // Build refs for every considered member in this group.
    for (let i = 0; i < resolved.length; i++) {
      const { member, resolution } = resolved[i]
      const isWinner = i === winnerIdx

      let refResolution: NaskahResolution
      let usedForRender = false

      if (isWinner && resolution.via !== "dropped") {
        refResolution = resolution.via
        usedForRender = true
      } else if (resolution.via === "dropped") {
        // Resolver itself failed — no usable source for this stage.
        refResolution = "dropped"
      } else {
        // Had a usable source but another stage won the section key.
        refResolution = "overridden"
      }

      const revisionCount = member.stageObj.revisionCount
      sourceArtifactRefs.push({
        stage: member.stage,
        artifactId: asString(member.stageObj.artifactId),
        revisionCount:
          typeof revisionCount === "number" ? revisionCount : undefined,
        usedForRender,
        resolution: refResolution,
      })
    }
  }

  // Canonical section order.
  sections.sort(
    (a, b) =>
      SECTION_KEY_ORDER.indexOf(a.key) - SECTION_KEY_ORDER.indexOf(b.key),
  )

  // Canonical ref order (follows STAGE_ORDER).
  sourceArtifactRefs.sort(
    (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage),
  )

  // Availability classification.
  const hasAnyValidatedStage = STAGE_ORDER.some((s) => {
    const obj = input.stageData[s]
    return obj != null && typeof obj.validatedAt === "number"
  })
  const hasAbstrakSection = sections.some((s) => s.key === "abstrak")
  const abstrakGroupConsidered = groups.has("abstrak")

  let isAvailable: boolean
  let reasonIfUnavailable: NaskahUnavailabilityReason | undefined

  if (!hasAnyValidatedStage) {
    isAvailable = false
    reasonIfUnavailable = "empty_session"
  } else if (!abstrakGroupConsidered) {
    isAvailable = false
    reasonIfUnavailable = "no_validated_abstrak"
  } else if (!hasAbstrakSection) {
    isAvailable = false
    reasonIfUnavailable = "abstrak_guard_failed"
  } else {
    isAvailable = true
    reasonIfUnavailable = undefined
  }

  const compiledPlainText = sections.map((s) => s.content).join("\n\n")
  const pageEstimate = Math.max(
    1,
    Math.ceil(compiledPlainText.length / PAGE_ESTIMATE_CHARS_PER_PAGE),
  )

  return {
    isAvailable,
    reasonIfUnavailable,
    title,
    titleSource,
    sections,
    pageEstimate,
    status: "growing",
    sourceArtifactRefs,
  }
}
