import type { PaperStageId } from "../paperSessions/constants";

export const STAGE_SCOPE_VALUES: PaperStageId[] = [
    "gagasan",
    "topik",
    "outline",
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
];

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

export function getExpectedSearchPolicy(stageScope: PaperStageId): "active" | "passive" {
    if (ACTIVE_SEARCH_STAGES.includes(stageScope)) return "active";
    return "passive";
}

export function toSkillId(stageScope: PaperStageId): string {
    return `${stageScope.replace(/_/g, "-")}-skill`;
}
