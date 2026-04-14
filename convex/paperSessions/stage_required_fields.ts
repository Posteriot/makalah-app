import type { PaperStageId } from "./constants"

type RequiredField = { field: string; type: "string" | "number" | "array" }

export const STAGE_REQUIRED_FIELDS: Partial<Record<PaperStageId, RequiredField[]>> = {
  gagasan: [
    { field: "ideKasar", type: "string" },
    { field: "analisis", type: "string" },
    { field: "angle", type: "string" },
  ],
  topik: [
    { field: "definitif", type: "string" },
    { field: "angleSpesifik", type: "string" },
    { field: "researchGap", type: "string" },
  ],
  outline: [
    { field: "sections", type: "array" },
    { field: "totalWordCount", type: "number" },
  ],
  abstrak: [
    { field: "ringkasanPenelitian", type: "string" },
    { field: "keywords", type: "array" },
  ],
  pendahuluan: [
    { field: "latarBelakang", type: "string" },
    { field: "rumusanMasalah", type: "string" },
  ],
  tinjauan_literatur: [
    { field: "kerangkaTeoretis", type: "string" },
    { field: "reviewLiteratur", type: "string" },
  ],
  metodologi: [
    { field: "desainPenelitian", type: "string" },
    { field: "pendekatanPenelitian", type: "string" },
  ],
  hasil: [
    { field: "temuanUtama", type: "array" },
  ],
  diskusi: [
    { field: "interpretasiTemuan", type: "string" },
  ],
  kesimpulan: [
    { field: "ringkasanHasil", type: "string" },
    { field: "jawabanRumusanMasalah", type: "array" },
  ],
  pembaruan_abstrak: [
    { field: "ringkasanPenelitianBaru", type: "string" },
    { field: "perubahanUtama", type: "array" },
  ],
  daftar_pustaka: [
    { field: "entries", type: "array" },
  ],
  // lampiran: no hard requirements
  judul: [
    { field: "opsiJudul", type: "array" },
    { field: "judulTerpilih", type: "string" },
  ],
}

export function isFieldPresent(value: unknown, type: string): boolean {
  switch (type) {
    case "string":
      return typeof value === "string" && value.trim().length > 0
    case "number":
      return typeof value === "number" && value > 0
    case "array":
      return Array.isArray(value) && value.length > 0
    default:
      return false
  }
}
