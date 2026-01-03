export interface ReferensiAwal {
  title: string
  authors?: string
  year?: number
  url?: string
}

export interface GagasanData {
  ideKasar?: string
  analisis?: string
  angle?: string
  novelty?: string
  referensiAwal?: ReferensiAwal[]
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
  definitif?: string
  angleSpesifik?: string
  argumentasiKebaruan?: string
  researchGap?: string
  referensiPendukung?: ReferensiPendukung[]
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}

export interface AbstrakData {
  ringkasanPenelitian?: string
  keywords?: string[]
  wordCount?: number
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
  latarBelakang?: string
  rumusanMasalah?: string
  researchGapAnalysis?: string
  tujuanPenelitian?: string
  signifikansiPenelitian?: string
  hipotesis?: string
  sitasiAPA?: SitasiAPA[]
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
  kerangkaTeoretis?: string
  reviewLiteratur?: string
  gapAnalysis?: string
  justifikasiPenelitian?: string
  referensi?: Referensi[]
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}

export interface MetodologiData {
  desainPenelitian?: string
  metodePerolehanData?: string
  teknikAnalisis?: string
  etikaPenelitian?: string
  pendekatanPenelitian?: "kualitatif" | "kuantitatif" | "mixed"
  alatInstrumen?: string
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
  temuanUtama?: string[]
  metodePenyajian?: "narrative" | "tabular" | "mixed"
  dataPoints?: DataPoint[]
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}

export interface DiskusiData {
  interpretasiTemuan?: string
  perbandinganLiteratur?: string
  implikasiTeoretis?: string
  implikasiPraktis?: string
  keterbatasanPenelitian?: string
  saranPenelitianMendatang?: string
  sitasiTambahan?: SitasiTambahan[]
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}

export interface KesimpulanData {
  ringkasanHasil?: string
  jawabanRumusanMasalah?: string[]
  implikasiPraktis?: string
  saranPraktisi?: string
  saranPeneliti?: string
  saranKebijakan?: string
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
  entries?: DaftarPustakaEntry[]
  totalCount?: number
  incompleteCount?: number
  duplicatesMerged?: number
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
  items?: LampiranItem[]
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
  opsiJudul?: JudulOpsi[]
  judulTerpilih?: string
  alasanPemilihan?: string
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}

export interface OutlineSection {
  id: string
  judul?: string
  level?: number
  parentId?: string
  estimatedWordCount?: number
  status?: "complete" | "partial" | "empty"
}

export interface OutlineData {
  sections?: OutlineSection[]
  totalWordCount?: number
  completenessScore?: number
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}

export interface CoherenceIssue {
  sectionFrom: string
  sectionTo?: string
  issueType?: "terminology" | "transition" | "logic_gap"
  description?: string
  resolved?: boolean
}

export interface ElaborasiData {
  sectionsElaborated?: string[]
  coherenceIssues?: CoherenceIssue[]
  completenessCheck?: Record<string, boolean>
  draftComplete?: boolean
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
}
