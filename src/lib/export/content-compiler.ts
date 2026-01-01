/**
 * Content Compiler untuk Paper Export
 *
 * Compile semua stageData dari paper session ke struktur dokumen yang siap export.
 * Reuse interfaces dari stage-types untuk type safety.
 */

import type { Doc } from "@convex/_generated/dataModel"
import type {
  DaftarPustakaEntry,
  DataPoint,
  LampiranItem,
  Referensi,
  SitasiAPA,
} from "../paper/stage-types"

/**
 * Struktur konten paper yang sudah di-compile untuk export.
 * Semua field optional untuk handle missing stages gracefully.
 */
export interface CompiledPaperContent {
  // Metadata
  title: string | null
  keywords: string[] | null

  // Main content sections (urutan sesuai struktur paper)
  abstract: string | null
  pendahuluan: {
    latarBelakang: string | null
    rumusanMasalah: string | null
    tujuanPenelitian: string | null
    researchGapAnalysis: string | null
    signifikansiPenelitian: string | null
    hipotesis: string | null
    sitasiAPA: SitasiAPA[] | null
  } | null
  tinjauanLiteratur: {
    kerangkaTeoretis: string | null
    reviewLiteratur: string | null
    gapAnalysis: string | null
    justifikasiPenelitian: string | null
    referensi: Referensi[] | null
  } | null
  metodologi: {
    pendekatanPenelitian: "kualitatif" | "kuantitatif" | "mixed" | null
    desainPenelitian: string | null
    metodePerolehanData: string | null
    teknikAnalisis: string | null
    alatInstrumen: string | null
    etikaPenelitian: string | null
  } | null
  hasil: {
    temuanUtama: string[] | null
    metodePenyajian: "narrative" | "tabular" | "mixed" | null
    dataPoints: DataPoint[] | null
  } | null
  diskusi: {
    interpretasiTemuan: string | null
    perbandinganLiteratur: string | null
    implikasiTeoretis: string | null
    implikasiPraktis: string | null
    keterbatasanPenelitian: string | null
    saranPenelitianMendatang: string | null
  } | null
  kesimpulan: {
    ringkasanHasil: string | null
    jawabanRumusanMasalah: string[] | null
    implikasiPraktis: string | null
    saranPraktisi: string | null
    saranPeneliti: string | null
    saranKebijakan: string | null
  } | null

  // Reference & Appendix
  daftarPustaka: DaftarPustakaEntry[] | null
  lampiran: LampiranItem[] | null
}

/**
 * Compile semua stageData dari paper session ke satu object terstruktur.
 * Handle missing stages gracefully dengan return null untuk stage yang belum ada.
 *
 * @param session - Paper session document dari Convex
 * @returns CompiledPaperContent object
 */
export function compilePaperContent(session: Doc<"paperSessions">): CompiledPaperContent {
  const { stageData, paperTitle } = session

  // Get title dari judulTerpilih atau paperTitle atau fallback ke null
  const title = stageData.judul?.judulTerpilih ?? paperTitle ?? null

  // Get keywords dari abstrak
  const keywords = stageData.abstrak?.keywords ?? null

  // Compile abstract
  const abstract = stageData.abstrak?.ringkasanPenelitian ?? null

  // Compile pendahuluan
  const pendahuluan = stageData.pendahuluan
    ? {
        latarBelakang: stageData.pendahuluan.latarBelakang ?? null,
        rumusanMasalah: stageData.pendahuluan.rumusanMasalah ?? null,
        tujuanPenelitian: stageData.pendahuluan.tujuanPenelitian ?? null,
        researchGapAnalysis: stageData.pendahuluan.researchGapAnalysis ?? null,
        signifikansiPenelitian: stageData.pendahuluan.signifikansiPenelitian ?? null,
        hipotesis: stageData.pendahuluan.hipotesis ?? null,
        sitasiAPA: stageData.pendahuluan.sitasiAPA ?? null,
      }
    : null

  // Compile tinjauan literatur
  const tinjauanLiteratur = stageData.tinjauan_literatur
    ? {
        kerangkaTeoretis: stageData.tinjauan_literatur.kerangkaTeoretis ?? null,
        reviewLiteratur: stageData.tinjauan_literatur.reviewLiteratur ?? null,
        gapAnalysis: stageData.tinjauan_literatur.gapAnalysis ?? null,
        justifikasiPenelitian: stageData.tinjauan_literatur.justifikasiPenelitian ?? null,
        referensi: stageData.tinjauan_literatur.referensi ?? null,
      }
    : null

  // Compile metodologi
  const metodologi = stageData.metodologi
    ? {
        pendekatanPenelitian: stageData.metodologi.pendekatanPenelitian ?? null,
        desainPenelitian: stageData.metodologi.desainPenelitian ?? null,
        metodePerolehanData: stageData.metodologi.metodePerolehanData ?? null,
        teknikAnalisis: stageData.metodologi.teknikAnalisis ?? null,
        alatInstrumen: stageData.metodologi.alatInstrumen ?? null,
        etikaPenelitian: stageData.metodologi.etikaPenelitian ?? null,
      }
    : null

  // Compile hasil
  const hasil = stageData.hasil
    ? {
        temuanUtama: stageData.hasil.temuanUtama ?? null,
        metodePenyajian: stageData.hasil.metodePenyajian ?? null,
        dataPoints: stageData.hasil.dataPoints ?? null,
      }
    : null

  // Compile diskusi
  const diskusi = stageData.diskusi
    ? {
        interpretasiTemuan: stageData.diskusi.interpretasiTemuan ?? null,
        perbandinganLiteratur: stageData.diskusi.perbandinganLiteratur ?? null,
        implikasiTeoretis: stageData.diskusi.implikasiTeoretis ?? null,
        implikasiPraktis: stageData.diskusi.implikasiPraktis ?? null,
        keterbatasanPenelitian: stageData.diskusi.keterbatasanPenelitian ?? null,
        saranPenelitianMendatang: stageData.diskusi.saranPenelitianMendatang ?? null,
      }
    : null

  // Compile kesimpulan
  const kesimpulan = stageData.kesimpulan
    ? {
        ringkasanHasil: stageData.kesimpulan.ringkasanHasil ?? null,
        jawabanRumusanMasalah: stageData.kesimpulan.jawabanRumusanMasalah ?? null,
        implikasiPraktis: stageData.kesimpulan.implikasiPraktis ?? null,
        saranPraktisi: stageData.kesimpulan.saranPraktisi ?? null,
        saranPeneliti: stageData.kesimpulan.saranPeneliti ?? null,
        saranKebijakan: stageData.kesimpulan.saranKebijakan ?? null,
      }
    : null

  // Compile daftar pustaka
  const daftarPustaka = stageData.daftar_pustaka?.entries ?? null

  // Compile lampiran
  const lampiran = stageData.lampiran?.items ?? null

  return {
    title,
    keywords,
    abstract,
    pendahuluan,
    tinjauanLiteratur,
    metodologi,
    hasil,
    diskusi,
    kesimpulan,
    daftarPustaka,
    lampiran,
  }
}

/**
 * Check apakah compiled content memiliki konten yang bisa di-export.
 * Minimal harus ada title dan abstract.
 */
export function hasExportableContent(content: CompiledPaperContent): boolean {
  return content.title !== null && content.abstract !== null
}

/**
 * Get list of missing sections untuk informasi ke user.
 */
export function getMissingSections(content: CompiledPaperContent): string[] {
  const missing: string[] = []

  if (!content.title) missing.push("Judul")
  if (!content.abstract) missing.push("Abstrak")
  if (!content.pendahuluan) missing.push("Pendahuluan")
  if (!content.tinjauanLiteratur) missing.push("Tinjauan Literatur")
  if (!content.metodologi) missing.push("Metodologi")
  if (!content.hasil) missing.push("Hasil")
  if (!content.diskusi) missing.push("Diskusi")
  if (!content.kesimpulan) missing.push("Kesimpulan")
  if (!content.daftarPustaka || content.daftarPustaka.length === 0) {
    missing.push("Daftar Pustaka")
  }

  return missing
}
