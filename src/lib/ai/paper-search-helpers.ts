/**
 * Paper Search Helpers
 *
 * Data-based helpers and system notes for the paper workflow search system.
 * Search mode decisions are made by the LLM router (decideWebSearchMode in route.ts).
 * This file provides:
 * - Research completeness checks (data-based, used as LLM router context)
 * - System notes injected based on search mode decisions
 * - Utility functions for stage data checks
 */

import type { PaperStageId } from "../../../convex/paperSessions/constants"

/**
 * Stage research requirements - defines what data each ACTIVE stage needs
 */
export const STAGE_RESEARCH_REQUIREMENTS: Partial<Record<PaperStageId, {
    requiredField: string
    minCount: number
    description: string
}>> = {
    gagasan: {
        requiredField: "referensiAwal",
        minCount: 2,
        description: "referensi awal untuk mendukung kelayakan ide"
    },
    topik: {
        requiredField: "referensiPendukung",
        minCount: 3,
        description: "referensi pendukung untuk memperkuat topik"
    },
    tinjauan_literatur: {
        requiredField: "referensi",
        minCount: 5,
        description: "referensi untuk tinjauan literatur"
    },
    pendahuluan: {
        requiredField: "sitasiAPA",
        minCount: 2,
        description: "sitasi APA untuk mendukung latar belakang"
    },
    diskusi: {
        requiredField: "sitasiTambahan",
        minCount: 2,
        description: "sitasi tambahan untuk perbandingan literatur"
    },
}

/**
 * Check if current stage's research requirement is incomplete
 */
export const isStageResearchIncomplete = (
    stageData: Record<string, unknown> | undefined,
    stage: PaperStageId
): { incomplete: boolean; requirement?: string } => {
    const req = STAGE_RESEARCH_REQUIREMENTS[stage]
    if (!req) return { incomplete: false }

    const currentStageData = stageData?.[stage] as Record<string, unknown> | undefined
    const fieldData = currentStageData?.[req.requiredField]

    if (!Array.isArray(fieldData) || fieldData.length < req.minCount) {
        return {
            incomplete: true,
            requirement: `Butuh minimal ${req.minCount} ${req.description}`
        }
    }

    return { incomplete: false }
}

/**
 * System note when search is disabled in paper mode
 * Prevents AI from promising to search when it can't
 */
export const PAPER_TOOLS_ONLY_NOTE = `
═══════════════════════════════════════════════════════════════════
FUNCTION TOOLS MODE (NO WEB SEARCH)
═══════════════════════════════════════════════════════════════════

TECHNICAL CONSTRAINT:
- Web search is NOT available this turn.
- Do NOT promise to search for references/literature.
- Available tools: updateStageData, submitStageForValidation, createArtifact, updateArtifact.

IF FACTUAL DATA/REFERENCES ARE NEEDED:
- Ask user to explicitly request a search.
- Example: "To continue, I need to search for references. Shall I search for them?"
- Do NOT fabricate/hallucinate references — this is FORBIDDEN.
═══════════════════════════════════════════════════════════════════`

/**
 * System note when research is incomplete for current stage
 * Strong reminder to search for references
 */
export const getResearchIncompleteNote = (stage: string, requirement: string): string => `
═══════════════════════════════════════════════════════════════════
ATTENTION: STAGE "${stage.toUpperCase()}" RESEARCH INCOMPLETE
═══════════════════════════════════════════════════════════════════

STATUS: ${requirement}

MANDATORY INSTRUCTIONS:
1. Express your intent to search for relevant references in your response
2. ASK the user to confirm — search executes on the NEXT user turn
3. Do NOT say "please wait" — the user MUST send a message for search to run
4. Do NOT continue discussion without requesting a search first
5. Do NOT fabricate/hallucinate references — this is FORBIDDEN
6. After search results arrive, discuss findings with user

IF YOU SKIP THE SEARCH, YOU ARE VIOLATING THE PAPER WORKFLOW PROTOCOL.
═══════════════════════════════════════════════════════════════════`

/**
 * Concise state note for function tools mode (after search is done)
 * Informs AI that it should use function tools, not web search
 */
export const getFunctionToolsModeNote = (searchInfo: string): string => `
══════════════════════════════════════════════════
MODE: FUNCTION_TOOLS | ${searchInfo}
AVAILABLE: createArtifact, updateStageData, submitStageForValidation
TASK: Process results and continue workflow with user
══════════════════════════════════════════════════`
