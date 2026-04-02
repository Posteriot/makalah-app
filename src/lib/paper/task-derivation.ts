import {
  STAGE_ORDER,
  getStageLabel,
  type PaperStageId,
} from "../../../convex/paperSessions/constants"

// ============================================================================
// TYPES
// ============================================================================

export type TaskStatus = "complete" | "pending"

export type TaskItem = {
  id: string
  label: string
  field: string
  status: TaskStatus
}

export type TaskSummary = {
  stageId: string
  stageLabel: string
  tasks: TaskItem[]
  completed: number
  total: number
}

export type PhaseGroup = {
  label: string
  stages: readonly PaperStageId[]
}

// ============================================================================
// PHASE GROUPS
// ============================================================================

export const PHASE_GROUPS: readonly PhaseGroup[] = [
  { label: "Foundation", stages: ["gagasan", "topik", "outline"] },
  { label: "Core Sections", stages: ["abstrak", "pendahuluan", "tinjauan_literatur", "metodologi"] },
  { label: "Results & Analysis", stages: ["hasil", "diskusi", "kesimpulan"] },
  { label: "Finalization", stages: ["pembaruan_abstrak", "daftar_pustaka", "lampiran", "judul"] },
] as const

// ============================================================================
// STAGE TASK DEFINITIONS
// ============================================================================

type CompletionType = "string" | "number" | "array" | "boolean" | "enum"

type TaskDefinition = {
  field: string
  label: string
  type: CompletionType
}

const STAGE_TASKS: Record<PaperStageId, TaskDefinition[]> = {
  gagasan: [
    { field: "referensiAwal", label: "Cari referensi awal", type: "array" },
    { field: "ideKasar", label: "Eksplorasi ide", type: "string" },
    { field: "analisis", label: "Analisis feasibility", type: "string" },
    { field: "angle", label: "Tentukan angle", type: "string" },
  ],
  topik: [
    { field: "definitif", label: "Rumuskan topik definitif", type: "string" },
    { field: "angleSpesifik", label: "Spesifikasi angle", type: "string" },
    { field: "argumentasiKebaruan", label: "Argumentasi kebaruan", type: "string" },
    { field: "researchGap", label: "Identifikasi research gap", type: "string" },
  ],
  outline: [
    { field: "sections", label: "Susun sections", type: "array" },
    { field: "totalWordCount", label: "Estimasi word count", type: "number" },
  ],
  abstrak: [
    { field: "ringkasanPenelitian", label: "Draft ringkasan penelitian", type: "string" },
    { field: "keywords", label: "Tentukan keywords", type: "array" },
    { field: "wordCount", label: "Cek word count", type: "number" },
  ],
  pendahuluan: [
    { field: "latarBelakang", label: "Latar belakang", type: "string" },
    { field: "rumusanMasalah", label: "Rumusan masalah", type: "string" },
    { field: "researchGapAnalysis", label: "Analisis research gap", type: "string" },
    { field: "tujuanPenelitian", label: "Tujuan penelitian", type: "string" },
    { field: "sitasiAPA", label: "Sitasi APA", type: "array" },
  ],
  tinjauan_literatur: [
    { field: "kerangkaTeoretis", label: "Kerangka teoretis", type: "string" },
    { field: "reviewLiteratur", label: "Review literatur", type: "string" },
    { field: "gapAnalysis", label: "Gap analysis", type: "string" },
    { field: "referensi", label: "Kumpulkan referensi", type: "array" },
  ],
  metodologi: [
    { field: "desainPenelitian", label: "Desain penelitian", type: "string" },
    { field: "metodePerolehanData", label: "Metode perolehan data", type: "string" },
    { field: "teknikAnalisis", label: "Teknik analisis", type: "string" },
    { field: "pendekatanPenelitian", label: "Tentukan pendekatan", type: "enum" },
  ],
  hasil: [
    { field: "temuanUtama", label: "Identifikasi temuan utama", type: "array" },
    { field: "metodePenyajian", label: "Tentukan metode penyajian", type: "enum" },
  ],
  diskusi: [
    { field: "interpretasiTemuan", label: "Interpretasi temuan", type: "string" },
    { field: "perbandinganLiteratur", label: "Perbandingan literatur", type: "string" },
    { field: "implikasiTeoretis", label: "Implikasi teoretis", type: "string" },
    { field: "keterbatasanPenelitian", label: "Keterbatasan penelitian", type: "string" },
  ],
  kesimpulan: [
    { field: "ringkasanHasil", label: "Ringkasan hasil", type: "string" },
    { field: "jawabanRumusanMasalah", label: "Jawaban rumusan masalah", type: "array" },
    { field: "saranPeneliti", label: "Saran peneliti", type: "string" },
  ],
  pembaruan_abstrak: [
    { field: "ringkasanPenelitianBaru", label: "Ringkasan penelitian baru", type: "string" },
    { field: "perubahanUtama", label: "Identifikasi perubahan utama", type: "array" },
    { field: "keywordsBaru", label: "Keywords baru", type: "array" },
  ],
  daftar_pustaka: [
    { field: "entries", label: "Kompilasi entri", type: "array" },
  ],
  lampiran: [
    { field: "items", label: "Kompilasi item lampiran", type: "array" },
    { field: "tidakAdaLampiran", label: "Konfirmasi tidak ada lampiran", type: "boolean" },
  ],
  judul: [
    { field: "opsiJudul", label: "Opsi judul", type: "array" },
    { field: "judulTerpilih", label: "Judul terpilih", type: "string" },
  ],
}

// ============================================================================
// COMPLETION LOGIC
// ============================================================================

function isFieldComplete(value: unknown, type: CompletionType): boolean {
  switch (type) {
    case "string":
      return typeof value === "string" && value.trim().length > 0
    case "number":
      return typeof value === "number" && value > 0
    case "array":
      return Array.isArray(value) && value.length > 0
    case "boolean":
      return value === true
    case "enum":
      return typeof value === "string" && value.length > 0
    default:
      return false
  }
}

// ============================================================================
// MAIN DERIVATION FUNCTION
// ============================================================================

export function deriveTaskList(
  stageId: PaperStageId,
  stageData: Record<string, unknown>
): TaskSummary {
  const definitions = STAGE_TASKS[stageId]
  if (!definitions) {
    return {
      stageId,
      stageLabel: getStageLabel(stageId),
      tasks: [],
      completed: 0,
      total: 0,
    }
  }

  const currentStageData = (stageData[stageId] ?? {}) as Record<string, unknown>

  const lampiranOverride =
    stageId === "lampiran" && currentStageData.tidakAdaLampiran === true

  const tasks: TaskItem[] = definitions.map((def) => {
    const complete = lampiranOverride || isFieldComplete(currentStageData[def.field], def.type)

    return {
      id: `${stageId}.${def.field}`,
      label: def.label,
      field: def.field,
      status: complete ? "complete" as const : "pending" as const,
    }
  })

  const completed = tasks.filter((t) => t.status === "complete").length

  return {
    stageId,
    stageLabel: getStageLabel(stageId),
    tasks,
    completed,
    total: tasks.length,
  }
}

// ============================================================================
// HELPERS
// ============================================================================

export function getPhaseForStage(
  stageId: PaperStageId
): { label: string; index: number } | null {
  for (let i = 0; i < PHASE_GROUPS.length; i++) {
    if ((PHASE_GROUPS[i].stages as readonly string[]).includes(stageId)) {
      return { label: PHASE_GROUPS[i].label, index: i }
    }
  }
  return null
}
