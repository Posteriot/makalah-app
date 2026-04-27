import type { PaperStageId } from "../../../convex/paperSessions/constants"

/**
 * Final academic section keys that can appear in a compiled naskah snapshot.
 *
 * Internal workflow stages like `gagasan`, `topik`, `outline`, and `judul`
 * never produce a section. `topik` and `judul` only contribute title
 * metadata. `pembaruan_abstrak` contributes to the `abstrak` section via the
 * override path, not as a section of its own.
 */
export type NaskahSectionKey =
  | "abstrak"
  | "pendahuluan"
  | "tinjauan_literatur"
  | "metodologi"
  | "hasil"
  | "diskusi"
  | "kesimpulan"
  | "daftar_pustaka"
  | "lampiran"

/** Final academic labels shown in sidebar + preview headings. */
export type NaskahSectionLabel =
  | "Abstrak"
  | "Pendahuluan"
  | "Tinjauan Literatur"
  | "Metodologi"
  | "Hasil"
  | "Diskusi"
  | "Kesimpulan"
  | "Daftar Pustaka"
  | "Lampiran"

export interface NaskahSection {
  key: NaskahSectionKey
  label: NaskahSectionLabel
  /** Raw section body. Phase 1: plain text from artifact body or inline fallback. */
  content: string
  /** Which internal stage produced this section (for trace + override diagnosis). */
  sourceStage: PaperStageId
  /** Artifact id (stringified) when content came from an artifact body. */
  sourceArtifactId?: string
}

/**
 * How the compiler resolved provenance for a considered stage.
 *
 * - `"artifact"` — the stage's non-invalidated artifact body supplied the
 *   section content.
 * - `"inline"` — the stage's inline legacy fields supplied the section content
 *   because the artifact was missing, invalidated, empty, or guard-rejected.
 * - `"dropped"` — the resolver itself could not produce usable content for
 *   this stage (no artifact, no inline, or all sources failed the guard).
 * - `"overridden"` — the stage had a usable source but was discarded because
 *   a higher-precedence stage won the same section key. Today this only
 *   applies to `abstrak` when `pembaruan_abstrak` wins.
 */
export type NaskahResolution = "artifact" | "inline" | "dropped" | "overridden"

export interface NaskahSourceArtifactRef {
  stage: PaperStageId
  artifactId?: string
  revisionCount?: number
  /** True iff this ref supplied bytes to a rendered section. */
  usedForRender: boolean
  resolution: NaskahResolution
}

export type NaskahUnavailabilityReason =
  | "empty_session"
  | "no_validated_abstrak"
  | "abstrak_guard_failed"

export interface NaskahAvailability {
  isAvailable: boolean
  availableAtRevision?: number
  reasonIfUnavailable?: NaskahUnavailabilityReason
}

export type NaskahSnapshotStatus = "growing" | "stable"

export type NaskahTitleSource =
  | "judul_final"
  | "paper_title"
  | "working_title"
  | "topik_definitif"
  | "fallback"

export interface NaskahCompiledSnapshot {
  isAvailable: boolean
  reasonIfUnavailable?: NaskahUnavailabilityReason
  title: string
  titleSource: NaskahTitleSource
  sections: NaskahSection[]
  pageEstimate: number
  status: NaskahSnapshotStatus
  sourceArtifactRefs: NaskahSourceArtifactRef[]
}

/**
 * Minimal artifact shape the compiler needs. The Convex wrapper in
 * `convex/naskahRebuild.ts` builds a `Record<string, NaskahArtifactRecord>`
 * by fetching artifacts referenced in `stageData` and hands it to the
 * compiler. Keeping the compiler a pure function of this map means unit
 * tests can build the map directly without touching Convex ctx.
 */
export interface NaskahArtifactRecord {
  _id: string
  content: string
  format?:
    | "markdown"
    | "latex"
    | "python"
    | "r"
    | "javascript"
    | "typescript"
    | "json"
  invalidatedAt?: number
  title?: string
}

/**
 * Pure-function input to `compileNaskahSnapshot`. The compiler must not
 * touch Convex ctx — the Convex wrapper is responsible for fetching
 * artifacts and passing them in via `artifactsById`.
 */
export interface NaskahCompileInput {
  /** Same shape as `session.stageData` from `convex/schema.ts`. Loosely typed. */
  stageData: Record<string, Record<string, unknown> | undefined>
  artifactsById: Record<string, NaskahArtifactRecord | undefined>
  paperTitle?: string | null
  workingTitle?: string | null
}
