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
    "pembaruan_abstrak",
    "daftar_pustaka",
    "lampiran",
    "judul",
];

// Must match src/lib/ai/stage-skill-contracts.ts — only gagasan + tinjauan_literatur are active
export const ACTIVE_SEARCH_STAGES: PaperStageId[] = [
    "gagasan",
    "tinjauan_literatur",
];

export const PASSIVE_SEARCH_STAGES: PaperStageId[] = [
    "topik",
    "outline",
    "abstrak",
    "pendahuluan",
    "metodologi",
    "hasil",
    "diskusi",
    "kesimpulan",
    "pembaruan_abstrak",
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
