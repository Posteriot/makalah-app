import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getNextStage, PaperStageId, STAGE_ORDER } from "./paperSessions/constants";
import {
    requireAuthUser,
    requireAuthUserId,
    verifyAuthUserId,
    requireConversationOwner,
    requirePaperSessionOwner,
    getConversationIfOwner,
} from "./authHelpers";
import {
    compileDaftarPustakaFromStages,
    DAFTAR_PUSTAKA_SOURCE_STAGES,
    type DaftarPustakaCompileCandidate,
} from "./paperSessions/daftarPustakaCompiler";
import {
    autoCheckOutlineSections,
    resetAutoCheckedSections,
} from "./paperSessions/outlineAutoCheck";

const DEFAULT_WORKING_TITLE = "Paper Tanpa Judul";
const MAX_WORKING_TITLE_LENGTH = 80;
const PLACEHOLDER_CONVERSATION_TITLES = new Set(["Percakapan baru", "New Chat"]);

// ═══════════════════════════════════════════════════════════
// STAGE DATA KEY WHITELIST (Task 1.3.1)
// ═══════════════════════════════════════════════════════════

/**
 * Whitelist of allowed keys per stage.
 * Unknown keys will be rejected by updateStageData.
 */
const STAGE_KEY_WHITELIST: Record<string, string[]> = {
    gagasan: [
        "ringkasan", "ringkasanDetail", "ideKasar", "analisis", "angle", "novelty",
        "referensiAwal", "webSearchReferences", "artifactId", "validatedAt", "revisionCount"
    ],
    topik: [
        "ringkasan", "ringkasanDetail", "definitif", "angleSpesifik", "argumentasiKebaruan",
        "researchGap", "referensiPendukung", "webSearchReferences", "artifactId", "validatedAt", "revisionCount"
    ],
    outline: [
        "ringkasan", "ringkasanDetail", "sections", "totalWordCount", "completenessScore",
        "webSearchReferences", "artifactId", "validatedAt", "revisionCount"
    ],
    abstrak: [
        "ringkasan", "ringkasanDetail", "ringkasanPenelitian", "keywords", "wordCount",
        "webSearchReferences", "artifactId", "validatedAt", "revisionCount"
    ],
    pendahuluan: [
        "ringkasan", "ringkasanDetail", "latarBelakang", "rumusanMasalah", "researchGapAnalysis",
        "tujuanPenelitian", "signifikansiPenelitian", "hipotesis", "sitasiAPA",
        "webSearchReferences", "artifactId", "validatedAt", "revisionCount"
    ],
    tinjauan_literatur: [
        "ringkasan", "ringkasanDetail", "kerangkaTeoretis", "reviewLiteratur", "gapAnalysis",
        "justifikasiPenelitian", "referensi", "webSearchReferences", "artifactId", "validatedAt", "revisionCount"
    ],
    metodologi: [
        "ringkasan", "ringkasanDetail", "desainPenelitian", "metodePerolehanData", "teknikAnalisis",
        "etikaPenelitian", "alatInstrumen", "pendekatanPenelitian",
        "webSearchReferences", "artifactId", "validatedAt", "revisionCount"
    ],
    hasil: [
        "ringkasan", "ringkasanDetail", "temuanUtama", "metodePenyajian", "dataPoints",
        "webSearchReferences", "artifactId", "validatedAt", "revisionCount"
    ],
    diskusi: [
        "ringkasan", "ringkasanDetail", "interpretasiTemuan", "perbandinganLiteratur",
        "implikasiTeoretis", "implikasiPraktis", "keterbatasanPenelitian",
        "saranPenelitianMendatang", "sitasiTambahan",
        "webSearchReferences", "artifactId", "validatedAt", "revisionCount"
    ],
    kesimpulan: [
        "ringkasan", "ringkasanDetail", "ringkasanHasil", "jawabanRumusanMasalah",
        "implikasiPraktis", "saranPraktisi", "saranPeneliti", "saranKebijakan",
        "webSearchReferences", "artifactId", "validatedAt", "revisionCount"
    ],
    daftar_pustaka: [
        "ringkasan", "ringkasanDetail", "entries", "totalCount", "incompleteCount", "duplicatesMerged",
        "webSearchReferences", "artifactId", "validatedAt", "revisionCount"
    ],
    lampiran: [
        "ringkasan", "ringkasanDetail", "items", "tidakAdaLampiran", "alasanTidakAda",
        "webSearchReferences", "artifactId", "validatedAt", "revisionCount"
    ],
    judul: [
        "ringkasan", "ringkasanDetail", "opsiJudul", "judulTerpilih", "alasanPemilihan",
        "webSearchReferences", "artifactId", "validatedAt", "revisionCount"
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

/**
 * Normalize URL for dedup: strip UTM params, trailing slash, hash.
 */
function normalizeUrlForDedup(raw: string): string {
    try {
        const u = new URL(raw);
        for (const key of Array.from(u.searchParams.keys())) {
            if (/^utm_/i.test(key)) u.searchParams.delete(key);
        }
        u.hash = "";
        const out = u.toString();
        return out.endsWith("/") ? out.slice(0, -1) : out;
    } catch {
        return raw;
    }
}

/**
 * Map stages to their native reference fields (for dual-write).
 * Only stages with compatible schemas (all-optional fields) are included.
 */
const STAGE_NATIVE_REF_FIELD: Record<string, string | null> = {
    gagasan: "referensiAwal",
    topik: "referensiPendukung",
};

/**
 * Fields that are expected to be arrays in schema.
 * All other fields are expected to be strings (or number/id).
 * Used by coerceStageDataTypes to auto-fix AI sending array for string fields.
 */
const ARRAY_FIELDS: Set<string> = new Set([
    "referensiAwal",     // gagasan: array of objects
    "referensiPendukung", // topik: array of objects
    "keywords",           // abstrak: array of strings
    "sitasiAPA",          // pendahuluan: array of objects
    "referensi",          // tinjauan_literatur: array of objects
    "dataPoints",         // hasil: array of objects
    "sitasiTambahan",     // diskusi: array of objects
    "entries",            // daftar_pustaka: array of objects
    "items",              // lampiran: array of objects
    "opsiJudul",          // judul: array of objects
    "sections",           // outline: array of objects
]);

/**
 * Coerce AI-sent values to match schema types.
 * Fixes:
 * - null/undefined → strip (Convex v.optional() means "absent", not null)
 * - Array of strings for string field → join with newline
 * - Plain object for string field → join values with section headers
 * This prevents Convex validation errors from AI type mismatches.
 */
function coerceStageDataTypes(data: Record<string, unknown>): Record<string, unknown> {
    const coerced: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
        // Strip null/undefined — Convex v.optional() means "field absent", not "field = null"
        if (value === null || value === undefined) {
            continue;
        }

        // Known array fields → keep as-is
        if (ARRAY_FIELDS.has(key)) {
            coerced[key] = value;
            continue;
        }

        // AI sent array for a string field → join
        if (Array.isArray(value)) {
            if (value.every((item: unknown) => typeof item === "string")) {
                coerced[key] = (value as string[]).join("\n");
            } else {
                coerced[key] = value; // pass through, let Convex validate
            }
            continue;
        }

        // AI sent plain object for a string field → flatten to string
        // e.g. reviewLiteratur: { personalisasiPembelajaran: "...", aiDalamPendidikan: "..." }
        if (typeof value === "object" && !Array.isArray(value)) {
            const obj = value as Record<string, unknown>;
            const allStringValues = Object.values(obj).every(v => typeof v === "string");
            if (allStringValues) {
                const parts = Object.entries(obj).map(([subKey, subVal]) =>
                    `## ${subKey}\n\n${subVal}`
                );
                coerced[key] = parts.join("\n\n");
                continue;
            }
        }

        // Default: keep as-is
        coerced[key] = value;
    }
    return coerced;
}

function normalizePaperTitle(title: string): string {
    return title.trim().replace(/\s+/g, " ");
}

function getInitialWorkingTitle(conversationTitle?: string): string {
    if (!conversationTitle) return DEFAULT_WORKING_TITLE;

    const normalized = normalizePaperTitle(conversationTitle);
    if (!normalized || PLACEHOLDER_CONVERSATION_TITLES.has(normalized)) {
        return DEFAULT_WORKING_TITLE;
    }

    return normalized;
}

function validateWorkingTitle(title: string): string {
    const normalized = normalizePaperTitle(title);

    if (!normalized) {
        throw new Error("Working title tidak boleh kosong.");
    }

    if (normalized.length > MAX_WORKING_TITLE_LENGTH) {
        throw new Error(
            `Working title terlalu panjang (maksimal ${MAX_WORKING_TITLE_LENGTH} karakter).`
        );
    }

    return normalized;
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

/**
 * Validate that referensi entries have URL field (anti-hallucination guard).
 * Returns warning info if entries without URL found, null otherwise.
 */
function validateReferensiUrls(data: Record<string, unknown>): {
    missingUrlCount: number;
    totalCount: number;
    field: string;
} | null {
    const referensiFields = [
        "referensiAwal", "referensiPendukung", "referensi",
        "sitasiAPA", "sitasiTambahan"
    ];

    for (const field of referensiFields) {
        if (Array.isArray(data[field])) {
            const items = data[field] as Array<Record<string, unknown>>;
            const total = items.length;
            const missingUrl = items.filter(
                (item) => !item.url || (typeof item.url === "string" && item.url.trim() === "")
            ).length;

            if (missingUrl > 0) {
                return { missingUrlCount: missingUrl, totalCount: total, field };
            }
        }
    }
    return null;
}

const DAFTAR_PUSTAKA_SOURCE_FIELDS = [
    "referensiAwal",
    "referensiPendukung",
    "sitasiAPA",
    "referensi",
    "sitasiTambahan",
] as const;

function parseYearValue(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const match = value.match(/\b(19|20)\d{2}\b/);
        if (match) {
            return Number.parseInt(match[0], 10);
        }
    }
    return undefined;
}

function extractDaftarPustakaCandidatesFromStageData(
    stageData: Record<string, unknown>,
    includeWebSearchReferences: boolean
): DaftarPustakaCompileCandidate[] {
    const candidates: DaftarPustakaCompileCandidate[] = [];

    for (const field of DAFTAR_PUSTAKA_SOURCE_FIELDS) {
        const value = stageData[field];
        if (!Array.isArray(value)) continue;

        for (const item of value) {
            if (!item || typeof item !== "object" || Array.isArray(item)) continue;
            const record = item as Record<string, unknown>;

            const title = typeof record.title === "string" ? record.title : undefined;
            const authors = typeof record.authors === "string" ? record.authors : undefined;
            const year = parseYearValue(record.year);
            const url = typeof record.url === "string" ? record.url : undefined;
            const publishedAt = typeof record.publishedAt === "number" ? record.publishedAt : undefined;
            const doi = typeof record.doi === "string" ? record.doi : undefined;
            const inTextCitation = typeof record.inTextCitation === "string" ? record.inTextCitation : undefined;
            const fullReference = typeof record.fullReference === "string" ? record.fullReference : undefined;

            if (!title && !url && !doi && !inTextCitation && !fullReference) continue;

            candidates.push({
                ...(title ? { title } : {}),
                ...(authors ? { authors } : {}),
                ...(typeof year === "number" ? { year } : {}),
                ...(url ? { url } : {}),
                ...(typeof publishedAt === "number" ? { publishedAt } : {}),
                ...(doi ? { doi } : {}),
                ...(inTextCitation ? { inTextCitation } : {}),
                ...(fullReference ? { fullReference } : {}),
            });
        }
    }

    if (includeWebSearchReferences && Array.isArray(stageData.webSearchReferences)) {
        for (const item of stageData.webSearchReferences) {
            if (!item || typeof item !== "object" || Array.isArray(item)) continue;
            const record = item as Record<string, unknown>;
            const title = typeof record.title === "string" ? record.title : undefined;
            const url = typeof record.url === "string" ? record.url : undefined;
            const publishedAt = typeof record.publishedAt === "number" ? record.publishedAt : undefined;

            if (!title && !url) continue;
            candidates.push({
                ...(title ? { title } : {}),
                ...(url ? { url } : {}),
                ...(typeof publishedAt === "number" ? { publishedAt } : {}),
            });
        }
    }

    return candidates;
}

function isStageInvalidatedByLatestRewind(
    stageId: string,
    stageValidatedAt: number | undefined,
    latestRewind: { createdAt: number; invalidatedStages?: string[] } | null
): boolean {
    if (!latestRewind) return false;
    const invalidatedStages = latestRewind.invalidatedStages ?? [];
    if (!invalidatedStages.includes(stageId)) return false;
    if (typeof stageValidatedAt !== "number") return true;
    return stageValidatedAt <= latestRewind.createdAt;
}

// ═══════════════════════════════════════════════════════════
// FIELD SIZE TRUNCATION (Task W7)
// ═══════════════════════════════════════════════════════════

const FIELD_CHAR_LIMIT = 2000;
const EXCLUDED_TRUNCATION_FIELDS = new Set([
    "ringkasan", "ringkasanDetail", "artifactId",
    "validatedAt", "revisionCount",
]);

/**
 * Truncate oversized string fields in stage data.
 * Prevents bloated DB records and AI context.
 * Excluded fields: ringkasan, ringkasanDetail, artifactId, validatedAt, revisionCount.
 */
function truncateStageDataFields(data: Record<string, unknown>): {
  truncated: Record<string, unknown>;
  warnings: string[];
} {
  const truncated = { ...data };
  const warnings: string[] = [];

  for (const [key, value] of Object.entries(truncated)) {
    if (typeof value !== "string") continue;
    if (EXCLUDED_TRUNCATION_FIELDS.has(key)) continue;

    if (value.length > FIELD_CHAR_LIMIT) {
      truncated[key] = value.slice(0, FIELD_CHAR_LIMIT);
      warnings.push(
        `Field '${key}' di-truncate dari ${value.length} ke ${FIELD_CHAR_LIMIT} karakter.`
      );
    }
  }

  // Custom limit for ringkasanDetail: 1000 chars
  if (typeof truncated.ringkasanDetail === "string" &&
      (truncated.ringkasanDetail as string).length > 1000) {
    truncated.ringkasanDetail = (truncated.ringkasanDetail as string).slice(0, 1000);
    warnings.push("Field 'ringkasanDetail' di-truncate ke 1000 karakter.");
  }

  return { truncated, warnings };
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
        const authUser = await requireAuthUser(ctx);
        const session = await ctx.db.get(args.sessionId);
        if (!session) return null;
        if (session.userId !== authUser._id) return null;
        return session;
    },
});

/**
 * Mendapatkan paper session berdasarkan conversation ID.
 * Returns null if conversation not found, not owned, or auth not ready.
 */
export const getByConversation = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        // Defensive: return null if auth not ready or not owner
        const result = await getConversationIfOwner(ctx, args.conversationId);
        if (!result) return null;

        const { authUser } = result;
        const session = await ctx.db
            .query("paperSessions")
            .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
            .unique();
        if (!session) return null;
        if (session.userId !== authUser._id) return null;
        return session;
    },
});

/**
 * Mendapatkan daftar paper session milik user (sorted by updatedAt desc).
 */
export const getByUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        if (!await verifyAuthUserId(ctx, args.userId)) return [];
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
        await requireAuthUserId(ctx, userId);

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
        const authUser = await requireAuthUser(ctx);
        const session = await ctx.db.get(args.sessionId);
        if (!session) return null;
        if (session.userId !== authUser._id) return null;

        const conversation = await ctx.db.get(session.conversationId);
        if (!conversation || conversation.userId !== authUser._id) {
            return null;
        }

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
        await requireAuthUserId(ctx, args.userId);
        const { conversation } = await requireConversationOwner(ctx, args.conversationId);
        if (conversation.userId !== args.userId) {
            throw new Error("Unauthorized");
        }
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
            workingTitle: getInitialWorkingTitle(conversation.title),
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
        const { session } = await requirePaperSessionOwner(ctx, args.sessionId);
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

        // Guard: Strip unknown keys (soft-reject) + log for observability
        const rawData = args.data as Record<string, unknown>;
        const unknownKeys = validateStageDataKeys(args.stage, rawData);
        let strippedData = rawData;
        if (unknownKeys.length > 0) {
            // Strip unknown keys instead of throwing — mutation continues with valid keys
            strippedData = Object.fromEntries(
                Object.entries(rawData).filter(([key]) => !unknownKeys.includes(key))
            );
            // Log dropped keys to systemAlerts for dashboard observability
            for (const droppedKey of unknownKeys) {
                await ctx.db.insert("systemAlerts", {
                    alertType: "stage_key_dropped",
                    severity: "info",
                    message: `Key "${droppedKey}" dropped dari tahap ${args.stage}`,
                    source: "updateStageData",
                    resolved: false,
                    metadata: {
                        stage: args.stage,
                        keyName: droppedKey,
                        sessionId: args.sessionId,
                    },
                    createdAt: Date.now(),
                });
            }
        }

        // Coerce AI type mismatches (e.g. array sent for string field)
        const coercedData = coerceStageDataTypes(strippedData);

        // Normalize referensi data: convert string citations to objects
        // This handles the case where AI sends string citations instead of objects
        const normalizedData = normalizeReferensiData(coercedData);

        // Truncate oversized string fields (W7)
        const { truncated: truncatedData, warnings: truncationWarnings } =
            truncateStageDataFields(normalizedData);

        const now = Date.now();
        const stageKey = args.stage;
        const stageDataObj = session.stageData as Record<string, Record<string, unknown>>;
        const existingStageData = stageDataObj[stageKey] || {};

        const updatedStageData = {
            ...session.stageData,
            [stageKey]: {
                ...existingStageData,
                ...truncatedData,
            },
        };

        await ctx.db.patch(args.sessionId, {
            stageData: updatedStageData,
            updatedAt: now,
        });

        // ════════════════════════════════════════════════════════════════
        // Return warnings for missing ringkasan and referensi without URLs
        // This gives AI feedback before submitting
        // ════════════════════════════════════════════════════════════════
        const finalStageData = {
            ...existingStageData,
            ...truncatedData,
        };
        const hasRingkasan = typeof finalStageData.ringkasan === "string"
            && finalStageData.ringkasan.trim() !== "";

        // Anti-hallucination: Check referensi URLs
        const urlValidation = validateReferensiUrls(finalStageData);

        const warnings: string[] = [];
        if (unknownKeys.length > 0) {
            warnings.push(
                `Key tidak dikenal di-strip: ${unknownKeys.join(", ")}. ` +
                `Gunakan key yang sesuai skema tahap ${args.stage}.`
            );
        }
        if (!hasRingkasan) {
            warnings.push(
                "Ringkasan belum diisi. Tahap ini TIDAK BISA di-approve tanpa ringkasan. " +
                "Panggil updateStageData lagi dengan field 'ringkasan' yang berisi keputusan utama yang disepakati (max 280 karakter)."
            );
        }
        if (urlValidation) {
            warnings.push(
                `ANTI-HALUSINASI: ${urlValidation.missingUrlCount} dari ${urlValidation.totalCount} ` +
                `referensi di field '${urlValidation.field}' TIDAK memiliki URL. ` +
                `Semua referensi WAJIB berasal dari google_search dan memiliki URL sumber.`
            );
        }
        if (truncationWarnings.length > 0) {
            warnings.push(...truncationWarnings);
        }

        return {
            success: true,
            stage: args.stage,
            warning: warnings.length > 0 ? warnings.join(" | ") : undefined,
        };
    },
});

/**
 * Append web search references to current stage's stageData.
 * Server-side auto-persist: deterministic, not dependent on AI behavior.
 * - Appends to webSearchReferences with URL dedup
 * - For gagasan/topik: also appends to native reference fields (dual-write)
 */
export const appendSearchReferences = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        references: v.array(v.object({
            url: v.string(),
            title: v.string(),
            publishedAt: v.optional(v.number()),
        })),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) {
            console.error("[appendSearchReferences] Session not found:", args.sessionId);
            return;
        }

        const stage = session.currentStage;
        if (!STAGE_ORDER.includes(stage as PaperStageId)) {
            console.error("[appendSearchReferences] Unknown stage:", stage);
            return;
        }

        const stageDataObj = (session.stageData ?? {}) as Record<string, Record<string, unknown>>;
        const currentData = { ...(stageDataObj[stage] ?? {}) };

        // 1. Append to webSearchReferences (all stages) with URL dedup
        const existingWebRefs = (currentData.webSearchReferences ?? []) as Array<{
            url: string; title: string; publishedAt?: number;
        }>;
        const existingUrls = new Set(existingWebRefs.map(r => normalizeUrlForDedup(r.url)));

        const newRefs = args.references.filter(
            r => !existingUrls.has(normalizeUrlForDedup(r.url))
        );

        if (newRefs.length === 0) {
            return; // All refs already exist, no-op
        }

        currentData.webSearchReferences = [
            ...existingWebRefs,
            ...newRefs.map(r => ({
                url: r.url,
                title: r.title,
                ...(r.publishedAt !== undefined ? { publishedAt: r.publishedAt } : {}),
            })),
        ];

        // 2. Dual-write to native reference field for gagasan/topik
        const nativeField = STAGE_NATIVE_REF_FIELD[stage];
        if (nativeField) {
            const existingNativeRefs = (currentData[nativeField] ?? []) as Array<{
                title: string; url?: string; [key: string]: unknown;
            }>;
            const existingNativeUrls = new Set(
                existingNativeRefs
                    .filter(r => r.url)
                    .map(r => normalizeUrlForDedup(r.url!))
            );

            const newNativeRefs = newRefs
                .filter(r => !existingNativeUrls.has(normalizeUrlForDedup(r.url)))
                .map(r => ({
                    title: r.title,
                    url: r.url,
                    ...(r.publishedAt !== undefined ? { publishedAt: r.publishedAt } : {}),
                }));

            if (newNativeRefs.length > 0) {
                currentData[nativeField] = [...existingNativeRefs, ...newNativeRefs];
            }
        }

        // 3. Patch stageData
        await ctx.db.patch(args.sessionId, {
            stageData: {
                ...session.stageData,
                [stage]: currentData,
            },
            updatedAt: Date.now(),
        });

        console.log(
            `[appendSearchReferences] Appended ${newRefs.length} refs to stage ${stage}` +
            (nativeField ? ` (also to ${nativeField})` : "")
        );
    },
});

/**
 * Compile daftar pustaka entries from approved stages (1-10), server-side.
 * Result is intended to be persisted via updateStageData in stage daftar_pustaka.
 */
export const compileDaftarPustaka = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        includeWebSearchReferences: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { session } = await requirePaperSessionOwner(ctx, args.sessionId);

        if (session.currentStage !== "daftar_pustaka") {
            throw new Error(
                `compileDaftarPustaka hanya bisa dipanggil di stage daftar_pustaka. Stage aktif: ${session.currentStage}`
            );
        }

        if (session.stageStatus === "pending_validation") {
            throw new Error(
                "compileDaftarPustaka gagal: Stage sedang pending validation. Minta revisi dulu jika ingin compile ulang."
            );
        }

        const includeWebSearchReferences = args.includeWebSearchReferences ?? true;
        const stageDataRecord = (session.stageData ?? {}) as Record<string, Record<string, unknown>>;

        const latestRewindRecord = await ctx.db
            .query("rewindHistory")
            .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
            .order("desc")
            .first();

        const latestRewind = latestRewindRecord
            ? {
                createdAt: latestRewindRecord.createdAt,
                invalidatedStages: latestRewindRecord.invalidatedStages,
            }
            : null;

        const stages = DAFTAR_PUSTAKA_SOURCE_STAGES.map((stageId) => {
            const stageData = stageDataRecord[stageId] ?? {};
            const validatedAt = typeof stageData.validatedAt === "number"
                ? stageData.validatedAt
                : undefined;

            const invalidatedByRewind = isStageInvalidatedByLatestRewind(
                stageId,
                validatedAt,
                latestRewind
            );

            return {
                stage: stageId,
                validatedAt,
                invalidatedByRewind,
                references: extractDaftarPustakaCandidatesFromStageData(
                    stageData,
                    includeWebSearchReferences
                ),
            };
        });

        const result = compileDaftarPustakaFromStages({ stages });

        if (result.compiled.totalCount === 0) {
            throw new Error(
                "compileDaftarPustaka gagal: Tidak ada referensi dari stage yang sudah approved."
            );
        }

        const warnings: string[] = [];
        if (result.stats.skippedStageCount > 0) {
            warnings.push(
                `${result.stats.skippedStageCount} stage dilewati (belum approved atau invalidated oleh rewind).`
            );
        }
        if (result.compiled.incompleteCount > 0) {
            warnings.push(
                `${result.compiled.incompleteCount} referensi terdeteksi incomplete (metadata minimum belum cukup).`
            );
        }

        console.log(
            `[compileDaftarPustaka] session=${args.sessionId} ` +
            `raw=${result.stats.rawCount} unique=${result.compiled.totalCount} ` +
            `duplicatesMerged=${result.compiled.duplicatesMerged} incomplete=${result.compiled.incompleteCount} ` +
            `approvedStages=${result.stats.approvedStageCount} skippedStages=${result.stats.skippedStageCount}`
        );

        if (warnings.length > 0) {
            console.warn(
                `[compileDaftarPustaka] warnings session=${args.sessionId}: ${warnings.join(" | ")}`
            );
        }

        return {
            success: true,
            stage: "daftar_pustaka" as const,
            compiled: result.compiled,
            stats: result.stats,
            ...(warnings.length > 0 ? { warnings } : {}),
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
        const { session } = await requirePaperSessionOwner(ctx, args.sessionId);

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

        // ════════════════════════════════════════════════════════════════
        // Living Outline Checklist: Auto-check sections on stage approval
        // ════════════════════════════════════════════════════════════════
        const outlineForAutoCheck = updatedStageData.outline as Record<string, unknown> | undefined;
        const outlineSections = outlineForAutoCheck?.sections as Array<Record<string, unknown>> | undefined;

        if (outlineSections && outlineSections.length > 0) {
            try {
                const autoCheckResult = autoCheckOutlineSections(
                    outlineSections as unknown as Parameters<typeof autoCheckOutlineSections>[0],
                    currentStage,
                    now
                );

                if (autoCheckResult.sectionsChecked > 0) {
                    updatedStageData.outline = {
                        ...updatedStageData.outline,
                        sections: autoCheckResult.sections as unknown as Record<string, unknown>[],
                        completenessScore: autoCheckResult.completenessScore,
                        lastEditedAt: now,
                        lastEditedFromStage: currentStage,
                    };
                    console.log(
                        `[autoCheckOutline] stage=${currentStage} sections_checked=${autoCheckResult.sectionsChecked} new_completeness=${autoCheckResult.completenessScore}%`
                    );
                }
            } catch (err) {
                console.warn(`[autoCheckOutline] SKIPPED: Error during auto-check for session=${args.sessionId}`, err);
            }
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
                const normalizedFinalTitle = normalizePaperTitle(judulTerpilih);
                patchData.paperTitle = normalizedFinalTitle;
                patchData.workingTitle = normalizedFinalTitle;
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
        await requireAuthUserId(ctx, args.userId);
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
        await requireAuthUserId(ctx, args.userId);
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
        await requireAuthUserId(ctx, args.userId);
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
        await requireAuthUserId(ctx, args.userId);
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
        await requireAuthUserId(ctx, args.userId);
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

        const normalizedFinalTitle = normalizePaperTitle(judulTerpilih);
        await ctx.db.patch(args.sessionId, {
            paperTitle: normalizedFinalTitle,
            workingTitle: normalizedFinalTitle,
            updatedAt: Date.now(),
        });

        return { success: true, paperTitle: normalizedFinalTitle };
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
        await requireAuthUserId(ctx, args.userId);
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");
        const normalizedTitle = normalizePaperTitle(args.title);

        await ctx.db.patch(args.sessionId, {
            paperTitle: normalizedTitle,
            workingTitle: normalizedTitle,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Update working title manually.
 * Working title only editable before final paperTitle is set.
 */
export const updateWorkingTitle = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
        title: v.string(),
    },
    handler: async (ctx, args) => {
        await requireAuthUserId(ctx, args.userId);
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");

        if (typeof session.paperTitle === "string" && session.paperTitle.trim().length > 0) {
            throw new Error("Judul final sudah ditetapkan. Working title tidak bisa diubah lagi.");
        }

        const normalizedTitle = validateWorkingTitle(args.title);

        await ctx.db.patch(args.sessionId, {
            workingTitle: normalizedTitle,
            updatedAt: Date.now(),
        });

        return { success: true, workingTitle: normalizedTitle };
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
        await requirePaperSessionOwner(ctx, args.sessionId);

        await ctx.db.patch(args.sessionId, {
            isDirty: true,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

// ═══════════════════════════════════════════════════════════
// REWIND STAGE FEATURE
// ═══════════════════════════════════════════════════════════

/**
 * Task 2.2.1: Validate if targetStage is a valid rewind target.
 * - Target must be before currentStage
 * - Target must be within 2 stages back (max rewind limit)
 * - Returns: { valid: boolean, error?: string }
 */
function isValidRewindTarget(
    currentStage: string,
    targetStage: string
): { valid: boolean; error?: string } {
    const currentIndex = STAGE_ORDER.indexOf(currentStage as PaperStageId);
    const targetIndex = STAGE_ORDER.indexOf(targetStage as PaperStageId);

    // Unknown stages
    if (currentIndex === -1) {
        return { valid: false, error: `Unknown current stage: ${currentStage}` };
    }
    if (targetIndex === -1) {
        return { valid: false, error: `Unknown target stage: ${targetStage}` };
    }

    // Cannot rewind to current or future stage
    if (targetIndex >= currentIndex) {
        return {
            valid: false,
            error: "Tidak bisa rewind ke stage saat ini atau stage yang belum dilewati",
        };
    }

    // Max 2 stages back limit
    const stagesBack = currentIndex - targetIndex;
    if (stagesBack > 2) {
        return {
            valid: false,
            error: `Hanya bisa rewind maksimal 2 tahap ke belakang. Target: ${targetStage} (${stagesBack} tahap ke belakang)`,
        };
    }

    return { valid: true };
}

/**
 * Task 2.2.2: Get list of stages to invalidate.
 * Returns stages from targetStage to currentStage (exclusive of currentStage).
 * Example: currentStage = "abstrak", targetStage = "topik"
 *          returns ["topik", "outline"]
 */
function getStagesToInvalidate(
    targetStage: string,
    currentStage: string
): string[] {
    const targetIndex = STAGE_ORDER.indexOf(targetStage as PaperStageId);
    const currentIndex = STAGE_ORDER.indexOf(currentStage as PaperStageId);

    if (targetIndex === -1 || currentIndex === -1) return [];

    // Return stages from target to current (exclusive)
    const stagesToInvalidate: string[] = [];
    for (let i = targetIndex; i < currentIndex; i++) {
        stagesToInvalidate.push(STAGE_ORDER[i]);
    }

    return stagesToInvalidate;
}

/**
 * Task 2.2.3: Clear validatedAt for specified stages.
 * Returns updated stageData object.
 */
function clearValidatedAt(
    stageData: Record<string, Record<string, unknown>>,
    stagesToInvalidate: string[]
): Record<string, Record<string, unknown>> {
    const updatedStageData = { ...stageData };

    for (const stage of stagesToInvalidate) {
        if (updatedStageData[stage]) {
            updatedStageData[stage] = {
                ...updatedStageData[stage],
                validatedAt: undefined,
            };
        }
    }

    return updatedStageData;
}

/**
 * Task 2.2.4: Mark paperMemoryDigest entries as superseded for invalidated stages.
 */
function markDigestAsSuperseded(
    digest: Array<{ stage: string; decision: string; timestamp: number; superseded?: boolean }> | undefined,
    stagesToInvalidate: string[]
): Array<{ stage: string; decision: string; timestamp: number; superseded?: boolean }> {
    if (!digest) return [];

    return digest.map((entry) => {
        if (stagesToInvalidate.includes(entry.stage)) {
            return { ...entry, superseded: true };
        }
        return entry;
    });
}

/**
 * Task 2.4: Invalidate artifacts for specified stages.
 * Sets invalidatedAt and invalidatedByRewindToStage fields.
 * Returns array of invalidated artifact IDs.
 */
async function invalidateArtifactsForStages(
    ctx: { db: { query: (table: string) => { withIndex: (name: string, fn: (q: { eq: (field: string, value: string) => unknown }) => unknown) => { collect: () => Promise<Array<{ _id: string; invalidatedAt?: number }>> } }; patch: (id: string, data: Record<string, unknown>) => Promise<void> } },
    conversationId: string,
    stageData: Record<string, Record<string, unknown>>,
    stagesToInvalidate: string[],
    targetStage: string
): Promise<string[]> {
    const now = Date.now();
    const invalidatedArtifactIds: string[] = [];

    // Collect artifact IDs from stages to invalidate
    for (const stage of stagesToInvalidate) {
        const artifactId = stageData[stage]?.artifactId as string | undefined;
        if (artifactId) {
            invalidatedArtifactIds.push(artifactId);
        }
    }

    // Mark each artifact as invalidated
    for (const artifactId of invalidatedArtifactIds) {
        try {
            await ctx.db.patch(artifactId as unknown as Parameters<typeof ctx.db.patch>[0], {
                invalidatedAt: now,
                invalidatedByRewindToStage: targetStage,
            });
        } catch {
            // Artifact might not exist, continue with others
            console.warn(`Failed to invalidate artifact ${artifactId}`);
        }
    }

    return invalidatedArtifactIds;
}

/**
 * Task 2.3 & 2.5: Rewind paper session to a previous stage.
 *
 * Guards:
 * - Session must exist
 * - User must be owner
 * - Target stage must be valid (within 2 stages back, previously validated)
 *
 * Actions:
 * - Clear validatedAt for invalidated stages
 * - Mark paperMemoryDigest entries as superseded
 * - Invalidate artifacts for affected stages
 * - Create rewindHistory record
 * - Update currentStage and stageStatus
 */
export const rewindToStage = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
        targetStage: v.string(),
    },
    handler: async (ctx, args) => {
        await requireAuthUserId(ctx, args.userId);
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");

        const currentStage = session.currentStage;

        // Guard: Validate target stage
        const validation = isValidRewindTarget(currentStage, args.targetStage);
        if (!validation.valid) {
            throw new Error(validation.error || "Invalid rewind target");
        }

        // Guard: Target stage must have been validated before
        const stageData = session.stageData as Record<string, Record<string, unknown>>;
        const targetStageData = stageData[args.targetStage];
        if (!targetStageData?.validatedAt) {
            throw new Error("Target stage belum pernah divalidasi");
        }

        const now = Date.now();

        // Get stages to invalidate (from target to current, exclusive of current)
        const stagesToInvalidate = getStagesToInvalidate(args.targetStage, currentStage);

        // Clear validatedAt for invalidated stages
        const updatedStageData = clearValidatedAt(stageData, stagesToInvalidate);

        // ════════════════════════════════════════════════════════════════
        // Living Outline Checklist: Reset auto-checked sections on rewind
        // ════════════════════════════════════════════════════════════════
        const outlineForReset = updatedStageData.outline as Record<string, unknown> | undefined;
        const outlineSectionsForReset = outlineForReset?.sections as Array<Record<string, unknown>> | undefined;

        if (outlineSectionsForReset && outlineSectionsForReset.length > 0) {
            try {
                const resetResult = resetAutoCheckedSections(
                    outlineSectionsForReset as unknown as Parameters<typeof resetAutoCheckedSections>[0],
                    stagesToInvalidate
                );

                if (resetResult.sectionsReset > 0) {
                    updatedStageData.outline = {
                        ...updatedStageData.outline,
                        sections: resetResult.sections as unknown as Record<string, unknown>[],
                        completenessScore: resetResult.completenessScore,
                        lastEditedAt: now,
                        lastEditedFromStage: args.targetStage,
                    };
                    console.log(
                        `[resetOutlineOnRewind] target=${args.targetStage} sections_reset=${resetResult.sectionsReset} new_completeness=${resetResult.completenessScore}%`
                    );
                }
            } catch (err) {
                console.warn(`[resetOutlineOnRewind] SKIPPED: Error during reset for session=${args.sessionId}`, err);
            }
        }

        // Mark paperMemoryDigest entries as superseded
        const updatedDigest = markDigestAsSuperseded(
            session.paperMemoryDigest as Array<{ stage: string; decision: string; timestamp: number; superseded?: boolean }> | undefined,
            stagesToInvalidate
        );

        // Invalidate artifacts for affected stages
        const invalidatedArtifactIds = await invalidateArtifactsForStages(
            ctx as unknown as Parameters<typeof invalidateArtifactsForStages>[0],
            session.conversationId as unknown as string,
            stageData,
            stagesToInvalidate,
            args.targetStage
        );

        // Create rewindHistory record
        await ctx.db.insert("rewindHistory", {
            sessionId: args.sessionId,
            userId: args.userId,
            fromStage: currentStage,
            toStage: args.targetStage,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            invalidatedArtifactIds: invalidatedArtifactIds as any,
            invalidatedStages: stagesToInvalidate,
            createdAt: now,
        });

        // Update session
        await ctx.db.patch(args.sessionId, {
            currentStage: args.targetStage,
            stageStatus: "drafting",
            stageData: updatedStageData,
            paperMemoryDigest: updatedDigest,
            updatedAt: now,
        });

        return {
            success: true,
            previousStage: currentStage,
            newStage: args.targetStage,
            invalidatedStages: stagesToInvalidate,
            invalidatedArtifactIds,
        };
    },
});

/**
 * Query rewind history for a session.
 * Useful for debugging and audit trail.
 */
export const getRewindHistory = query({
    args: { sessionId: v.id("paperSessions") },
    handler: async (ctx, args) => {
        const authUser = await requireAuthUser(ctx);
        const session = await ctx.db.get(args.sessionId);
        if (!session || session.userId !== authUser._id) {
            return [];
        }
        return await ctx.db
            .query("rewindHistory")
            .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
            .order("desc")
            .collect();
    },
});
