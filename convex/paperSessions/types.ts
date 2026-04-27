import { v } from "convex/values";
import { STAGE_ORDER } from "./constants";
import { planSnapshotValidator } from "../lib/messageValidators";

export type PaperStage = typeof STAGE_ORDER[number] | "completed";

export type StageStatus = "drafting" | "pending_validation" | "approved" | "revision";

const WebSearchReferenceShape = {
    url: v.string(),
    title: v.string(),
    publishedAt: v.optional(v.number()),
};

const SitasiAPAShape = {
    inTextCitation: v.optional(v.string()),
    fullReference: v.optional(v.string()),
    url: v.optional(v.string()),
};

// Backward compatibility for existing paperSessions documents in Convex.
// New runtime writes should still be governed by tool schemas + whitelist,
// but schema validation must continue to accept legacy session records.
const legacyRingkasanFields = {
    ringkasan: v.optional(v.string()),
    ringkasanDetail: v.optional(v.string()),
    _plan: v.optional(planSnapshotValidator),
};

// Harness plan system: model-driven task tracking stored per stage.
// _plan is written by updatePlan mutation (harness-level, not model tool).
const planField = {
    _plan: v.optional(v.any()),
};

// Validators for each stage (used in schema and mutations)
export const GagasanData = v.object({
    ...legacyRingkasanFields,
    ...planField,
    ideKasar: v.optional(v.string()), // Optional: may not exist during initial revision
    analisis: v.optional(v.string()),
    angle: v.optional(v.string()),
    novelty: v.optional(v.string()),
    referensiAwal: v.optional(v.array(v.object({
        title: v.optional(v.string()),
        authors: v.optional(v.string()),
        year: v.optional(v.number()),
        url: v.optional(v.string()),
        publishedAt: v.optional(v.number()), // Timestamp from web search source metadata
    }))),
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
    titleStrippedOnApproval: v.optional(v.boolean()),
});

export const TopikData = v.object({
    ...legacyRingkasanFields,
    ...planField,
    definitif: v.optional(v.string()), // Optional: may not exist during initial revision
    angleSpesifik: v.optional(v.string()),
    argumentasiKebaruan: v.optional(v.string()),
    researchGap: v.optional(v.string()), // Gap spesifik yang akan diisi
    referensiPendukung: v.optional(v.array(v.object({
        title: v.optional(v.string()),
        authors: v.optional(v.string()),
        year: v.optional(v.number()),
        url: v.optional(v.string()),
        publishedAt: v.optional(v.number()), // Timestamp from web search source metadata
    }))),
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
    titleStrippedOnApproval: v.optional(v.boolean()),
});

// Phase 2: Core Stages
export const AbstrakData = v.object({
    ...legacyRingkasanFields,
    ...planField,
    ringkasanPenelitian: v.optional(v.string()),
    keywords: v.optional(v.array(v.string())),
    wordCount: v.optional(v.number()),
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
    titleStrippedOnApproval: v.optional(v.boolean()),
});

export const PendahuluanData = v.object({
    ...legacyRingkasanFields,
    ...planField,
    latarBelakang: v.optional(v.string()),
    rumusanMasalah: v.optional(v.string()),
    researchGapAnalysis: v.optional(v.string()),
    tujuanPenelitian: v.optional(v.string()),
    signifikansiPenelitian: v.optional(v.string()), // Mengapa penelitian ini penting
    hipotesis: v.optional(v.string()), // Hipotesis atau pertanyaan penelitian
    sitasiAPA: v.optional(v.array(v.object(SitasiAPAShape))),
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
    titleStrippedOnApproval: v.optional(v.boolean()),
});

export const TinjauanLiteraturData = v.object({
    ...legacyRingkasanFields,
    ...planField,
    kerangkaTeoretis: v.optional(v.string()),
    reviewLiteratur: v.optional(v.string()),
    gapAnalysis: v.optional(v.string()),
    justifikasiPenelitian: v.optional(v.string()), // Mengapa penelitian ini diperlukan
    referensi: v.optional(v.array(v.object({
        title: v.optional(v.string()),
        authors: v.optional(v.string()),
        year: v.optional(v.number()),
        url: v.optional(v.string()),
        publishedAt: v.optional(v.number()), // Timestamp from web search source metadata
        inTextCitation: v.optional(v.string()),
        isFromPhase1: v.optional(v.boolean()),
    }))),
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
    titleStrippedOnApproval: v.optional(v.boolean()),
});

export const MetodologiData = v.object({
    ...legacyRingkasanFields,
    ...planField,
    desainPenelitian: v.optional(v.string()),
    metodePerolehanData: v.optional(v.string()),
    teknikAnalisis: v.optional(v.string()),
    etikaPenelitian: v.optional(v.string()),
    alatInstrumen: v.optional(v.string()), // Alat atau instrumen penelitian
    pendekatanPenelitian: v.optional(v.string()),
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
    titleStrippedOnApproval: v.optional(v.boolean()),
});

// Phase 3: Results & Analysis
export const HasilData = v.object({
    ...legacyRingkasanFields,
    ...planField,
    temuanUtama: v.optional(v.union(v.array(v.string()), v.string())),
    metodePenyajian: v.optional(v.string()),
    dataPoints: v.optional(v.array(v.object({
        label: v.optional(v.string()),
        value: v.optional(v.union(v.number(), v.string())),
        unit: v.optional(v.string()),
        note: v.optional(v.string()),
    }))),
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
    titleStrippedOnApproval: v.optional(v.boolean()),
});

export const DiskusiData = v.object({
    ...legacyRingkasanFields,
    ...planField,
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
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
    titleStrippedOnApproval: v.optional(v.boolean()),
});

export const KesimpulanData = v.object({
    ...legacyRingkasanFields,
    ...planField,
    ringkasanHasil: v.optional(v.string()),
    jawabanRumusanMasalah: v.optional(v.union(v.array(v.string()), v.string())),
    implikasiPraktis: v.optional(v.string()), // Implikasi praktis dari temuan
    saranPraktisi: v.optional(v.string()),
    saranPeneliti: v.optional(v.string()),
    saranKebijakan: v.optional(v.string()),
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
    titleStrippedOnApproval: v.optional(v.boolean()),
});

// Phase 5: Refinement
export const PembaruanAbstrakData = v.object({
    ...legacyRingkasanFields,
    ...planField,
    ringkasanPenelitianBaru: v.optional(v.string()),
    perubahanUtama: v.optional(v.union(v.array(v.string()), v.string())),
    keywordsBaru: v.optional(v.union(v.array(v.string()), v.string())),
    wordCount: v.optional(v.number()),
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
    titleStrippedOnApproval: v.optional(v.boolean()),
});

// Phase 6: Finalization Stages

// Stage 10: Daftar Pustaka (Bibliography/References)
// Compiles all references from previous stages into APA 7th format
export const DaftarPustakaData = v.object({
    ...legacyRingkasanFields,
    ...planField,
    // Array of reference entries - compiled from all previous stages
    entries: v.optional(v.array(v.object({
        title: v.optional(v.string()), // identifier for dedup
        authors: v.optional(v.string()),
        year: v.optional(v.number()),
        url: v.optional(v.string()),
        publishedAt: v.optional(v.number()), // Timestamp from web search source metadata
        doi: v.optional(v.string()),
        inTextCitation: v.optional(v.string()), // AI-generated: "(Supit, 2024)"
        fullReference: v.optional(v.string()), // AI-generated: APA 7th format
        sourceStage: v.optional(v.string()), // e.g., "gagasan", "pendahuluan"
        isComplete: v.optional(v.boolean()), // false jika metadata kurang
    }))),
    totalCount: v.optional(v.number()), // Total referensi
    incompleteCount: v.optional(v.number()), // Jumlah referensi incomplete
    duplicatesMerged: v.optional(v.number()), // Jumlah duplikat yang di-merge
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
    titleStrippedOnApproval: v.optional(v.boolean()),
});

// Stage 11: Lampiran (Appendices)
// Supporting materials organized with auto-labeling
export const LampiranData = v.object({
    ...legacyRingkasanFields,
    ...planField,
    // Array of appendix items with sequential labeling
    items: v.optional(v.array(v.object({
        label: v.optional(v.string()), // "A", "B", "C" (auto-generated sequential)
        judul: v.optional(v.string()),
        tipe: v.optional(v.string()),
        konten: v.optional(v.string()),
        // Reference linking ke main text sections (format: ["metodologi.alatInstrumen", "hasil.temuan1"])
        referencedInSections: v.optional(v.array(v.string())),
    }))),
    tidakAdaLampiran: v.optional(v.boolean()),
    alasanTidakAda: v.optional(v.string()),
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
    titleStrippedOnApproval: v.optional(v.boolean()),
});

// Stage 12: Judul (Title Selection)
// Generate 5 title options with keyword coverage analysis
export const JudulData = v.object({
    ...legacyRingkasanFields,
    ...planField,
    // Array of 5 title options
    opsiJudul: v.optional(v.array(v.object({
        judul: v.optional(v.string()), // the title text
        keywordsCovered: v.optional(v.array(v.string())),
        coverageScore: v.optional(v.number()), // 0-100
    }))),
    judulTerpilih: v.optional(v.string()), // Selected final title
    alasanPemilihan: v.optional(v.string()), // Reason for selection
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
    titleStrippedOnApproval: v.optional(v.boolean()),
});

// Stage 13: Outline (Full Paper Structure)
// Hierarchical structure using flat array with parentId
export const OutlineData = v.object({
    ...legacyRingkasanFields,
    ...planField,
    // Flat array of outline sections with parentId for hierarchy
    sections: v.optional(v.array(v.object({
        id: v.optional(v.string()), // format: "pendahuluan", "hasil", "hasil.temuan1"
        judul: v.optional(v.string()),
        level: v.optional(v.number()), // 1 = bab, 2 = sub-bab, 3 = poin
        parentId: v.optional(v.union(v.string(), v.null())), // null untuk root, "hasil" untuk "hasil.temuan1"
        estimatedWordCount: v.optional(v.number()),
        status: v.optional(v.string()),
    }))),
    totalWordCount: v.optional(v.number()), // Estimated total word count
    completenessScore: v.optional(v.number()), // Percentage of sections completed (0-100)
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
    titleStrippedOnApproval: v.optional(v.boolean()),
});

// Generic structure for future stages
export const GenericStageData = v.object({
    content: v.optional(v.string()),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
    titleStrippedOnApproval: v.optional(v.boolean()),
});
