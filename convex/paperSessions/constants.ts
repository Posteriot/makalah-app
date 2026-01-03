export const STAGE_ORDER = [
    "gagasan",
    "topik",
    "abstrak",
    "pendahuluan",
    "tinjauan_literatur",
    "metodologi",
    "hasil",
    "diskusi",
    "kesimpulan",
    "daftar_pustaka",
    "lampiran",
    "judul",
    "outline",
    "elaborasi",
] as const;

export type PaperStageId = typeof STAGE_ORDER[number];

export function getNextStage(current: PaperStageId): PaperStageId | "completed" {
    const currentIndex = STAGE_ORDER.indexOf(current);
    if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
        return "completed";
    }
    return STAGE_ORDER[currentIndex + 1];
}

export function getPreviousStage(current: PaperStageId): PaperStageId | null {
    const currentIndex = STAGE_ORDER.indexOf(current);
    if (currentIndex <= 0) {
        return null;
    }
    return STAGE_ORDER[currentIndex - 1];
}

export function getStageNumber(stage: PaperStageId | "completed"): number {
    if (stage === "completed") return STAGE_ORDER.length;
    return STAGE_ORDER.indexOf(stage) + 1;
}

export function getStageLabel(stage: PaperStageId | "completed"): string {
    if (stage === "completed") return "Selesai";

    const labels: Record<PaperStageId, string> = {
        gagasan: "Gagasan Paper",
        topik: "Penentuan Topik",
        abstrak: "Penyusunan Abstrak",
        pendahuluan: "Pendahuluan",
        tinjauan_literatur: "Tinjauan Literatur",
        metodologi: "Metodologi",
        hasil: "Hasil Penelitian",
        diskusi: "Diskusi",
        kesimpulan: "Kesimpulan",
        daftar_pustaka: "Daftar Pustaka",
        lampiran: "Lampiran",
        judul: "Pemilihan Judul",
        outline: "Menyusun Outline",
        elaborasi: "Elaborasi Outline",
    };
    return labels[stage];
}
