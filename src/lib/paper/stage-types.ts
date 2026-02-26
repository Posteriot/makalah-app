export interface ReferensiAwal {
  title: string
  authors?: string
  year?: number
  url?: string
}

export interface WebSearchReference {
  url: string
  title: string
  publishedAt?: number
}

export interface GagasanData {
  ringkasan?: string
  ringkasanDetail?: string
  ideKasar?: string
  analisis?: string
  angle?: string
  novelty?: string
  referensiAwal?: ReferensiAwal[]
  webSearchReferences?: WebSearchReference[]
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}

export interface ReferensiPendukung {
  title: string
  authors?: string
  year?: number
  url?: string
}

export interface TopikData {
  ringkasan?: string
  ringkasanDetail?: string
  definitif?: string
  angleSpesifik?: string
  argumentasiKebaruan?: string
  researchGap?: string
  referensiPendukung?: ReferensiPendukung[]
  webSearchReferences?: WebSearchReference[]
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}

export interface AbstrakData {
  ringkasan?: string
  ringkasanDetail?: string
  ringkasanPenelitian?: string
  keywords?: string[]
  wordCount?: number
  webSearchReferences?: WebSearchReference[]
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}

export interface SitasiAPA {
  inTextCitation: string
  fullReference: string
  url?: string
}

export interface SitasiTambahan extends SitasiAPA {
  isAdditional?: boolean
}

export interface PendahuluanData {
  ringkasan?: string
  ringkasanDetail?: string
  latarBelakang?: string
  rumusanMasalah?: string
  researchGapAnalysis?: string
  tujuanPenelitian?: string
  signifikansiPenelitian?: string
  hipotesis?: string
  sitasiAPA?: SitasiAPA[]
  webSearchReferences?: WebSearchReference[]
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}

export interface Referensi {
  title: string
  authors?: string
  year?: number
  url?: string
  inTextCitation?: string
  isFromPhase1?: boolean
}

export interface TinjauanLiteraturData {
  ringkasan?: string
  ringkasanDetail?: string
  kerangkaTeoretis?: string
  reviewLiteratur?: string
  gapAnalysis?: string
  justifikasiPenelitian?: string
  referensi?: Referensi[]
  webSearchReferences?: WebSearchReference[]
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}

export interface MetodologiData {
  ringkasan?: string
  ringkasanDetail?: string
  desainPenelitian?: string
  metodePerolehanData?: string
  teknikAnalisis?: string
  etikaPenelitian?: string
  pendekatanPenelitian?: "kualitatif" | "kuantitatif" | "mixed"
  alatInstrumen?: string
  webSearchReferences?: WebSearchReference[]
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}

export interface DataPoint {
  label: string
  value: number | string
  unit?: string
  note?: string
}

export interface HasilData {
  ringkasan?: string
  ringkasanDetail?: string
  temuanUtama?: string[]
  metodePenyajian?: "narrative" | "tabular" | "mixed"
  dataPoints?: DataPoint[]
  webSearchReferences?: WebSearchReference[]
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}

export interface DiskusiData {
  ringkasan?: string
  ringkasanDetail?: string
  interpretasiTemuan?: string
  perbandinganLiteratur?: string
  implikasiTeoretis?: string
  implikasiPraktis?: string
  keterbatasanPenelitian?: string
  saranPenelitianMendatang?: string
  sitasiTambahan?: SitasiTambahan[]
  webSearchReferences?: WebSearchReference[]
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}

export interface KesimpulanData {
  ringkasan?: string
  ringkasanDetail?: string
  ringkasanHasil?: string
  jawabanRumusanMasalah?: string[]
  implikasiPraktis?: string
  saranPraktisi?: string
  saranPeneliti?: string
  saranKebijakan?: string
  webSearchReferences?: WebSearchReference[]
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}

// Phase 4: Finalization
export interface DaftarPustakaEntry {
  title: string
  authors?: string
  year?: number
  url?: string
  doi?: string
  inTextCitation?: string
  fullReference?: string
  sourceStage?: string
  isComplete?: boolean
}

export interface DaftarPustakaData {
  ringkasan?: string
  ringkasanDetail?: string
  entries?: DaftarPustakaEntry[]
  totalCount?: number
  incompleteCount?: number
  duplicatesMerged?: number
  webSearchReferences?: WebSearchReference[]
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}

export interface LampiranItem {
  label: string
  judul?: string
  tipe?: "table" | "figure" | "instrument" | "rawData" | "other"
  konten?: string
  referencedInSections?: string[]
}

export interface LampiranData {
  ringkasan?: string
  ringkasanDetail?: string
  items?: LampiranItem[]
  tidakAdaLampiran?: boolean
  alasanTidakAda?: string
  webSearchReferences?: WebSearchReference[]
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}

export interface JudulOpsi {
  judul: string
  keywordsCovered?: string[]
  coverageScore?: number
}

export interface JudulData {
  ringkasan?: string
  ringkasanDetail?: string
  opsiJudul?: JudulOpsi[]
  judulTerpilih?: string
  alasanPemilihan?: string
  webSearchReferences?: WebSearchReference[]
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}

export interface OutlineSection {
  id: string
  judul?: string
  level?: number
  parentId?: string | null
  estimatedWordCount?: number
  status?: "complete" | "partial" | "empty"
  checkedAt?: number
  checkedBy?: "auto" | "user"
  editHistory?: Array<{
    action: "add" | "edit" | "remove"
    timestamp: number
    fromStage: string
  }>
}

export interface OutlineData {
  ringkasan?: string
  ringkasanDetail?: string
  sections?: OutlineSection[]
  totalWordCount?: number
  completenessScore?: number
  webSearchReferences?: WebSearchReference[]
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
  lastEditedAt?: number
  lastEditedFromStage?: string
}
