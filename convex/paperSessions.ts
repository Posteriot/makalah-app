import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getNextStage, PaperStageId, STAGE_ORDER } from "./paperSessions/constants";

// ═══════════════════════════════════════════════════════════
// STAGE DATA KEY WHITELIST (Task 1.3.1)
// ═══════════════════════════════════════════════════════════

/**
 * Whitelist of allowed keys per stage.
 * Unknown keys will be rejected by updateStageData.
 */
const STAGE_KEY_WHITELIST: Record<string, string[]> = {
    gagasan: [
        "ringkasan", "ideKasar", "analisis", "angle", "novelty",
        "referensiAwal", "artifactId", "validatedAt", "revisionCount"
    ],
    topik: [
        "ringkasan", "definitif", "angleSpesifik", "argumentasiKebaruan",
        "researchGap", "referensiPendukung", "artifactId", "validatedAt", "revisionCount"
    ],
    outline: [
        "ringkasan", "sections", "totalWordCount", "completenessScore",
        "artifactId", "validatedAt", "revisionCount"
    ],
    abstrak: [
        "ringkasan", "ringkasanPenelitian", "keywords", "wordCount",
        "artifactId", "validatedAt", "revisionCount"
    ],
    pendahuluan: [
        "ringkasan", "latarBelakang", "rumusanMasalah", "researchGapAnalysis",
        "tujuanPenelitian", "signifikansiPenelitian", "hipotesis", "sitasiAPA",
        "artifactId", "validatedAt", "revisionCount"
    ],
    tinjauan_literatur: [
        "ringkasan", "kerangkaTeoretis", "reviewLiteratur", "gapAnalysis",
        "justifikasiPenelitian", "referensi", "artifactId", "validatedAt", "revisionCount"
    ],
    metodologi: [
        "ringkasan", "desainPenelitian", "metodePerolehanData", "teknikAnalisis",
        "etikaPenelitian", "alatInstrumen", "pendekatanPenelitian",
        "artifactId", "validatedAt", "revisionCount"
    ],
    hasil: [
        "ringkasan", "temuanUtama", "metodePenyajian", "dataPoints",
        "artifactId", "validatedAt", "revisionCount"
    ],
    diskusi: [
        "ringkasan", "interpretasiTemuan", "perbandinganLiteratur",
        "implikasiTeoretis", "implikasiPraktis", "keterbatasanPenelitian",
        "saranPenelitianMendatang", "sitasiTambahan",
        "artifactId", "validatedAt", "revisionCount"
    ],
    kesimpulan: [
        "ringkasan", "ringkasanHasil", "jawabanRumusanMasalah",
        "implikasiPraktis", "saranPraktisi", "saranPeneliti", "saranKebijakan",
        "artifactId", "validatedAt", "revisionCount"
    ],
    daftar_pustaka: [
        "ringkasan", "entries", "totalCount", "incompleteCount", "duplicatesMerged",
        "artifactId", "validatedAt", "revisionCount"
    ],
    lampiran: [
        "ringkasan", "items", "tidakAdaLampiran", "alasanTidakAda",
        "artifactId", "validatedAt", "revisionCount"
    ],
    judul: [
        "ringkasan", "opsiJudul", "judulTerpilih", "alasanPemilihan",
        "artifactId", "validatedAt", "revisionCount"
    ],
};

/**
 * Validate stage data keys against whitelist.
 * Returns array of unknown keys, or empty array if all keys are valid.
 */
function validateStageDataKeys(stage: string, data: Record<string, unknown>): string[] {
    const allowedKeys = STAGE_KEY_WHITELIST[stage];
    if (!allowedKeys) return []; // Unknown stage - let other guards handle this

    const dataKeys = Object.keys(data);
    return dataKeys.filter(key => !allowedKeys.includes(key));
}

// ═══════════════════════════════════════════════════════════
// REFERENSI PARSER (Fix: AI sering kirim string, bukan object)
// ═══════════════════════════════════════════════════════════

/**
 * Type for reference item object
 */
interface ReferensiItem {
    title: string;
    authors?: string;
    url?: string;
    year?: number;
}

/**
 * Parse a citation string into structured object.
 * Handles formats like:
 * - "Ryan, R. M., & Deci, E. L. (2000). Self-determination theory..."
 * - "Chen, C. H., & Yang, Y. C. (2019). Revisiting the effects..."
 * - Simple URL strings
 */
function parseCitationString(citation: string): ReferensiItem {
    // Default: use entire string as title
    let title = citation.trim();
    let authors: string | undefined;
    let year: number | undefined;
    let url: string | undefined;

    // Try to extract year (4 digits in parentheses or standalone)
    const yearMatch = citation.match(/\((\d{4})\)|\b(19|20)\d{2}\b/);
    if (yearMatch) {
        year = parseInt(yearMatch[1] || yearMatch[0], 10);
    }

    // Try to extract URL
    const urlMatch = citation.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
        url = urlMatch[0].replace(/[.,;]+$/, ''); // Remove trailing punctuation
    }

    // Try to extract authors (text before year or title separator)
    // Pattern: "Author, A. B., & Author, C. D. (year)" or "Author et al. (year)"
    const authorMatch = citation.match(/^([^(]+?)\s*\(\d{4}\)/);
    if (authorMatch) {
        const authorPart = authorMatch[1].trim();
        // If there's a period after the author portion, split there
        const dotSplit = citation.indexOf('. ', authorPart.length);
        if (dotSplit > 0) {
            authors = authorPart;
            // Title is the part after authors and year, before any URL
            const afterYear = citation.substring(dotSplit + 2);
            const urlIndex = afterYear.indexOf('http');
            title = urlIndex > 0 ? afterYear.substring(0, urlIndex).trim() : afterYear.trim();
            // Clean up trailing punctuation from title
            title = title.replace(/[.,;]+$/, '');
        }
    }

    // If we couldn't parse authors, but have URL, use text before URL as title
    if (!authors && url) {
        const urlIndex = citation.indexOf(url);
        if (urlIndex > 0) {
            title = citation.substring(0, urlIndex).trim().replace(/[.,;]+$/, '');
        }
    }

    return {
        title: title || 'Unknown Reference',
        ...(authors && { authors }),
        ...(url && { url }),
        ...(year && { year }),
    };
}

/**
 * Normalize referensi data - convert string items to objects.
 * This handles the case where AI sends string citations instead of objects.
 */
function normalizeReferensiData(data: Record<string, unknown>): Record<string, unknown> {
    const referensiFields = ['referensiAwal', 'referensiPendukung', 'referensi'];
    const normalizedData = { ...data };

    for (const field of referensiFields) {
        if (Array.isArray(normalizedData[field])) {
            normalizedData[field] = (normalizedData[field] as unknown[]).map((item) => {
                if (typeof item === 'string') {
                    // Convert string citation to object
                    return parseCitationString(item);
                }
                // Already an object, return as-is
                return item;
            });
        }
    }

    return normalizedData;
}

// ═══════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════

/**
 * Mendapatkan paper session berdasarkan session ID.
 */
export const getById = query({
    args: { sessionId: v.id("paperSessions") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.sessionId);
    },
});

/**
 * Mendapatkan paper session berdasarkan conversation ID.
 */
export const getByConversation = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("paperSessions")
            .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
            .unique();
    },
});

/**
 * Mendapatkan daftar paper session milik user (sorted by updatedAt desc).
 */
export const getByUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("paperSessions")
            .withIndex("by_user_updated", (q) => q.eq("userId", args.userId))
            .order("desc")
            .collect();
    },
});

/**
 * Mendapatkan daftar paper session milik user dengan filter.
 * - status: "all" | "in_progress" | "completed"
 * - includeArchived: boolean (default false)
 * - sortBy: "updatedAt" | "createdAt" (default "updatedAt")
 */
export const getByUserWithFilter = query({
    args: {
        userId: v.id("users"),
        status: v.optional(v.union(
            v.literal("all"),
            v.literal("in_progress"),
            v.literal("completed")
        )),
        includeArchived: v.optional(v.boolean()),
        sortBy: v.optional(v.union(
            v.literal("updatedAt"),
            v.literal("createdAt")
        )),
    },
    handler: async (ctx, args) => {
        const { userId, status = "all", includeArchived = false, sortBy = "updatedAt" } = args;

        let sessions;

        if (includeArchived) {
            sessions = await ctx.db
                .query("paperSessions")
                .withIndex("by_user_archived", (q) => q.eq("userId", userId))
                .order("desc")
                .collect();
            sessions = sessions.filter(s => s.archivedAt);
        } else {
            sessions = await ctx.db
                .query("paperSessions")
                .withIndex("by_user_updated", (q) => q.eq("userId", userId))
                .order("desc")
                .collect();
            sessions = sessions.filter(s => !s.archivedAt);
        }

        // Filter by status
        if (status === "in_progress") {
            sessions = sessions.filter(s => s.currentStage !== "completed");
        } else if (status === "completed") {
            sessions = sessions.filter(s => s.currentStage === "completed");
        }

        // Sort by specified field
        if (sortBy === "createdAt") {
            sessions = sessions.sort((a, b) => b.createdAt - a.createdAt);
        } else if (sortBy === "updatedAt") {
            sessions = sessions.sort((a, b) => b.updatedAt - a.updatedAt);
        }

        return sessions;
    },
});

/**
 * Mendapatkan detail session dengan conversation untuk display.
 */
export const getSessionWithConversation = query({
    args: { sessionId: v.id("paperSessions") },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) return null;

        const conversation = await ctx.db.get(session.conversationId);

        return {
            ...session,
            conversation,
        };
    },
});

// ═══════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════

/**
 * Membuat paper session baru.
 */
export const create = mutation({
    args: {
        userId: v.id("users"),
        conversationId: v.id("conversations"),
        initialIdea: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();

        // Check if session already exists for this conversation
        const existing = await ctx.db
            .query("paperSessions")
            .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
            .unique();

        if (existing) return existing._id;

        return await ctx.db.insert("paperSessions", {
            userId: args.userId,
            conversationId: args.conversationId,
            currentStage: "gagasan",
            stageStatus: "drafting",
            stageData: {
                gagasan: args.initialIdea ? {
                    ideKasar: args.initialIdea,
                    revisionCount: 0,
                } : undefined,
            },
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Mengupdate data untuk tahap saat ini.
 */
export const updateStageData = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        stage: v.string(),
        data: v.any(), // Partial of the stage data (flexible for different stages)
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (!STAGE_ORDER.includes(args.stage as PaperStageId)) {
            throw new Error(`Unknown stage: ${args.stage}`);
        }
        if (session.currentStage !== args.stage) {
            throw new Error(`Cannot update ${args.stage} while in ${session.currentStage}`);
        }

        // Guard: Block update if stage is pending validation
        if (session.stageStatus === "pending_validation") {
            throw new Error(
                "updateStageData gagal: Stage sedang pending validation. " +
                "Minta revisi dulu jika ingin mengubah draft."
            );
        }

        // Guard: Validate stage data keys against whitelist (Task 1.3.1)
        const unknownKeys = validateStageDataKeys(args.stage, args.data as Record<string, unknown>);
        if (unknownKeys.length > 0) {
            throw new Error(
                `updateStageData gagal: Key tidak dikenal untuk tahap ${args.stage}: ${unknownKeys.join(", ")}. ` +
                "Gunakan key yang sesuai dengan skema tahap ini."
            );
        }

        // Normalize referensi data: convert string citations to objects
        // This handles the case where AI sends string citations instead of objects
        const normalizedData = normalizeReferensiData(args.data as Record<string, unknown>);

        const now = Date.now();
        const stageKey = args.stage;
        const stageDataObj = session.stageData as Record<string, Record<string, unknown>>;
        const existingStageData = stageDataObj[stageKey] || {};

        const updatedStageData = {
            ...session.stageData,
            [stageKey]: {
                ...existingStageData,
                ...normalizedData,
            },
        };

        await ctx.db.patch(args.sessionId, {
            stageData: updatedStageData,
            updatedAt: now,
        });

        // ════════════════════════════════════════════════════════════════
        // Return warning if ringkasan is missing
        // This gives AI feedback to add ringkasan before submitting
        // ════════════════════════════════════════════════════════════════
        const finalStageData = {
            ...existingStageData,
            ...normalizedData,
        };
        const hasRingkasan = typeof finalStageData.ringkasan === "string"
            && finalStageData.ringkasan.trim() !== "";

        return {
            success: true,
            stage: args.stage,
            warning: hasRingkasan ? undefined :
                "PERINGATAN: Ringkasan belum diisi. Tahap ini TIDAK BISA di-approve tanpa ringkasan. " +
                "Panggil updateStageData lagi dengan field 'ringkasan' yang berisi keputusan utama yang disepakati (max 280 karakter).",
        };
    },
});

/**
 * Submit draf tahap saat ini untuk validasi user.
 *
 * GUARD: Akan throw error jika ringkasan belum diisi.
 * Ini memastikan AI selalu menyertakan ringkasan sebelum submit.
 */
export const submitForValidation = mutation({
    args: { sessionId: v.id("paperSessions") },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");

        const currentStage = session.currentStage as PaperStageId;

        // ════════════════════════════════════════════════════════════════
        // Guard: Enforce ringkasan exists BEFORE submitting for validation
        // This catches missing ringkasan early, before UI validation panel appears
        // ════════════════════════════════════════════════════════════════
        const currentStageData = session.stageData?.[currentStage] as Record<string, unknown> | undefined;
        const ringkasan = currentStageData?.ringkasan as string | undefined;

        if (!ringkasan || ringkasan.trim() === "") {
            throw new Error(
                "submitForValidation gagal: Ringkasan wajib diisi terlebih dahulu. " +
                "Gunakan updateStageData untuk menambahkan ringkasan sebelum submit."
            );
        }

        await ctx.db.patch(args.sessionId, {
            stageStatus: "pending_validation",
            updatedAt: Date.now(),
        });

        return {
            success: true,
            stage: currentStage,
            message: `Tahap ${currentStage} berhasil di-submit untuk validasi user.`,
        };
    },
});

/**
 * User menyetujui tahap saat ini dan lanjut ke tahap berikutnya.
 */
export const approveStage = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");
        if (session.stageStatus !== "pending_validation") {
            throw new Error("Stage is not pending validation");
        }

        if (!STAGE_ORDER.includes(session.currentStage as PaperStageId)) {
            throw new Error(`Unknown current stage: ${session.currentStage}`);
        }

        const now = Date.now();
        const currentStage = session.currentStage as PaperStageId;

        // Guard: Enforce ringkasan exists before approval
        const currentStageData = session.stageData?.[currentStage] as Record<string, unknown> | undefined;
        const ringkasan = currentStageData?.ringkasan as string | undefined;

        if (!ringkasan || ringkasan.trim() === "") {
            throw new Error(
                "approveStage gagal: Ringkasan wajib diisi. " +
                "Gunakan updateStageData untuk menambahkan ringkasan."
            );
        }

        // ════════════════════════════════════════════════════════════════
        // Phase 3 Task 3.3.2: Budget Enforcement (Optional)
        // Check if content exceeds outline budget before approval
        // ════════════════════════════════════════════════════════════════
        const outlineData = session.stageData?.outline as Record<string, unknown> | undefined;
        const outlineTotalWordCount = outlineData?.totalWordCount as number | undefined;

        // Calculate current estimated content chars from all ringkasan
        let totalContentChars = 0;
        const stageDataRecord = session.stageData as Record<string, Record<string, unknown>> | undefined;
        if (stageDataRecord) {
            for (const stageKey of Object.keys(stageDataRecord)) {
                const stageContent = stageDataRecord[stageKey];
                const stageRingkasan = stageContent?.ringkasan as string | undefined;
                if (stageRingkasan) {
                    totalContentChars += stageRingkasan.length;
                }
            }
        }
        // Add current stage ringkasan
        totalContentChars += ringkasan.length;

        // Convert outline word count to char estimate (avg 5 chars per word + space)
        const outlineBudgetChars = outlineTotalWordCount ? outlineTotalWordCount * 6 : undefined;

        // Soft warning: Only enforce if outline has budget and content exceeds 150%
        if (outlineBudgetChars && totalContentChars > outlineBudgetChars * 1.5) {
            throw new Error(
                `approveStage gagal: Konten melebihi budget outline. ` +
                `Estimasi: ${Math.ceil(totalContentChars / 6)} kata, ` +
                `Budget: ${outlineTotalWordCount} kata. ` +
                `Pertimbangkan untuk meringkas konten.`
            );
        }

        // Mark current stage validated
        const updatedStageData = { ...session.stageData } as Record<string, Record<string, unknown>>;
        if (updatedStageData[currentStage]) {
            updatedStageData[currentStage] = {
                ...updatedStageData[currentStage],
                validatedAt: now,
            };
        }

        const nextStage = getNextStage(currentStage);

        // ════════════════════════════════════════════════════════════════
        // Phase 3 Task 3.2.2: Update paperMemoryDigest
        // Add decision summary to digest for AI memory
        // ════════════════════════════════════════════════════════════════
        const existingDigest = session.paperMemoryDigest || [];
        const newDigestEntry = {
            stage: currentStage,
            decision: ringkasan.slice(0, 200), // Limit to 200 chars for digest
            timestamp: now,
        };
        const updatedDigest = [...existingDigest, newDigestEntry];

        // ════════════════════════════════════════════════════════════════
        // Phase 3 Task 3.3.1: Update Estimated Content Tracking
        // ════════════════════════════════════════════════════════════════
        const estimatedTokens = Math.ceil(totalContentChars / 4);

        const patchData: Record<string, unknown> = {
            currentStage: nextStage,
            stageStatus: nextStage === "completed" ? "approved" : "drafting",
            stageData: updatedStageData,
            updatedAt: now,
            isDirty: false, // Reset dirty flag on approve
            paperMemoryDigest: updatedDigest,
            estimatedContentChars: totalContentChars,
            estimatedTokenUsage: estimatedTokens,
            ...(nextStage === "completed" ? { completedAt: now } : {}),
        };

        if (currentStage === "judul") {
            const judulData = updatedStageData.judul;
            const judulTerpilih = judulData?.judulTerpilih;
            if (typeof judulTerpilih === "string" && judulTerpilih.trim().length > 0) {
                patchData.paperTitle = judulTerpilih;
            }
        }

        await ctx.db.patch(args.sessionId, patchData);

        return {
            previousStage: currentStage,
            nextStage,
            isCompleted: nextStage === "completed",
        };
    },
});

/**
 * User meminta revisi untuk tahap saat ini.
 */
export const requestRevision = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
        feedback: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");

        const now = Date.now();
        const currentStage = session.currentStage;
        if (!STAGE_ORDER.includes(currentStage as PaperStageId)) {
            throw new Error(`Unknown current stage: ${currentStage}`);
        }

        const updatedStageData = { ...session.stageData } as Record<string, Record<string, unknown>>;
        const stageData = updatedStageData[currentStage] || { revisionCount: 0 };

        const currentRevisionCount = typeof stageData.revisionCount === 'number' ? stageData.revisionCount : 0;
        updatedStageData[currentStage] = {
            ...stageData,
            revisionCount: currentRevisionCount + 1,
        };

        await ctx.db.patch(args.sessionId, {
            stageStatus: "revision",
            stageData: updatedStageData,
            updatedAt: now,
        });

        return {
            stage: currentStage,
            revisionCount: updatedStageData[currentStage].revisionCount,
        };
    },
});

// ═══════════════════════════════════════════════════════════
// SESSION MANAGEMENT MUTATIONS (Phase 5)
// ═══════════════════════════════════════════════════════════

/**
 * Archive paper session (soft delete).
 * Sets archivedAt timestamp.
 */
export const archiveSession = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");

        const now = Date.now();
        await ctx.db.patch(args.sessionId, {
            archivedAt: now,
            updatedAt: now,
        });

        return { success: true, archivedAt: now };
    },
});

/**
 * Unarchive paper session.
 * Clears archivedAt timestamp.
 */
export const unarchiveSession = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");

        await ctx.db.patch(args.sessionId, {
            archivedAt: undefined,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Delete paper session (hard delete).
 * Also deletes related conversation and its messages via cascade.
 */
export const deleteSession = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");

        const conversationId = session.conversationId;

        // Delete all messages in conversation
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .collect();

        for (const message of messages) {
            await ctx.db.delete(message._id);
        }

        // Delete all artifacts in conversation
        const artifacts = await ctx.db
            .query("artifacts")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .collect();

        for (const artifact of artifacts) {
            await ctx.db.delete(artifact._id);
        }

        // Delete all files in conversation
        const files = await ctx.db
            .query("files")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .collect();

        for (const file of files) {
            await ctx.db.delete(file._id);
        }

        // Delete the conversation itself
        await ctx.db.delete(conversationId);

        // Finally, delete the paper session
        await ctx.db.delete(args.sessionId);

        return { success: true };
    },
});

/**
 * Sync judulTerpilih dari stageData.judul ke paperTitle.
 * Fulfills Phase 4 promise from finalization.ts:242.
 */
export const syncPaperTitle = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");

        // Extract judulTerpilih from stageData.judul
        const stageData = session.stageData as Record<string, Record<string, unknown>>;
        const judulData = stageData.judul;
        const judulTerpilih = judulData?.judulTerpilih as string | undefined;

        if (!judulTerpilih) {
            return { success: false, reason: "No judulTerpilih found in stageData.judul" };
        }

        await ctx.db.patch(args.sessionId, {
            paperTitle: judulTerpilih,
            updatedAt: Date.now(),
        });

        return { success: true, paperTitle: judulTerpilih };
    },
});

/**
 * Update paper title manually.
 */
export const updatePaperTitle = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
        title: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");

        await ctx.db.patch(args.sessionId, {
            paperTitle: args.title,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

// ════════════════════════════════════════════════════════════════
// Phase 3 Task 3.1.2: Mark Stage as Dirty (Edit/Regenerate Sync)
// ════════════════════════════════════════════════════════════════

/**
 * Mark paper session as dirty when user edits/regenerates messages.
 * Called from ChatWindow.tsx when edit/regenerate happens in paper mode.
 * Non-blocking - errors are logged but don't interrupt user flow.
 */
export const markStageAsDirty = mutation({
    args: {
        sessionId: v.id("paperSessions"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) {
            return { success: false, error: "Session not found" };
        }

        await ctx.db.patch(args.sessionId, {
            isDirty: true,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});
