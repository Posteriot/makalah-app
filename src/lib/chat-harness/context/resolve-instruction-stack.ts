import type { ModelMessage } from "ai"
import type { PaperStageId } from "../../../../convex/paperSessions/constants"
import type { ExactSourceFollowupResolution } from "@/lib/ai/exact-source-followup"
import type { SkillContext } from "@/lib/ai/skills"
import { composeSkillInstructions } from "@/lib/ai/skills"
import {
    buildExactSourceInspectionSystemMessage,
    buildSourceProvenanceSystemMessage,
} from "@/lib/ai/exact-source-guardrails"
import { CHOICE_YAML_SYSTEM_PROMPT } from "@/lib/json-render/choice-yaml-prompt"
import type { InstructionStackEntry, ResolvedInstructionStack, RecentSource } from "./types"

// ────────────────────────────────────────────────────────────────
// Paper session slice — only the fields we read
// ────────────────────────────────────────────────────────────────

interface PaperSessionSlice {
    currentStage?: string
    stageStatus?: string
}

// ────────────────────────────────────────────────────────────────
// Params
// ────────────────────────────────────────────────────────────────

export interface ResolveInstructionStackParams {
    systemPrompt: string
    paperModePrompt: string | null
    fileContext: string
    attachmentAwarenessInstruction: string
    sourcesContext: string
    sourceInventoryContext: string
    exactSourceResolution: ExactSourceFollowupResolution
    shouldIncludeRawSourcesContext: boolean
    shouldIncludeExactInspectionSystemMessage: boolean
    shouldIncludeRecentSourceSkillInstructions: boolean
    recentSourcesList: RecentSource[]
    choiceContextNote: string | undefined
    freeTextContextNote: string | undefined
    isDraftingStage: boolean
    paperStageScope: PaperStageId | undefined
    paperSession: PaperSessionSlice | null
    paperModeActive: boolean
    currentStage: string | null
    conversationMessages: ModelMessage[]
}

// ────────────────────────────────────────────────────────────────
// Implementation
// ────────────────────────────────────────────────────────────────

function entry(content: string, source: string): InstructionStackEntry {
    return { role: "system", content, source }
}

/**
 * Assembles the ordered system instruction stack.
 *
 * The ordering must match route.ts fullMessagesBase (lines 622-710) exactly:
 *   1. Base system prompt
 *   2. Paper mode prompt
 *   3. File context
 *   4. Attachment awareness
 *   5. Raw sources context
 *   6. Source inventory context
 *   7. Exact source inspection rules
 *   8. Source provenance rules
 *   9. Recent-source skill instructions
 *  10. Choice / free-text context note
 *  11. Choice YAML system prompt (drafting stage)
 *  12. Review/finalization workflow discipline
 *  13. Completed session follow-up override
 */
export function resolveInstructionStack(
    params: ResolveInstructionStackParams,
): ResolvedInstructionStack {
    const entries: InstructionStackEntry[] = []

    // 1. Base system prompt
    entries.push(entry(params.systemPrompt, "base-prompt"))

    // 2. Paper mode prompt
    if (params.paperModePrompt) {
        entries.push(entry(params.paperModePrompt, "paper-mode"))
    }

    // 3. File context
    if (params.fileContext) {
        entries.push(entry(`File Context:\n\n${params.fileContext}`, "file-context"))
    }

    // 4. Attachment awareness
    if (params.attachmentAwarenessInstruction) {
        entries.push(entry(params.attachmentAwarenessInstruction, "attachment-awareness"))
    }

    // 5. Raw sources context (conditional on shouldIncludeRawSourcesContext)
    if (params.sourcesContext && params.shouldIncludeRawSourcesContext) {
        entries.push(entry(params.sourcesContext, "sources-context"))
    }

    // 6. Source inventory context
    if (params.sourceInventoryContext) {
        entries.push(entry(params.sourceInventoryContext, "source-inventory"))
    }

    // 7. Exact source inspection system message
    if (params.shouldIncludeExactInspectionSystemMessage) {
        const msg = buildExactSourceInspectionSystemMessage()
        entries.push(entry(msg.content, "exact-source-inspection"))
    }

    // 8. Source provenance rules (always injected)
    {
        const msg = buildSourceProvenanceSystemMessage()
        entries.push(entry(msg.content, "source-provenance"))
    }

    // 9. Recent-source skill instructions
    if (params.shouldIncludeRecentSourceSkillInstructions) {
        const skillContext: SkillContext = {
            isPaperMode: params.paperModeActive,
            currentStage: params.currentStage,
            hasRecentSources: true,
            availableSources: params.recentSourcesList,
        }
        const instr = composeSkillInstructions(skillContext)
        if (instr) {
            entries.push(entry(instr, "recent-source-skill"))
        }
    }

    // 10. Choice or free-text context note (mutually exclusive, choice takes priority)
    if (params.choiceContextNote) {
        entries.push(entry(params.choiceContextNote, "choice-context-note"))
    } else if (params.freeTextContextNote) {
        entries.push(entry(params.freeTextContextNote, "free-text-context-note"))
    }

    // 11. Choice YAML system prompt for drafting stages
    if (params.isDraftingStage) {
        entries.push(entry(CHOICE_YAML_SYSTEM_PROMPT, "choice-yaml-prompt"))
    }

    // 12. Review/finalization workflow discipline
    {
        const reviewEntry = buildReviewFinalizationEntry(
            params.paperStageScope,
            params.paperSession,
        )
        if (reviewEntry) {
            entries.push(reviewEntry)
        }
    }

    // 13. Completed session follow-up override
    if (params.paperSession?.currentStage === "completed") {
        entries.push(entry(
            "COMPLETED SESSION — FOLLOW-UP OVERRIDE:\n" +
            "The paper is completed. If the user asks a follow-up question, answer it.\n" +
            "Artifact re-display requests are handled by the system before reaching you.\n" +
            "For informational or revision follow-up questions that do reach you, answer concisely. You may use readArtifact only when you need to inspect artifact content for answering a question.\n" +
            "You MAY answer questions about artifacts, sidebar, progress, export.\n" +
            "You MAY help with revision if the user explicitly asks to revise a stage.\n" +
            "Keep answers concise. Do NOT output choice cards. Do NOT pretend the session is still in progress.\n" +
            "If the user's message is just a generic acknowledgment (oke, lanjut, setuju), use the default closing response from the completed stage instructions.",
            "completed-session-override",
        ))
    }

    return {
        entries,
        conversationMessages: params.conversationMessages,
    }
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function buildReviewFinalizationEntry(
    paperStageScope: PaperStageId | undefined,
    paperSession: PaperSessionSlice | null,
): InstructionStackEntry | null {
    if (!paperStageScope || !paperSession) return null

    const stage = paperStageScope
    const status = paperSession.stageStatus as string

    const isReviewFinalization = [
        "hasil", "diskusi", "kesimpulan", "pembaruan_abstrak",
        "daftar_pustaka", "lampiran", "judul",
    ].includes(stage)

    if (!isReviewFinalization) return null

    const lines: string[] = [
        "WORKFLOW RESPONSE DISCIPLINE (MANDATORY):",
        "- Do NOT narrate internal tool failures, retries, repair attempts, or technical diagnostics to the user.",
        "- Do NOT say 'mohon tunggu', 'ada kesalahan teknis', 'saya akan coba lagi', 'memperbaiki format', or similar.",
        "- If a tool fails but you recover in the same turn, present ONLY the successful outcome.",
        "- Only expose errors to the user when the turn cannot complete and user action is required.",
        "- Keep final response to 1-3 sentences maximum for workflow turns.",
    ]

    // Deterministic daftar_pustaka revision chain
    if (stage === "daftar_pustaka" && status === "revision") {
        lines.push(
            "DAFTAR PUSTAKA REVISION — EXACT CHAIN:",
            "1. compileDaftarPustaka({ mode: 'persist' })",
            "2. updateArtifact (system will auto-resolve artifact ID — supply any ID)",
            "3. submitStageForValidation()",
            "Do NOT deviate. Do NOT call createArtifact. Do NOT call compileDaftarPustaka({ mode: 'preview' }) in this turn.",
        )
    }

    return entry(lines.join("\n"), "review-finalization-discipline")
}
