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
