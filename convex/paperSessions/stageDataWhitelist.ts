export const STAGE_KEY_WHITELIST: Record<string, string[]> = {
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
    pembaruan_abstrak: [
        "ringkasan", "ringkasanDetail", "ringkasanPenelitianBaru",
        "perubahanUtama", "keywordsBaru", "wordCount",
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

export function validateStageDataKeys(stage: string, data: Record<string, unknown>): string[] {
    const allowedKeys = STAGE_KEY_WHITELIST[stage];
    if (!allowedKeys) return [];

    const dataKeys = Object.keys(data);
    return dataKeys.filter((key) => !allowedKeys.includes(key));
}

// ============================================================================
// NESTED ARRAY SANITIZER
// ============================================================================
// AI models often hallucinate field names inside nested objects (e.g. "title"
// instead of "judul", "wordCount" string instead of "estimatedWordCount" number).
// Top-level whitelist only strips unknown top-level keys — nested objects pass
// through unsanitized, causing Convex strict schema validation errors.
//
// This sanitizer:
// 1. Maps common AI alias names to correct schema field names
// 2. Strips unknown nested fields
// 3. Coerces types where possible (string→number)
// ============================================================================

interface NestedFieldSchema {
    allowedKeys: string[];
    aliases: Record<string, string>;
    /** Keys where string values should be coerced to number */
    numericKeys?: string[];
}

/**
 * Nested schema definitions for array fields that contain objects.
 * Key format: "arrayFieldName" (matches the top-level key in stageData)
 */
const NESTED_ARRAY_SCHEMA: Record<string, NestedFieldSchema> = {
    // outline.sections
    sections: {
        allowedKeys: ["id", "judul", "level", "parentId", "estimatedWordCount", "status"],
        aliases: {
            title: "judul",
            name: "judul",
            wordCount: "estimatedWordCount",
            word_count: "estimatedWordCount",
            estimated_word_count: "estimatedWordCount",
        },
        numericKeys: ["level", "estimatedWordCount"],
    },
    // hasil.dataPoints
    dataPoints: {
        allowedKeys: ["label", "value", "unit", "note"],
        aliases: { name: "label", description: "note" },
    },
    // daftar_pustaka.entries
    entries: {
        allowedKeys: [
            "title", "authors", "year", "url", "publishedAt", "doi",
            "inTextCitation", "fullReference", "sourceStage", "isComplete",
        ],
        aliases: { author: "authors", source: "url", citation: "inTextCitation" },
        numericKeys: ["year", "publishedAt"],
    },
    // lampiran.items
    items: {
        allowedKeys: ["label", "judul", "tipe", "konten", "referencedInSections"],
        aliases: { title: "judul", type: "tipe", content: "konten" },
    },
    // judul.opsiJudul
    opsiJudul: {
        allowedKeys: ["judul", "keywordsCovered", "coverageScore"],
        aliases: { title: "judul", keywords: "keywordsCovered", score: "coverageScore" },
        numericKeys: ["coverageScore"],
    },
    // sitasiAPA (pendahuluan)
    sitasiAPA: {
        allowedKeys: ["inTextCitation", "fullReference", "url"],
        aliases: { citation: "inTextCitation", reference: "fullReference" },
    },
    // sitasiTambahan (diskusi)
    sitasiTambahan: {
        allowedKeys: ["inTextCitation", "fullReference", "url", "isAdditional"],
        aliases: { citation: "inTextCitation", reference: "fullReference" },
    },
    // referensi (tinjauan_literatur)
    referensi: {
        allowedKeys: ["title", "authors", "year", "url", "publishedAt", "inTextCitation", "isFromPhase1"],
        aliases: { author: "authors", citation: "inTextCitation" },
        numericKeys: ["year", "publishedAt"],
    },
    // referensiAwal (gagasan)
    referensiAwal: {
        allowedKeys: ["title", "authors", "year", "url", "publishedAt"],
        aliases: { author: "authors" },
        numericKeys: ["year", "publishedAt"],
    },
    // referensiPendukung (topik)
    referensiPendukung: {
        allowedKeys: ["title", "authors", "year", "url", "publishedAt"],
        aliases: { author: "authors" },
        numericKeys: ["year", "publishedAt"],
    },
};

/**
 * Coerce a string value to number if possible.
 * Handles ranges like "150-250" by taking the midpoint.
 */
function coerceToNumber(value: unknown): number | undefined {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return undefined;

    const trimmed = value.trim();

    // Handle range format like "150-250" → take midpoint
    const rangeMatch = trimmed.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (rangeMatch) {
        const low = parseInt(rangeMatch[1], 10);
        const high = parseInt(rangeMatch[2], 10);
        return Math.round((low + high) / 2);
    }

    const num = Number(trimmed);
    return isNaN(num) ? undefined : num;
}

/**
 * Sanitize nested objects inside array fields.
 * - Maps alias field names to correct schema names
 * - Strips unknown nested fields
 * - Coerces string→number where schema expects number
 *
 * Returns the sanitized data (mutates nothing).
 */
export function sanitizeNestedArrayFields(
    data: Record<string, unknown>
): { sanitized: Record<string, unknown>; nestedDropped: string[] } {
    const sanitized: Record<string, unknown> = { ...data };
    const nestedDropped: string[] = [];

    for (const [fieldName, fieldValue] of Object.entries(data)) {
        const schema = NESTED_ARRAY_SCHEMA[fieldName];
        if (!schema || !Array.isArray(fieldValue)) continue;

        sanitized[fieldName] = fieldValue
            .filter((item): item is Record<string, unknown> =>
                item !== null && typeof item === "object" && !Array.isArray(item)
            )
            .map((item) => {
                const cleaned: Record<string, unknown> = {};

                for (const [key, val] of Object.entries(item)) {
                    // Resolve alias first
                    const resolvedKey = schema.aliases[key] ?? key;

                    // Skip unknown keys
                    if (!schema.allowedKeys.includes(resolvedKey)) {
                        nestedDropped.push(`${fieldName}[].${key}`);
                        continue;
                    }

                    // Coerce numeric fields
                    if (schema.numericKeys?.includes(resolvedKey)) {
                        const num = coerceToNumber(val);
                        if (num !== undefined) {
                            cleaned[resolvedKey] = num;
                        }
                        // Drop if cannot coerce to number
                        continue;
                    }

                    // Strip null/undefined
                    if (val === null || val === undefined) continue;

                    cleaned[resolvedKey] = val;
                }

                return cleaned;
            });
    }

    return { sanitized, nestedDropped };
}
