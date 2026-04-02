import type { PaperStageId } from "../../../convex/paperSessions/constants";

export const ACTIVE_SEARCH_STAGES: PaperStageId[] = [
    "gagasan", "tinjauan_literatur",
];

export const PASSIVE_SEARCH_STAGES: PaperStageId[] = [
    "topik", "outline", "abstrak", "pendahuluan", "metodologi",
    "hasil", "diskusi", "kesimpulan",
    "pembaruan_abstrak", "daftar_pustaka", "lampiran", "judul",
];

export function getExpectedSearchPolicy(stage: PaperStageId): "active" | "passive" {
    return ACTIVE_SEARCH_STAGES.includes(stage) ? "active" : "passive";
}
