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
import {
    HASIL_INSTRUCTIONS,
    DISKUSI_INSTRUCTIONS,
    KESIMPULAN_INSTRUCTIONS
} from "./results";
import {
    DAFTAR_PUSTAKA_INSTRUCTIONS,
    LAMPIRAN_INSTRUCTIONS,
    JUDUL_INSTRUCTIONS,
    OUTLINE_INSTRUCTIONS
} from "./finalization";
import type { PaperStageId } from "../../../../convex/paperSessions/constants";

/**
 * Get stage-specific instructions.
 * Returns goal-oriented instructions for the given stage.
 */
export function getStageInstructions(stage: PaperStageId | "completed"): string {
    switch (stage) {
        // Phase 1: Foundation
        case "gagasan":
            return GAGASAN_INSTRUCTIONS;
        case "topik":
            return TOPIK_INSTRUCTIONS;

        // Phase 2: Outline
        case "outline":
            return OUTLINE_INSTRUCTIONS;

        // Phase 3: Core
        case "abstrak":
            return ABSTRAK_INSTRUCTIONS;
        case "pendahuluan":
            return PENDAHULUAN_INSTRUCTIONS;
        case "tinjauan_literatur":
            return TINJAUAN_LITERATUR_INSTRUCTIONS;
        case "metodologi":
            return METODOLOGI_INSTRUCTIONS;

        // Phase 4: Results
        case "hasil":
            return HASIL_INSTRUCTIONS;
        case "diskusi":
            return DISKUSI_INSTRUCTIONS;
        case "kesimpulan":
            return KESIMPULAN_INSTRUCTIONS;

        // Phase 5: Finalization
        case "daftar_pustaka":
            return DAFTAR_PUSTAKA_INSTRUCTIONS;
        case "lampiran":
            return LAMPIRAN_INSTRUCTIONS;
        case "judul":
            return JUDUL_INSTRUCTIONS;
        case "completed":
            return "Paper telah selesai. Semua tahap sudah divalidasi.";
        default:
            // TypeScript exhaustive check - should never reach here
            return `Tahap "${stage}" tidak dikenal. Tetap bantu user secara akademik.`;
    }
}

// Re-export instructions for direct access if needed
// Phase 1: Foundation
export { GAGASAN_INSTRUCTIONS, TOPIK_INSTRUCTIONS } from "./foundation";

// Phase 2: Core
export {
    ABSTRAK_INSTRUCTIONS,
    PENDAHULUAN_INSTRUCTIONS,
    TINJAUAN_LITERATUR_INSTRUCTIONS,
    METODOLOGI_INSTRUCTIONS
} from "./core";

// Phase 3: Results
export {
    HASIL_INSTRUCTIONS,
    DISKUSI_INSTRUCTIONS,
    KESIMPULAN_INSTRUCTIONS
} from "./results";

// Phase 4: Outline
export { OUTLINE_INSTRUCTIONS } from "./finalization";

// Phase 5: Finalization
export {
    DAFTAR_PUSTAKA_INSTRUCTIONS,
    LAMPIRAN_INSTRUCTIONS,
    JUDUL_INSTRUCTIONS
} from "./finalization";

// Re-export formatStageData helper
export { formatStageData } from "./formatStageData";
