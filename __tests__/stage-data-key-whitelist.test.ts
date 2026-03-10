import { describe, it, expect } from "vitest";

// Copy of whitelist + validation logic from convex/paperSessions.ts
// (not exported, so duplicated here for isolated testing)

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

function validateStageDataKeys(stage: string, data: Record<string, unknown>): string[] {
    const allowedKeys = STAGE_KEY_WHITELIST[stage];
    if (!allowedKeys) return [];
    const dataKeys = Object.keys(data);
    return dataKeys.filter(key => !allowedKeys.includes(key));
}

describe("validateStageDataKeys (W4 — Dropped Keys)", () => {
    it("should return empty array when all keys are valid", () => {
        const data = { ringkasan: "test", ideKasar: "ide", analisis: "ok" };
        const result = validateStageDataKeys("gagasan", data);
        expect(result).toEqual([]);
    });

    it("should detect unknown keys", () => {
        const data = {
            ringkasan: "test",
            ideKasar: "ide",
            unknownField: "should be dropped",
            anotherBadKey: 42,
        };
        const result = validateStageDataKeys("gagasan", data);
        expect(result).toEqual(["unknownField", "anotherBadKey"]);
    });

    it("should return empty array for unknown stage (let other guards handle)", () => {
        const data = { anything: "goes" };
        const result = validateStageDataKeys("nonexistent_stage", data);
        expect(result).toEqual([]);
    });

    it("should validate keys per stage correctly", () => {
        // 'definitif' is valid for topik but not for gagasan
        const data = { definitif: "topik definitif" };
        expect(validateStageDataKeys("topik", data)).toEqual([]);
        expect(validateStageDataKeys("gagasan", data)).toEqual(["definitif"]);
    });

    it("should allow common fields across all stages", () => {
        const commonFields = {
            ringkasan: "summary",
            ringkasanDetail: "detail",
            webSearchReferences: [],
            artifactId: "abc123",
            validatedAt: 1234567890,
            revisionCount: 2,
        };

        const stages = Object.keys(STAGE_KEY_WHITELIST);
        for (const stage of stages) {
            const result = validateStageDataKeys(stage, commonFields);
            expect(result).toEqual([]);
        }
    });

    it("should catch AI hallucinated keys like 'summary' or 'references'", () => {
        const aiHallucinatedData = {
            ringkasan: "valid",
            summary: "AI sent English key",
            references: [{ url: "https://example.com" }],
            notes: "extra field",
        };
        const result = validateStageDataKeys("gagasan", aiHallucinatedData);
        expect(result).toContain("summary");
        expect(result).toContain("references");
        expect(result).toContain("notes");
        expect(result).not.toContain("ringkasan");
    });

    it("should handle empty data object", () => {
        const result = validateStageDataKeys("gagasan", {});
        expect(result).toEqual([]);
    });

    it("should validate all 13 stages exist in whitelist", () => {
        const expectedStages = [
            "gagasan", "topik", "outline", "abstrak", "pendahuluan",
            "tinjauan_literatur", "metodologi", "hasil", "diskusi",
            "kesimpulan", "daftar_pustaka", "lampiran", "judul"
        ];
        for (const stage of expectedStages) {
            expect(STAGE_KEY_WHITELIST[stage]).toBeDefined();
            expect(STAGE_KEY_WHITELIST[stage].length).toBeGreaterThan(0);
        }
    });
});
