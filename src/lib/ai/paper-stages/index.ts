/**
 * Paper Stage Instructions Module
 *
 * Centralized module for AI stage-specific instructions.
 * Simplified approach: same instructions for all statuses,
 * revision context handled in paper-mode-prompt.ts
 */

import { GAGASAN_INSTRUCTIONS, TOPIK_INSTRUCTIONS } from "./foundation";
import {
    ABSTRAK_INSTRUCTIONS,
    PENDAHULUAN_INSTRUCTIONS,
    TINJAUAN_LITERATUR_INSTRUCTIONS,
    METODOLOGI_INSTRUCTIONS
} from "./core";
import type { PaperStageId } from "../../../../convex/paperSessions/constants";

/**
 * Get stage-specific instructions.
 * Returns goal-oriented instructions for the given stage.
 */
export function getStageInstructions(stage: PaperStageId | "completed"): string {
    switch (stage) {
        case "gagasan":
            return GAGASAN_INSTRUCTIONS;
        case "topik":
            return TOPIK_INSTRUCTIONS;
        case "abstrak":
            return ABSTRAK_INSTRUCTIONS;
        case "pendahuluan":
            return PENDAHULUAN_INSTRUCTIONS;
        case "tinjauan_literatur":
            return TINJAUAN_LITERATUR_INSTRUCTIONS;
        case "metodologi":
            return METODOLOGI_INSTRUCTIONS;
        case "completed":
            return "Paper telah selesai. Semua tahap sudah divalidasi.";
        default:
            return `Tahap "${stage}" sedang dalam pengembangan. Tetap bantu user secara akademik.`;
    }
}

// Re-export instructions for direct access if needed
export { GAGASAN_INSTRUCTIONS, TOPIK_INSTRUCTIONS } from "./foundation";
export {
    ABSTRAK_INSTRUCTIONS,
    PENDAHULUAN_INSTRUCTIONS,
    TINJAUAN_LITERATUR_INSTRUCTIONS,
    METODOLOGI_INSTRUCTIONS
} from "./core";

// Re-export formatStageData helper
export { formatStageData } from "./formatStageData";
