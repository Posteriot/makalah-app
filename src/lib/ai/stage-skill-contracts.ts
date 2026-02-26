import type { PaperStageId } from "../../../convex/paperSessions/constants";

export const ACTIVE_SEARCH_STAGES: PaperStageId[] = [
    "gagasan",
    "topik",
    "pendahuluan",
    "tinjauan_literatur",
    "metodologi",
    "diskusi",
];

export const PASSIVE_SEARCH_STAGES: PaperStageId[] = [
    "outline",
    "abstrak",
    "hasil",
    "kesimpulan",
    "daftar_pustaka",
    "lampiran",
    "judul",
];

export function stageToSkillId(stage: PaperStageId): string {
    return `${stage.replace(/_/g, "-")}-skill`;
}

export function getExpectedSearchPolicy(stage: PaperStageId): "active" | "passive" {
    return ACTIVE_SEARCH_STAGES.includes(stage) ? "active" : "passive";
}
