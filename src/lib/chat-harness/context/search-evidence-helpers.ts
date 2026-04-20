import { STAGE_RESEARCH_REQUIREMENTS } from "@/lib/ai/paper-search-helpers"
import { getStageLabel, type PaperStageId } from "../../../../convex/paperSessions/constants"

// ────────────────────────────────────────────────────────────────
// Session shape used by these helpers (minimal interface)
// ────────────────────────────────────────────────────────────────

interface SessionLike {
    currentStage?: string
    stageData?: Record<string, unknown>
}

interface SessionWithStatus extends SessionLike {
    stageStatus?: string
    isDirty?: boolean
}

// ────────────────────────────────────────────────────────────────
// getSearchEvidenceFromStageData
// ────────────────────────────────────────────────────────────────

/**
 * Check stageData for authoritative evidence that web search has been completed.
 * Returns `true` if evidence found, `false` if stage is active but no evidence,
 * `null` if stage is unknown/passive.
 */
export function getSearchEvidenceFromStageData(session: SessionLike | null): boolean | null {
    if (!session || !session.stageData || !session.currentStage) {
        return null
    }

    const stageData = session.stageData as Record<string, unknown>
    switch (session.currentStage) {
        case "gagasan": {
            const data = stageData.gagasan as { referensiAwal?: unknown[] } | undefined
            const minCount = STAGE_RESEARCH_REQUIREMENTS.gagasan?.minCount ?? 1
            return Array.isArray(data?.referensiAwal) && data.referensiAwal.length >= minCount
        }
        case "tinjauan_literatur": {
            const data = stageData.tinjauan_literatur as { referensi?: unknown[] } | undefined
            const minCount = STAGE_RESEARCH_REQUIREMENTS.tinjauan_literatur?.minCount ?? 1
            return Array.isArray(data?.referensi) && data.referensi.length >= minCount
        }
        case "daftar_pustaka": {
            const data = stageData.daftar_pustaka as { entries?: unknown[] } | undefined
            const minCount = STAGE_RESEARCH_REQUIREMENTS.daftar_pustaka?.minCount ?? 1
            return Array.isArray(data?.entries) && data.entries.length >= minCount
        }
        default:
            return null
    }
}

// ────────────────────────────────────────────────────────────────
// hasStageArtifact
// ────────────────────────────────────────────────────────────────

/**
 * Returns true when the active stage already has an artifact persisted in stageData.
 */
export function hasStageArtifact(session: SessionLike | null): boolean {
    if (!session?.stageData || !session.currentStage) return false
    if (session.currentStage === "completed") return false
    const data = session.stageData[session.currentStage] as Record<string, unknown> | undefined
    return !!data?.artifactId
}

// ────────────────────────────────────────────────────────────────
// buildForcedSyncStatusMessage
// ────────────────────────────────────────────────────────────────

/**
 * Build a human-readable status message after a forced session sync.
 */
export function buildForcedSyncStatusMessage(session: SessionWithStatus | null): string {
    const stageCode = session?.currentStage
    const stageLabel = stageCode && stageCode !== "completed"
        ? `${getStageLabel(stageCode as PaperStageId)} (${stageCode})`
        : stageCode === "completed"
            ? "All stages completed"
            : "Unknown"
    const stageStatus = session?.stageStatus ?? "unknown"
    const dirty = session?.isDirty === true

    const lines = [
        "Session status synced successfully.",
        "",
        `- Active stage: ${stageLabel}`,
        `- Stage status: ${stageStatus}`,
        `- Dirty context: ${dirty ? "true" : "false"}`,
    ]

    if (stageStatus === "pending_validation" && dirty) {
        lines.push(
            "",
            "Data not yet synced. Request revision first so sync/draft update can proceed."
        )
    } else {
        lines.push(
            "",
            "Sync complete. Continue with instructions for the current active stage."
        )
    }

    return lines.join("\n")
}

// ────────────────────────────────────────────────────────────────
// hasPreviousSearchResults
// ────────────────────────────────────────────────────────────────

/**
 * Detect if previous turns already have search results (sources).
 *
 * STAGE-AWARE logic:
 * 1. stageData evidence is AUTHORITATIVE (if exists, search is definitely done)
 * 2. For ACTIVE stages without stageData evidence, check RECENT messages (last 3)
 *    — catches "search done but not yet saved" scenario
 * 3. For PASSIVE stages, check more messages (last 3) as fallback
 */
export function hasPreviousSearchResults(msgs: unknown[], session: SessionLike | null): boolean {
    const stageEvidence = getSearchEvidenceFromStageData(session)

    // stageData has evidence → search done (authoritative)
    if (stageEvidence === true) {
        return true
    }

    // For ACTIVE stages (stageEvidence === false), check recent assistant messages.
    // This catches "search done but save tool failed" scenario without forcing repeated search loops.
    if (stageEvidence === false) {
        const recentAssistantMsgs = msgs
            .filter((m): m is { role: string; content?: string; sources?: unknown } =>
                typeof m === "object" && m !== null && "role" in m && (m as { role: string }).role === "assistant"
            )
            .slice(-3)

        for (const msg of recentAssistantMsgs) {
            // Data-based signal: message has actual sources data from web search
            const hasSources = "sources" in msg
                && Array.isArray((msg as { sources?: unknown }).sources)
                && ((msg as { sources: unknown[] }).sources).length > 0
            if (hasSources) return true
        }
        return false
    }

    // PASSIVE/unknown stage (stageEvidence === null) → check more messages as fallback
    const recentAssistantMsgs = msgs
        .filter((m): m is { role: string; content?: string; sources?: unknown } =>
            typeof m === "object" && m !== null && "role" in m && (m as { role: string }).role === "assistant"
        )
        .slice(-3)

    for (const msg of recentAssistantMsgs) {
        // Data-based signal: message has actual sources data from web search
        const hasSources = "sources" in msg
            && Array.isArray((msg as { sources?: unknown }).sources)
            && ((msg as { sources: unknown[] }).sources).length > 0
        if (hasSources) return true
    }
    return false
}
