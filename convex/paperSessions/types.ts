import { v } from "convex/values";
import { STAGE_ORDER } from "./constants";

export type PaperStage = typeof STAGE_ORDER[number] | "completed";

export type StageStatus = "drafting" | "pending_validation" | "approved" | "revision";

// Validators for each stage (used in schema and mutations)
export const GagasanData = v.object({
    ideKasar: v.optional(v.string()), // Optional: may not exist during initial revision
    analisis: v.optional(v.string()),
    angle: v.optional(v.string()),
    novelty: v.optional(v.string()),
    referensiAwal: v.optional(v.array(v.object({
        title: v.string(),
        authors: v.optional(v.string()),
        year: v.optional(v.number()),
        url: v.optional(v.string()),
    }))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});

export const TopikData = v.object({
    definitif: v.optional(v.string()), // Optional: may not exist during initial revision
    angleSpesifik: v.optional(v.string()),
    argumentasiKebaruan: v.optional(v.string()),
    researchGap: v.optional(v.string()), // Gap spesifik yang akan diisi
    referensiPendukung: v.optional(v.array(v.object({
        title: v.string(),
        authors: v.optional(v.string()),
        year: v.optional(v.number()),
        url: v.optional(v.string()),
    }))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});

// Phase 2: Core Stages
export const AbstrakData = v.object({
    ringkasanPenelitian: v.optional(v.string()),
    keywords: v.optional(v.array(v.string())),
    wordCount: v.optional(v.number()),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});

export const PendahuluanData = v.object({
    latarBelakang: v.optional(v.string()),
    rumusanMasalah: v.optional(v.string()),
    researchGapAnalysis: v.optional(v.string()),
    tujuanPenelitian: v.optional(v.string()),
    sitasiAPA: v.optional(v.array(v.object({
        inTextCitation: v.string(),
        fullReference: v.string(),
        url: v.optional(v.string()),
    }))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});

export const TinjauanLiteraturData = v.object({
    kerangkaTeoretis: v.optional(v.string()),
    reviewLiteratur: v.optional(v.string()),
    gapAnalysis: v.optional(v.string()),
    referensi: v.optional(v.array(v.object({
        title: v.string(),
        authors: v.optional(v.string()),
        year: v.optional(v.number()),
        url: v.optional(v.string()),
        inTextCitation: v.string(),
        isFromPhase1: v.boolean(),
    }))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});

export const MetodologiData = v.object({
    desainPenelitian: v.optional(v.string()),
    metodePerolehanData: v.optional(v.string()),
    teknikAnalisis: v.optional(v.string()),
    etikaPenelitian: v.optional(v.string()),
    pendekatanPenelitian: v.optional(v.union(
        v.literal("kualitatif"),
        v.literal("kuantitatif"),
        v.literal("mixed")
    )),
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
