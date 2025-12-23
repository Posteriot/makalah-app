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

// Generic structure for future stages
export const GenericStageData = v.object({
    content: v.optional(v.string()),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});
