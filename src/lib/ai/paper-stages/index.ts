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
    PEMBARUAN_ABSTRAK_INSTRUCTIONS,
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

        // Phase 5: Refinement
        case "pembaruan_abstrak":
            return PEMBARUAN_ABSTRAK_INSTRUCTIONS;

        // Phase 6: Finalization
        case "daftar_pustaka":
            return DAFTAR_PUSTAKA_INSTRUCTIONS;
        case "lampiran":
            return LAMPIRAN_INSTRUCTIONS;
        case "judul":
            return JUDUL_INSTRUCTIONS;
        case "completed":
            return `STAGE: Completed — Final baseline reached. Reopenable anytime.

All paper writing stages have been completed and approved. This is the final baseline, but the user can still:
- Review any artifact from the sidebar conversation history
- Request revision of any specific stage or section
- Ask informational questions about progress, export, or content

DEFAULT CLOSING RESPONSE (use when user says generic "lanjut", "oke", "setuju", or similar):
Respond with a brief message (max 2 short paragraphs) that conveys:
- All stages are completed and approved
- Sidebar conversation history stores artifacts from every stage (gagasan through judul)
- Sidebar progress timeline is fully complete
- User can request revision of any specific section if needed

Golden phrasing:
"Semua tahap penyusunan makalah sudah selesai dan disetujui. Riwayat percakapan di sidebar menyimpan artifact dari setiap tahap, mulai dari gagasan awal sampai pemilihan judul. Linimasa progres juga sudah penuh, menandakan seluruh tahapan penyusunan makalah telah terlewati. Jika kamu ingin mengubah bagian tertentu, sebutkan bagian yang ingin direvisi."

INFORMATIONAL FOLLOW-UP (use when user asks about artifacts, progress, export, sidebar):
- Answer concisely and helpfully
- Artifact re-display requests are handled by the system; you may use readArtifact to inspect content when answering questions
- Keep response focused on the question

REVISION REQUEST (use when user asks to revise/edit a specific section):
- Help identify which stage/artifact needs revision
- You may use readArtifact to inspect current content if needed for the revision
- Guide the user on how to proceed with revision

GENERAL RULES for completed stage:
- Do NOT output a yaml-spec choice card
- Do NOT mention internal processes, validation mechanics, retries, sync state, or technical workflow details
- Do NOT claim the user can download the full paper directly from artifact history
- Completed is a reopenable checkpoint, NOT a terminal locked state`;
        default:
            // TypeScript exhaustive check - should never reach here
            return `Stage "${stage}" is not recognized. Continue assisting the user academically.`;
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

// Phase 5: Refinement
export { PEMBARUAN_ABSTRAK_INSTRUCTIONS } from "./finalization";

// Phase 6: Finalization
export {
    DAFTAR_PUSTAKA_INSTRUCTIONS,
    LAMPIRAN_INSTRUCTIONS,
    JUDUL_INSTRUCTIONS
} from "./finalization";

// Re-export formatStageData helper
export { formatStageData, formatArtifactSummaries } from "./formatStageData";
