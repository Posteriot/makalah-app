import type { LanguageModel } from "ai"

import type { PaperStageId } from "../../../convex/paperSessions/constants"

export type CompletedSessionHandling = "short_circuit_closing" | "allow_normal_ai" | "server_owned_artifact_recall"

export interface CompletedSessionDecision {
    handling: CompletedSessionHandling
    source: "router_intent" | "fallback_heuristic"
    reason: string
}

// Fallback heuristic patterns — minimal, defensive.
// Only explicit revision verbs (NOT stage names like judul, abstrak, etc.)
const REVISION_VERB_PATTERN =
    /\b(revisi|ubah|edit|koreksi|perbaiki)\b/i

const INFORMATIONAL_PATTERN =
    /\b(di\s*mana|bagaimana|export|unduh|download|apa\b|apakah)\b/i

const CONTINUE_LIKE_PATTERN =
    /^(lanjut|oke?|ya|setuju|ok|next|done|selesai|yes|yep|yap|sip|gas|mantap|ayo|go|continue)$/i

// ── Artifact recall detection ──
// Requires BOTH a display/show verb AND an artifact/stage target.
const RECALL_DISPLAY_VERB = /\b(lihat|tampilkan|munculkan|buka|tunjukkan|perlihatkan|show|open|display)\b/i
const RECALL_ARTIFACT_TARGET = /\b(artifact|artefak|gagasan|topik|outline|abstrak|pendahuluan|tinjauan.?literatur|metodologi|hasil|diskusi|kesimpulan|pembaruan.?abstrak|daftar.?pustaka|lampiran|judul)\b/i
// Question-form exclusion: if the input starts with a question word, it's informational, not recall.
const RECALL_QUESTION_EXCLUSION = /^(di\s*mana|bagaimana|apa\b|apakah|kenapa|mengapa)/i

/**
 * Check if user input is an explicit artifact recall request.
 * Requires display verb + artifact/stage target, excludes question forms.
 */
export function isArtifactRecallRequest(input: string): boolean {
    const normalized = input.trim()
    if (!normalized) return false
    if (RECALL_QUESTION_EXCLUSION.test(normalized)) return false
    return RECALL_DISPLAY_VERB.test(normalized) && RECALL_ARTIFACT_TARGET.test(normalized)
}

// ── Router reason recall hint ──
// Secondary semantic signal from the LLM router's reason text.
// Requires "artifact" + a retrieval verb in the reason string.
// NEVER used alone — always gated by question-form exclusion on user input.
const REASON_ARTIFACT_PATTERN = /\bartifact\b/i
const REASON_RETRIEVAL_PATTERN = /\b(retrieve|re-?display|display|show|previously generated artifact|existing artifact)\b/i

/**
 * Check if the router reason text hints at artifact retrieval intent.
 * This is a secondary signal — must be combined with user input guards.
 */
export function isArtifactRecallReason(reason: string): boolean {
    if (!reason) return false
    return REASON_ARTIFACT_PATTERN.test(reason) && REASON_RETRIEVAL_PATTERN.test(reason)
}

/**
 * Resolve which stage the user wants to recall an artifact from.
 * Returns null if ambiguous (e.g., "lihat artifact" without a stage name).
 */
export function resolveRecallTargetStage(input: string): PaperStageId | null {
    const normalized = input.trim().toLowerCase()

    // Check compound names first (must come before single-word checks)
    const compoundMap: Array<[RegExp, PaperStageId]> = [
        [/tinjauan.?literatur/, "tinjauan_literatur"],
        [/pembaruan.?abstrak/, "pembaruan_abstrak"],
        [/daftar.?pustaka/, "daftar_pustaka"],
    ]
    for (const [pattern, stageId] of compoundMap) {
        if (pattern.test(normalized)) return stageId
    }

    // Single-word stage names
    const singleMap: Array<[string, PaperStageId]> = [
        ["gagasan", "gagasan"],
        ["topik", "topik"],
        ["outline", "outline"],
        ["abstrak", "abstrak"],
        ["pendahuluan", "pendahuluan"],
        ["metodologi", "metodologi"],
        ["hasil", "hasil"],
        ["diskusi", "diskusi"],
        ["kesimpulan", "kesimpulan"],
        ["lampiran", "lampiran"],
        ["judul", "judul"],
    ]
    for (const [keyword, stageId] of singleMap) {
        if (new RegExp(`\\b${keyword}\\b`).test(normalized)) return stageId
    }

    // "artifact" or "artefak" mentioned but no stage name → ambiguous
    return null
}

/**
 * Resolve how a completed-session user message should be handled.
 *
 * Priority:
 * 1. Router intent (if available) — primary signal
 * 2. Fallback heuristic (regex) — last resort when router wasn't called or failed
 *
 * Dual-write mode: when `dualWriteModel` is provided, fires the semantic classifier
 * in the background and logs discrepancies. Regex result is ALWAYS returned —
 * classifier is shadow-only. This enables parity comparison without behavior change.
 */
export function resolveCompletedSessionHandling(args: {
    routerIntent?: string
    routerReason?: string
    lastUserContent: string
    hasChoiceInteractionEvent?: boolean
    dualWriteModel?: LanguageModel
}): CompletedSessionDecision {
    const { routerIntent, routerReason, lastUserContent, hasChoiceInteractionEvent, dualWriteModel } = args
    const normalized = typeof lastUserContent === "string" ? lastUserContent.trim() : ""

    // ── Regex decision (always runs, always returned) ──
    const regexResult = resolveViaRegex({ routerIntent, routerReason, normalized, hasChoiceInteractionEvent })

    // ── Dual-write: fire classifier only for paths being migrated ──
    // Only for: fallback heuristic path (excluding choiceInteractionEvent) + discussion refinement
    // NOT for: save_submit, sync_request, search, compile_daftar_pustaka, choiceInteractionEvent
    const isDualWriteRelevant = dualWriteModel && (
        (regexResult.source === "fallback_heuristic" && regexResult.reason !== "choice_interaction_event") ||
        (regexResult.source === "router_intent" && routerIntent === "discussion")
    )

    if (isDualWriteRelevant) {
        fireDualWriteComparison({
            regexDecision: regexResult,
            regexTargetStage: regexResult.handling === "server_owned_artifact_recall"
                ? resolveRecallTargetStage(normalized)
                : null,
            lastUserContent: normalized,
            routerReason,
            model: dualWriteModel,
        })
    }

    return regexResult
}

// ── Internal: existing regex logic (unchanged behavior) ──

function resolveViaRegex(args: {
    routerIntent?: string
    routerReason?: string
    normalized: string
    hasChoiceInteractionEvent?: boolean
}): CompletedSessionDecision {
    const { routerIntent, routerReason, normalized, hasChoiceInteractionEvent } = args

    // ── Router intent path (primary) ──
    if (routerIntent) {
        if (routerIntent === "save_submit" || routerIntent === "sync_request") {
            return {
                handling: "short_circuit_closing",
                source: "router_intent",
                reason: routerIntent,
            }
        }

        if (
            routerIntent === "discussion" ||
            routerIntent === "search" ||
            routerIntent === "compile_daftar_pustaka"
        ) {
            // Within discussion intent, check for artifact recall requests.
            // Two signals: (1) regex on user input, (2) router reason semantic hint.
            // Both are gated by question-form exclusion to prevent false positives.
            if (routerIntent === "discussion" && !RECALL_QUESTION_EXCLUSION.test(normalized)) {
                if (isArtifactRecallRequest(normalized)) {
                    return {
                        handling: "server_owned_artifact_recall",
                        source: "router_intent",
                        reason: "artifact_recall",
                    }
                }
                // Secondary: router reason hints at artifact retrieval
                // Only when user input mentions an artifact/stage target (not bare questions)
                if (routerReason && isArtifactRecallReason(routerReason) && RECALL_ARTIFACT_TARGET.test(normalized)) {
                    return {
                        handling: "server_owned_artifact_recall",
                        source: "router_intent",
                        reason: "artifact_recall_from_reason",
                    }
                }
            }
            return {
                handling: "allow_normal_ai",
                source: "router_intent",
                reason: routerIntent,
            }
        }

        // Unknown intent type from router — treat as allow to be safe
        return {
            handling: "allow_normal_ai",
            source: "router_intent",
            reason: `unknown_router_intent:${routerIntent}`,
        }
    }

    // ── Fallback heuristic path (no router intent available) ──

    // Choice interaction events (structured UI choices) → short-circuit
    if (hasChoiceInteractionEvent) {
        return {
            handling: "short_circuit_closing",
            source: "fallback_heuristic",
            reason: "choice_interaction_event",
        }
    }

    // Artifact recall requests → server-owned recall
    if (isArtifactRecallRequest(normalized)) {
        return {
            handling: "server_owned_artifact_recall",
            source: "fallback_heuristic",
            reason: "artifact_recall",
        }
    }

    // Explicit revision verbs → allow normal AI
    if (REVISION_VERB_PATTERN.test(normalized)) {
        return {
            handling: "allow_normal_ai",
            source: "fallback_heuristic",
            reason: "revision_verb",
        }
    }

    // Explicit informational patterns → allow normal AI
    if (INFORMATIONAL_PATTERN.test(normalized)) {
        return {
            handling: "allow_normal_ai",
            source: "fallback_heuristic",
            reason: "informational_pattern",
        }
    }

    // Short continue-like prompts or empty → short-circuit
    if (!normalized || CONTINUE_LIKE_PATTERN.test(normalized)) {
        return {
            handling: "short_circuit_closing",
            source: "fallback_heuristic",
            reason: "continue_like_prompt",
        }
    }

    // Default: anything else unrecognized → short-circuit
    return {
        handling: "short_circuit_closing",
        source: "fallback_heuristic",
        reason: "unrecognized_default",
    }
}

// ── Dual-write: fire-and-forget classifier comparison ──

function fireDualWriteComparison(args: {
    regexDecision: CompletedSessionDecision
    regexTargetStage: PaperStageId | null
    lastUserContent: string
    routerReason?: string
    model: LanguageModel
}): void {
    const { regexDecision, regexTargetStage, lastUserContent, routerReason, model } = args

    // Dynamic import to avoid loading classifier module when not in dual-write mode
    import("./classifiers/completed-session-classifier")
        .then(({ classifyCompletedSessionIntent }) =>
            classifyCompletedSessionIntent({ lastUserContent, routerReason, model })
        )
        .then((classifierResult) => {
            if (!classifierResult) {
                console.info("[completed-session][dual-write] classifier returned null (error/timeout)")
                return
            }

            const c = classifierResult.output
            const r = regexDecision
            const discrepancies: string[] = []

            // Compare handling
            if (c.handling !== r.handling) {
                discrepancies.push(`handling: regex=${r.handling} classifier=${c.handling}`)
            }

            // Compare targetStage (only meaningful for artifact recall)
            if (r.handling === "server_owned_artifact_recall" || c.handling === "server_owned_artifact_recall") {
                if (c.targetStage !== regexTargetStage) {
                    discrepancies.push(`targetStage: regex=${regexTargetStage} classifier=${c.targetStage}`)
                }
            }

            const inputSnippet = lastUserContent.slice(0, 80)

            if (discrepancies.length > 0) {
                console.info(
                    `[completed-session][dual-write] DISCREPANCY ${discrepancies.join(" | ")} ` +
                    `intent=${c.intent} confidence=${c.confidence} needsClarification=${c.needsClarification} ` +
                    `input="${inputSnippet}"`
                )
            } else {
                console.info(
                    `[completed-session][dual-write] MATCH handling=${r.handling} ` +
                    `intent=${c.intent} confidence=${c.confidence} input="${inputSnippet}"`
                )
            }
        })
        .catch((err) => {
            console.error("[completed-session][dual-write] classifier comparison failed:", err)
        })
}

export function getCompletedSessionClosingMessage(): string {
    return (
        "Semua tahap penyusunan makalah sudah selesai dan disetujui.\n\n" +
        "Riwayat percakapan di sidebar menyimpan artifact dari setiap tahap, mulai dari gagasan awal sampai pemilihan judul. " +
        "Linimasa progres juga sudah penuh, menandakan seluruh tahapan penyusunan makalah telah terlewati.\n\n" +
        "Jika kamu ingin mengubah bagian tertentu, sebutkan bagian yang ingin direvisi dan saya bantu buka alurnya kembali."
    )
}
