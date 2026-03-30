/**
 * Allowlist of fields that saveStageDraft can write, per stage.
 * v1: gagasan + topik only. Excludes auto-persist fields (referensiAwal, referensiPendukung)
 * and mature-save-only fields (ringkasan, ringkasanDetail, novelty).
 */
export const DRAFT_SAVE_ALLOWED_FIELDS: Record<string, readonly string[]> = {
  gagasan: ["ideKasar", "analisis", "angle"],
  topik: ["definitif", "angleSpesifik", "argumentasiKebaruan", "researchGap"],
} as const

export function isDraftSaveSupportedStage(stage: string): boolean {
  return stage in DRAFT_SAVE_ALLOWED_FIELDS
}

export function isAllowedDraftField(stage: string, field: string): boolean {
  const allowed = DRAFT_SAVE_ALLOWED_FIELDS[stage]
  return allowed?.includes(field) ?? false
}

export function getDraftSaveAllowedFields(stage: string): readonly string[] {
  return DRAFT_SAVE_ALLOWED_FIELDS[stage] ?? []
}
