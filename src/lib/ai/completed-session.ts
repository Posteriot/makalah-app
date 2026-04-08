import type { LanguageModel } from "ai"

import type { PaperStageId } from "../../../convex/paperSessions/constants"
import { classifyCompletedSessionIntent } from "./classifiers/completed-session-classifier"

export type CompletedSessionHandling = "short_circuit_closing" | "allow_normal_ai" | "server_owned_artifact_recall"

export interface CompletedSessionDecision {
    handling: CompletedSessionHandling | "clarify"
    source: "router_intent" | "classifier" | "deterministic"
    reason: string
    targetStage?: PaperStageId | null
}

/**
 * Resolve how a completed-session user message should be handled.
 *
 * Decision hierarchy:
 * 1. Deterministic checks (empty input, choice interaction, deterministic router intents)
 * 2. Router intent for non-discussion intents (search, compile_daftar_pustaka, unknown)
 * 3. Semantic classifier for: discussion refinement + fallback path
 *
 * Classifier replaces all regex heuristics (REVISION_VERB_PATTERN, INFORMATIONAL_PATTERN,
 * CONTINUE_LIKE_PATTERN, RECALL_DISPLAY_VERB, RECALL_ARTIFACT_TARGET, etc.)
 */
export async function resolveCompletedSessionHandling(args: {
    routerIntent?: string
    routerReason?: string
    lastUserContent: string
    hasChoiceInteractionEvent?: boolean
    model: LanguageModel
}): Promise<CompletedSessionDecision> {
    const { routerIntent, routerReason, lastUserContent, hasChoiceInteractionEvent, model } = args
    const normalized = typeof lastUserContent === "string" ? lastUserContent.trim() : ""

    // ── Deterministic checks (no classifier needed) ──

    // Empty/whitespace → short-circuit
    if (!normalized) {
        return {
            handling: "short_circuit_closing",
            source: "deterministic",
            reason: "empty_input",
        }
    }

    // Choice interaction events → short-circuit
    if (hasChoiceInteractionEvent) {
        return {
            handling: "short_circuit_closing",
            source: "deterministic",
            reason: "choice_interaction_event",
        }
    }

    // ── Router intent deterministic paths ──
    if (routerIntent) {
        if (routerIntent === "save_submit" || routerIntent === "sync_request") {
            return {
                handling: "short_circuit_closing",
                source: "router_intent",
                reason: routerIntent,
            }
        }

        // search and compile_daftar_pustaka → allow normal AI (no classifier needed)
        if (routerIntent === "search" || routerIntent === "compile_daftar_pustaka") {
            return {
                handling: "allow_normal_ai",
                source: "router_intent",
                reason: routerIntent,
            }
        }

        // Unknown router intent → allow normal AI (safe default)
        if (routerIntent !== "discussion") {
            return {
                handling: "allow_normal_ai",
                source: "router_intent",
                reason: `unknown_router_intent:${routerIntent}`,
            }
        }

        // routerIntent === "discussion" → fall through to classifier
    }

    // ── Classifier path (discussion refinement + fallback) ──
    const classifierResult = await classifyCompletedSessionIntent({
        lastUserContent: normalized,
        routerReason,
        model,
    })

    if (classifierResult) {
        const c = classifierResult.output
        return {
            handling: c.handling,
            source: "classifier",
            reason: `${c.intent}:${c.reason}`,
            targetStage: c.targetStage as PaperStageId | null,
        }
    }

    // Classifier failed → safe default
    return {
        handling: "allow_normal_ai",
        source: "classifier",
        reason: "classifier_error_fallback",
    }
}

export function getCompletedSessionClosingMessage(): string {
    return (
        "Semua tahap penyusunan makalah sudah selesai dan disetujui.\n\n" +
        "Riwayat percakapan di sidebar menyimpan artifact dari setiap tahap, mulai dari gagasan awal sampai pemilihan judul. " +
        "Linimasa progres juga sudah penuh, menandakan seluruh tahapan penyusunan makalah telah terlewati.\n\n" +
        "Jika kamu ingin mengubah bagian tertentu, sebutkan bagian yang ingin direvisi dan saya bantu buka alurnya kembali."
    )
}
