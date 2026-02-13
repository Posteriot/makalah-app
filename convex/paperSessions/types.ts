import { v } from "convex/values";
import { STAGE_ORDER } from "./constants";

export type PaperStage = typeof STAGE_ORDER[number] | "completed";

export type StageStatus = "drafting" | "pending_validation" | "approved" | "revision";

const SitasiAPAShape = {
    inTextCitation: v.string(),
    fullReference: v.string(),
    url: v.optional(v.string()),
};

// Validators for each stage (used in schema and mutations)
export const GagasanData = v.object({
    ringkasan: v.optional(v.string()),
    ideKasar: v.optional(v.string()), // Optional: may not exist during initial revision
    analisis: v.optional(v.string()),
    angle: v.optional(v.string()),
    novelty: v.optional(v.string()),
    referensiAwal: v.optional(v.array(v.object({
        title: v.string(),
        authors: v.optional(v.string()),
        year: v.optional(v.number()),
        url: v.optional(v.string()),
        publishedAt: v.optional(v.number()), // Timestamp from google_search
    }))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});

export const TopikData = v.object({
    ringkasan: v.optional(v.string()),
    definitif: v.optional(v.string()), // Optional: may not exist during initial revision
    angleSpesifik: v.optional(v.string()),
    argumentasiKebaruan: v.optional(v.string()),
    researchGap: v.optional(v.string()), // Gap spesifik yang akan diisi
    referensiPendukung: v.optional(v.array(v.object({
        title: v.string(),
        authors: v.optional(v.string()),
        year: v.optional(v.number()),
        url: v.optional(v.string()),
        publishedAt: v.optional(v.number()), // Timestamp from google_search
    }))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});

// Phase 2: Core Stages
export const AbstrakData = v.object({
    ringkasan: v.optional(v.string()),
    ringkasanPenelitian: v.optional(v.string()),
    keywords: v.optional(v.array(v.string())),
    wordCount: v.optional(v.number()),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});

export const PendahuluanData = v.object({
    ringkasan: v.optional(v.string()),
    latarBelakang: v.optional(v.string()),
    rumusanMasalah: v.optional(v.string()),
    researchGapAnalysis: v.optional(v.string()),
    tujuanPenelitian: v.optional(v.string()),
    signifikansiPenelitian: v.optional(v.string()), // Mengapa penelitian ini penting
    hipotesis: v.optional(v.string()), // Hipotesis atau pertanyaan penelitian
    sitasiAPA: v.optional(v.array(v.object(SitasiAPAShape))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});

export const TinjauanLiteraturData = v.object({
    ringkasan: v.optional(v.string()),
    kerangkaTeoretis: v.optional(v.string()),
    reviewLiteratur: v.optional(v.string()),
    gapAnalysis: v.optional(v.string()),
    justifikasiPenelitian: v.optional(v.string()), // Mengapa penelitian ini diperlukan
    referensi: v.optional(v.array(v.object({
        title: v.string(),
        authors: v.optional(v.string()),
        year: v.optional(v.number()),
        url: v.optional(v.string()),
        publishedAt: v.optional(v.number()), // Timestamp from google_search
        inTextCitation: v.string(),
        isFromPhase1: v.boolean(),
    }))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});

export const MetodologiData = v.object({
    ringkasan: v.optional(v.string()),
    desainPenelitian: v.optional(v.string()),
    metodePerolehanData: v.optional(v.string()),
    teknikAnalisis: v.optional(v.string()),
    etikaPenelitian: v.optional(v.string()),
    alatInstrumen: v.optional(v.string()), // Alat atau instrumen penelitian
    pendekatanPenelitian: v.optional(v.union(
        v.literal("kualitatif"),
        v.literal("kuantitatif"),
        v.literal("mixed")
    )),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});

// Phase 3: Results & Analysis
export const HasilData = v.object({
    ringkasan: v.optional(v.string()),
    temuanUtama: v.optional(v.array(v.string())),
    metodePenyajian: v.optional(v.union(
        v.literal("narrative"),
        v.literal("tabular"),
        v.literal("mixed")
    )),
    dataPoints: v.optional(v.array(v.object({
        label: v.string(),
        value: v.union(v.number(), v.string()),
        unit: v.optional(v.string()),
        note: v.optional(v.string()),
    }))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});

export const DiskusiData = v.object({
    ringkasan: v.optional(v.string()),
    interpretasiTemuan: v.optional(v.string()),
    perbandinganLiteratur: v.optional(v.string()),
    implikasiTeoretis: v.optional(v.string()),
    implikasiPraktis: v.optional(v.string()),
    keterbatasanPenelitian: v.optional(v.string()),
    saranPenelitianMendatang: v.optional(v.string()),
    sitasiTambahan: v.optional(v.array(v.object({
        ...SitasiAPAShape,
        isAdditional: v.optional(v.boolean()),
    }))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});

export const KesimpulanData = v.object({
    ringkasan: v.optional(v.string()),
    ringkasanHasil: v.optional(v.string()),
    jawabanRumusanMasalah: v.optional(v.array(v.string())),
    implikasiPraktis: v.optional(v.string()), // Implikasi praktis dari temuan
    saranPraktisi: v.optional(v.string()),
    saranPeneliti: v.optional(v.string()),
    saranKebijakan: v.optional(v.string()),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});

// Phase 4: Finalization Stages

// Stage 10: Daftar Pustaka (Bibliography/References)
// Compiles all references from previous stages into APA 7th format
export const DaftarPustakaData = v.object({
    ringkasan: v.optional(v.string()),
    // Array of reference entries - compiled from all previous stages
    entries: v.optional(v.array(v.object({
        title: v.string(), // Required - identifier for dedup
        authors: v.optional(v.string()),
        year: v.optional(v.number()),
        url: v.optional(v.string()),
        publishedAt: v.optional(v.number()), // Timestamp from google_search
        doi: v.optional(v.string()),
        inTextCitation: v.optional(v.string()), // AI-generated: "(Supit, 2024)"
        fullReference: v.optional(v.string()), // AI-generated: APA 7th format
        sourceStage: v.optional(v.string()), // e.g., "gagasan", "pendahuluan"
        isComplete: v.optional(v.boolean()), // false jika metadata kurang
    }))),
    totalCount: v.optional(v.number()), // Total referensi
    incompleteCount: v.optional(v.number()), // Jumlah referensi incomplete
    duplicatesMerged: v.optional(v.number()), // Jumlah duplikat yang di-merge
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});

// Stage 11: Lampiran (Appendices)
// Supporting materials organized with auto-labeling
export const LampiranData = v.object({
    ringkasan: v.optional(v.string()),
    // Array of appendix items with sequential labeling
    items: v.optional(v.array(v.object({
        label: v.string(), // Required - "A", "B", "C" (auto-generated sequential)
        judul: v.optional(v.string()),
        tipe: v.optional(v.union(
            v.literal("table"),
            v.literal("figure"),
            v.literal("instrument"),
            v.literal("rawData"),
            v.literal("other")
        )),
        konten: v.optional(v.string()),
        // Reference linking ke main text sections (format: ["metodologi.alatInstrumen", "hasil.temuan1"])
        referencedInSections: v.optional(v.array(v.string())),
    }))),
    tidakAdaLampiran: v.optional(v.boolean()),
    alasanTidakAda: v.optional(v.string()),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});

// Stage 12: Judul (Title Selection)
// Generate 5 title options with keyword coverage analysis
export const JudulData = v.object({
    ringkasan: v.optional(v.string()),
    // Array of 5 title options
    opsiJudul: v.optional(v.array(v.object({
        judul: v.string(), // Required - the title text
        keywordsCovered: v.optional(v.array(v.string())),
        coverageScore: v.optional(v.number()), // 0-100
    }))),
    judulTerpilih: v.optional(v.string()), // Selected final title
    alasanPemilihan: v.optional(v.string()), // Reason for selection
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});

// Stage 13: Outline (Full Paper Structure)
// Hierarchical structure using flat array with parentId
export const OutlineData = v.object({
    ringkasan: v.optional(v.string()),
    // Flat array of outline sections with parentId for hierarchy
    sections: v.optional(v.array(v.object({
        id: v.string(), // Required - format: "pendahuluan", "hasil", "hasil.temuan1"
        judul: v.optional(v.string()),
        level: v.optional(v.number()), // 1 = bab, 2 = sub-bab, 3 = poin
        parentId: v.optional(v.union(v.string(), v.null())), // null untuk root, "hasil" untuk "hasil.temuan1"
        estimatedWordCount: v.optional(v.number()),
        status: v.optional(v.union(
            v.literal("complete"),
            v.literal("partial"),
            v.literal("empty")
        )),
    }))),
    totalWordCount: v.optional(v.number()), // Estimated total word count
    completenessScore: v.optional(v.number()), // Percentage of sections completed (0-100)
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});

// Generic structure for future stages
export const GenericStageData = v.object({
    content: v.optional(v.string()),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});
