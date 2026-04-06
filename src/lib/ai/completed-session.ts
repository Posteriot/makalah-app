export type CompletedSessionHandling = "short_circuit_closing" | "allow_normal_ai"

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

/**
 * Resolve how a completed-session user message should be handled.
 *
 * Priority:
 * 1. Router intent (if available) — primary signal
 * 2. Fallback heuristic (regex) — last resort when router wasn't called or failed
 */
export function resolveCompletedSessionHandling(args: {
    routerIntent?: string
    lastUserContent: string
    hasChoiceInteractionEvent?: boolean
}): CompletedSessionDecision {
    const { routerIntent, lastUserContent, hasChoiceInteractionEvent } = args
    const normalized = typeof lastUserContent === "string" ? lastUserContent.trim() : ""

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

export function getCompletedSessionClosingMessage(): string {
    return (
        "Semua tahap penyusunan makalah sudah selesai dan disetujui.\n\n" +
        "Riwayat percakapan di sidebar menyimpan artifact dari setiap tahap, mulai dari gagasan awal sampai pemilihan judul. " +
        "Linimasa progres juga sudah penuh, menandakan seluruh tahapan penyusunan makalah telah terlewati.\n\n" +
        "Jika kamu ingin mengubah bagian tertentu, sebutkan bagian yang ingin direvisi dan saya bantu buka alurnya kembali."
    )
}
