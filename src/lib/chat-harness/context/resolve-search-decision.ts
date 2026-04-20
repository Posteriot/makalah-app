import { generateText, Output, type LanguageModel, type ModelMessage } from "ai"
import { z } from "zod"
import { fetchQuery } from "convex/nextjs"

import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"
import type { PaperStageId } from "../../../../convex/paperSessions/constants"
import {
    isStageResearchIncomplete,
    getPaperToolsOnlyNote,
    getResearchIncompleteNote,
    getFunctionToolsModeNote,
    STAGE_RESEARCH_REQUIREMENTS,
} from "@/lib/ai/paper-search-helpers"
import {
    buildRetrieverChain,
    resolveSearchExecutionMode,
    type SearchExecutionMode,
} from "@/lib/ai/web-search"
import {
    buildStoredReferenceInventoryItems,
    inferSearchResponseMode,
} from "@/lib/ai/web-search/reference-presentation"
import { buildExactSourceInspectionRouterNote } from "@/lib/ai/exact-source-guardrails"
import { ACTIVE_SEARCH_STAGES, PASSIVE_SEARCH_STAGES } from "@/lib/ai/stage-skill-contracts"
import type { ExactSourceFollowupResolution, ExactSourceSummary } from "@/lib/ai/exact-source-followup"
import type { ParsedChoiceInteractionEvent } from "@/lib/chat/choice-request"
import type { RecentSource } from "./types"

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

/** Short-circuit signal when the search decision pipeline detects an early-return scenario. */
export type SearchEarlyReturn =
    | {
        kind: "reference_inventory"
        items: Array<{
            sourceId?: string
            title: string
            url: string | null
            verificationStatus: "verified_content" | "unverified_link" | "unavailable"
            documentKind?: "html" | "pdf" | "unknown"
        }>
    }
    | {
        kind: "search_unavailable"
        reasonCode: string
        message: string
    }

export interface SearchDecisionResult {
    enableWebSearch: boolean
    executionMode: SearchExecutionMode
    intentType: string
    confidence: number
    reason: string
    /** When set, the caller MUST construct & return the early response immediately. */
    earlyReturn: SearchEarlyReturn | undefined
    // Downstream flags computed from the search decision
    isSyncRequest: boolean
    isSaveSubmitIntent: boolean
    isCompileBibliographyIntent: boolean
    shouldForceGetCurrentPaperState: boolean
    shouldForceSubmitValidation: boolean
    missingArtifactNote: string
    activeStageSearchNote: string
    activeStageSearchReason: string
    isGagasanFirstTurn: boolean
}

// Minimal paper session shape needed by this module
interface PaperSessionSlice {
    currentStage?: string
    stageStatus?: string
    stageData?: Record<string, unknown>
}

export interface ResolveSearchDecisionParams {
    model: LanguageModel
    messages: ModelMessage[]
    lastUserContent: string
    paperSession: PaperSessionSlice | null
    paperStageScope: PaperStageId | undefined
    isDraftingStage: boolean
    paperModePrompt: string | null
    exactSourceResolution: ExactSourceFollowupResolution
    choiceInteractionEvent: ParsedChoiceInteractionEvent | null
    availableExactSources: ExactSourceSummary[]
    webSearchConfig: Record<string, unknown>
    // Convex access for RAG chunk check
    conversationId: string
    convexToken: string
    // Source data
    recentSourcesList: RecentSource[]
    hasRecentSourcesInDb: boolean
}

// ────────────────────────────────────────────────────────────────
// Private helpers
// ────────────────────────────────────────────────────────────────

function getStageSearchPolicy(
    stage: PaperStageId | "completed" | undefined | null,
): "active" | "passive" | "none" {
    if (!stage || stage === "completed") return "none"
    if (ACTIVE_SEARCH_STAGES.includes(stage)) return "active"
    if (PASSIVE_SEARCH_STAGES.includes(stage)) return "passive"
    return "none"
}

function getSearchEvidenceFromStageData(session: {
    currentStage?: string
    stageData?: Record<string, unknown>
} | null): boolean | null {
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

function hasPreviousSearchResults(
    msgs: unknown[],
    session: { currentStage?: string; stageData?: Record<string, unknown> } | null,
    hasRecentSourcesInDb: boolean,
    isPaperMode: boolean,
): boolean {
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
        const hasSources = "sources" in msg
            && Array.isArray((msg as { sources?: unknown }).sources)
            && ((msg as { sources: unknown[] }).sources).length > 0
        if (hasSources) return true
    }

    // Non-paper mode: also check hasRecentSourcesInDb
    if (!isPaperMode && hasRecentSourcesInDb) return true

    return false
}

function hasStageArtifact(session: {
    currentStage?: string
    stageData?: Record<string, unknown>
} | null): boolean {
    if (!session?.stageData || !session.currentStage) return false
    if (session.currentStage === "completed") return false
    const data = session.stageData[session.currentStage] as Record<string, unknown> | undefined
    return !!data?.artifactId
}

/**
 * LLM-based search router. Decides whether the next response needs web search.
 * Extracted from route.ts inline `decideWebSearchMode` closure.
 */
async function decideWebSearchMode(options: {
    model: LanguageModel
    recentMessages: unknown[]
    isPaperMode: boolean
    currentStage: PaperStageId | "completed" | undefined | null
    stagePolicy: "active" | "passive" | "none"
    previousSearchDone: boolean
    previousSearchSourceCount?: number
    researchStatus?: { incomplete: boolean; requirement?: string }
    ragChunksAvailable?: boolean
}): Promise<{ enableWebSearch: boolean; confidence: number; reason: string; intentType: string }> {
    const paperModeContext = options.isPaperMode
        ? `

IMPORTANT CONTEXT - PAPER MODE ACTIVE:
Current stage: ${options.currentStage ?? "unknown"}
Stage policy: ${options.stagePolicy.toUpperCase()}
Research status: ${options.researchStatus?.incomplete
    ? `INCOMPLETE — ${options.researchStatus.requirement}`
    : "complete (sufficient references exist)"}
Previous search: ${options.previousSearchDone
    ? `done (${options.previousSearchSourceCount ?? "unknown"} sources found)`
    : "not done yet"}

Stage policy rules (MUST follow):
- ACTIVE policy: enable search if the conversation needs factual data, references, or the user/AI
  expressed intent to search. Even if the user sends a short confirmation like "ya" or "ok",
  consider what the AI previously proposed — if AI asked "shall I search?", the confirmation
  means YES to search.
- PASSIVE policy: enable search ONLY if the user EXPLICITLY requests it (e.g., "cari referensi",
  "search for..."). Do NOT enable for general discussion.
- If previous search is done AND research is complete, prefer enableWebSearch=false
  UNLESS the user explicitly asks for MORE references/data.
- If research is INCOMPLETE and no search has been done, strongly prefer enableWebSearch=true.
${options.ragChunksAvailable ? `
RAG SOURCE CHUNKS AVAILABLE:
Stored source content from previous searches is available for follow-up inspection without a new web search.
${buildExactSourceInspectionRouterNote(options.ragChunksAvailable).trimStart()}` : ""}`
        : ""

    const routerPrompt = `You are a "router" that decides whether the response to the user MUST use web search.

Purpose:
- enableWebSearch = true if:
  (A) user requests internet/search/references, OR
  (B) AI will include references/literature/sources in its response, OR
  (C) AI needs FACTUAL DATA (statistics, numbers, facts, names, dates, events) that risks being wrong if hallucinated.
- IMPORTANT: To PREVENT HALLUCINATION, always enableWebSearch = true if the response requires specific factual data.
- Set false ONLY if: user requests save/approve of existing data, OR the response is purely opinion/discussion without factual claims.
${paperModeContext}

INTENT CLASSIFICATION — you MUST set intentType to one of these values:

1. "sync_request" — User wants to sync/check session state (e.g., "sinkronkan", "cek state",
   "status sesi", "status terbaru", "lanjut dari state"). Always set enableWebSearch=false.

2. "compile_daftar_pustaka" — User wants to compile/preview bibliography (daftar pustaka).
   Always set enableWebSearch=false.

3. "save_submit" — User wants to save, submit, or approve the current stage draft
   (e.g., "simpan", "save", "submit", "approve", "approved", "disetujui",
   "selesaikan tahap", "approve & lanjut"). Always set enableWebSearch=false.

4. "search" — User requests search/references/factual data, or AI needs factual data.
   Set enableWebSearch=true. Reason explains what data is needed.

5. "discussion" — Pure discussion, opinion, or workflow action without factual claims.
   Set enableWebSearch=false. Reason explains why no search needed.

Priority: sync_request > compile_daftar_pustaka > save_submit > search > discussion

Output rules:
- Output MUST be one JSON object ONLY.
- NO markdown, NO backticks, NO explanation outside JSON.
- confidence 0..1.

JSON schema:
{
  "enableWebSearch": boolean,
  "confidence": number,
  "reason": string,
  "intentType": "search" | "discussion" | "sync_request" | "compile_daftar_pustaka" | "save_submit"
}`

    const routerSchema = z.object({
        enableWebSearch: z.boolean(),
        confidence: z.number().min(0).max(1),
        reason: z.string().max(500),
        intentType: z.enum([
            "search",
            "discussion",
            "sync_request",
            "compile_daftar_pustaka",
            "save_submit",
        ]),
    })

    const runStructuredRouter = async () => {
        const { output } = await generateText({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            model: options.model as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            messages: [{ role: "system", content: routerPrompt }, ...(options.recentMessages as any[])],
            output: Output.object({ schema: routerSchema }),
            temperature: 0.2,
        })
        return output
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const result = await runStructuredRouter()
            return {
                enableWebSearch: result.enableWebSearch,
                confidence: result.confidence,
                reason: result.reason,
                intentType: result.intentType,
            }
        } catch {
            // Retry on failure
        }
    }

    const { text } = await generateText({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: options.model as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: [{ role: "system", content: routerPrompt }, ...(options.recentMessages as any[])],
        temperature: 0.2,
    })

    const raw = text.trim()
    const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim()

    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")
    if (start < 0 || end < 0 || end <= start) {
        return { enableWebSearch: true, confidence: 0, reason: "router_failure_safe_default", intentType: "search" as const }
    }

    try {
        const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
            enableWebSearch?: unknown
            confidence?: unknown
            reason?: unknown
            intentType?: unknown
        }

        const enableWebSearch = parsed.enableWebSearch === true
        const confidenceRaw = typeof parsed.confidence === "number" ? parsed.confidence : 0
        const confidence = Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw)) : 0
        const reason = typeof parsed.reason === "string" ? parsed.reason.slice(0, 240) : ""
        const intentType = typeof parsed.intentType === "string"
            && ["search", "discussion", "sync_request", "compile_daftar_pustaka", "save_submit"].includes(parsed.intentType)
            ? parsed.intentType as "search" | "discussion" | "sync_request" | "compile_daftar_pustaka" | "save_submit"
            : enableWebSearch ? "search" : "discussion"

        return { enableWebSearch, confidence, reason, intentType }
    } catch {
        return { enableWebSearch: true, confidence: 0, reason: "router_failure_safe_default", intentType: "search" as const }
    }
}

// ────────────────────────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────────────────────────

/**
 * Resolves the full search decision pipeline:
 * 1. Pre-router guardrails (gagasan first-turn, exact-source force-inspect)
 * 2. LLM router invocation
 * 3. Search execution mode resolution (retriever chain availability)
 * 4. Reference inventory short-circuit
 * 5. Search unavailability handling
 * 6. Forced sync/submit flag computation
 */
export async function resolveSearchDecision(
    params: ResolveSearchDecisionParams,
): Promise<SearchDecisionResult> {
    const {
        model,
        messages,
        lastUserContent,
        paperSession,
        paperModePrompt,
        exactSourceResolution,
        choiceInteractionEvent,
        availableExactSources,
        webSearchConfig,
        conversationId,
        convexToken,
        recentSourcesList,
        hasRecentSourcesInDb,
    } = params

    const isPaperMode = !!paperModePrompt
    const currentStage = paperSession?.currentStage as PaperStageId | "completed" | undefined
    const stagePolicy = getStageSearchPolicy(currentStage)
    console.log("[F1-F6-TEST] SearchPolicy", { stage: currentStage, policy: stagePolicy })

    const searchAlreadyDone = hasPreviousSearchResults(
        messages, paperSession, hasRecentSourcesInDb, isPaperMode,
    )

    if (choiceInteractionEvent) {
        console.info("[PAPER][post-choice-search-context]", {
            stage: choiceInteractionEvent.stage,
            searchAlreadyDone,
            recentSourcesCount: recentSourcesList.length,
            hasRecentSourcesInDb,
            ragChunksAvailable: null,
        })
    }

    // Check if RAG chunks are available for this conversation.
    let ragChunksAvailable = false
    try {
        ragChunksAvailable = await fetchQuery(
            api.sourceChunks.hasChunks,
            { conversationId: conversationId as Id<"conversations"> },
            { token: convexToken },
        )
    } catch {
        // Non-critical — if check fails, don't block the flow
    }

    if (choiceInteractionEvent) {
        console.info("[PAPER][post-choice-search-context-rag]", {
            stage: choiceInteractionEvent.stage,
            searchAlreadyDone,
            recentSourcesCount: recentSourcesList.length,
            hasRecentSourcesInDb,
            ragChunksAvailable,
        })
    }

    // ════════════════════════════════════════════════════════════════
    // Search Mode Decision — Unified LLM Router
    // ════════════════════════════════════════════════════════════════
    let activeStageSearchReason = ""
    let activeStageSearchNote = ""
    let searchRequestedByPolicy = false
    let isSyncRequest = false
    let isSaveSubmitIntent = false
    let isCompileBibliographyIntent = false
    let routerIntentType: string | undefined

    // --- Pre-router guardrails (structural state only, NO regex intent detection) ---
    const isGagasanFirstTurn = currentStage === "gagasan"
        && !choiceInteractionEvent
        && !searchAlreadyDone
        && !(paperSession?.stageData as Record<string, Record<string, unknown>> | undefined)?.gagasan?._plan

    if (isGagasanFirstTurn) {
        searchRequestedByPolicy = false
        activeStageSearchReason = "gagasan_first_turn_discuss_first"
        activeStageSearchNote = "First turn: model discusses idea and offers search via choice card"
        console.info(`[SearchDecision] Gagasan first turn: blocking auto-search — model discusses first, offers search via choice card`)
    } else if (exactSourceResolution.mode === "force-inspect") {
        searchRequestedByPolicy = false
        activeStageSearchReason = "exact_source_force_inspect"
        console.log(`[SearchDecision] Exact source force-inspect: blocking search, matched sourceId=${exactSourceResolution.matchedSource.sourceId.slice(0, 60)}`)
    } else {
        // --- Unified LLM router for ALL stages (ACTIVE + PASSIVE + chat) ---
        const recentForRouter = messages.slice(-8)
        const { incomplete, requirement } = paperSession
            ? isStageResearchIncomplete(
                paperSession.stageData as Record<string, unknown> | undefined,
                currentStage as PaperStageId,
              )
            : { incomplete: false, requirement: undefined }

        const routerStart = Date.now()
        const webSearchDecision = await decideWebSearchMode({
            model,
            recentMessages: recentForRouter,
            isPaperMode,
            currentStage,
            stagePolicy,
            previousSearchDone: searchAlreadyDone,
            previousSearchSourceCount: undefined,
            ragChunksAvailable,
            researchStatus: { incomplete, requirement },
        })
        console.log(`[⏱ LATENCY] searchRouter=${Date.now() - routerStart}ms decision=${webSearchDecision.enableWebSearch ? "SEARCH" : "NO-SEARCH"} intent=${webSearchDecision.intentType} confidence=${webSearchDecision.confidence}`)

        routerIntentType = webSearchDecision.intentType

        searchRequestedByPolicy = !isPaperMode
            ? webSearchDecision.enableWebSearch
            : stagePolicy === "none"
                ? false
                : webSearchDecision.enableWebSearch

        activeStageSearchReason = webSearchDecision.reason

        // Post-decision: inject appropriate system note
        if (!searchRequestedByPolicy && isPaperMode) {
            if (incomplete) {
                activeStageSearchNote = getResearchIncompleteNote(
                    currentStage as string,
                    requirement ?? "",
                )
            } else if (searchAlreadyDone) {
                activeStageSearchNote = getFunctionToolsModeNote("Search completed")
            } else {
                activeStageSearchNote = getPaperToolsOnlyNote(currentStage as string)
            }
            console.log("[F1-F6-TEST] NoteInjected", { stage: currentStage, type: incomplete ? "research_incomplete" : searchAlreadyDone ? "search_done" : "tools_only" })
        }

        console.log(
            `[SearchDecision] Unified router: ${activeStageSearchReason}, ` +
            `confidence: ${webSearchDecision.confidence}, ` +
            `searchAlreadyDone: ${searchAlreadyDone}, ` +
            `searchRequestedByPolicy: ${searchRequestedByPolicy}`,
        )
        console.log("[F1-F6-TEST] SearchDecision", { stage: currentStage, policy: stagePolicy, search: searchRequestedByPolicy, reason: activeStageSearchReason, note: activeStageSearchNote ? "injected" : "none" })

        // Post-router sync detection via intentType
        isSyncRequest = isPaperMode
            && webSearchDecision.intentType === "sync_request"

        if (isSyncRequest) {
            searchRequestedByPolicy = false
            activeStageSearchReason = "sync_request"
            activeStageSearchNote = getFunctionToolsModeNote("Session state sync")
            console.log("[SearchDecision] Router detected sync request: enableWebSearch=false")
        }

        // Post-router compile detection via intentType
        const isCompileIntent = isPaperMode
            && webSearchDecision.intentType === "compile_daftar_pustaka"

        if (isCompileIntent) {
            isCompileBibliographyIntent = true
            searchRequestedByPolicy = false
            activeStageSearchReason = "compile_daftar_pustaka"
            activeStageSearchNote = getFunctionToolsModeNote("Compile bibliography")
            console.log("[SearchDecision] Router detected compile intent: enableWebSearch=false")
        }

        // Post-router save/submit detection via intentType
        isSaveSubmitIntent = isPaperMode
            && webSearchDecision.intentType === "save_submit"
    }

    // Build retriever chain once
    const retrieverChain = buildRetrieverChain({
        webSearchRetrievers: webSearchConfig.webSearchRetrievers,
        legacyConfig: {
            primaryWebSearchEnabled: webSearchConfig.primaryEnabled,
            fallbackWebSearchEnabled: webSearchConfig.fallbackEnabled,
            webSearchModel: webSearchConfig.webSearchModel,
            webSearchFallbackModel: webSearchConfig.webSearchFallbackModel,
            fallbackWebSearchEngine: webSearchConfig.fallbackEngine,
            fallbackWebSearchMaxResults: webSearchConfig.fallbackMaxResults,
        },
        openrouterApiKey: webSearchConfig.openrouterApiKey ?? "",
        googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const searchExecutionMode = resolveSearchExecutionMode({
        searchRequired: searchRequestedByPolicy,
        retrievers: retrieverChain.map((entry: { retriever: { name: string }; retrieverConfig: { modelId: string } }) => ({
            name: entry.retriever.name as SearchExecutionMode,
            enabled: true,
            modelId: entry.retrieverConfig.modelId,
        })),
    })
    console.log(
        `[SearchExecution] mode=${searchExecutionMode}, searchRequired=${searchRequestedByPolicy},`,
        `chain=[${retrieverChain.map((e: { retriever: { name: string } }) => e.retriever.name).join(",")}]`,
    )

    let enableWebSearch = false
    let searchUnavailableReasonCode: string | undefined

    if (searchExecutionMode === "blocked_unavailable") {
        enableWebSearch = false
        searchUnavailableReasonCode = "search_required_but_unavailable"
    } else if (searchExecutionMode === "off") {
        enableWebSearch = false
    } else {
        enableWebSearch = true
    }

    if (!enableWebSearch && isPaperMode && !activeStageSearchNote) {
        activeStageSearchNote = getPaperToolsOnlyNote(currentStage as string)
    }

    // Observability: explicit first-turn flow detection
    if (isGagasanFirstTurn && !enableWebSearch) {
        console.info(`[HARNESS-FLOW] gagasan-first-turn: discuss-first → tools path (no search). Model will emit plan + discussion + search choice card.`)
    }

    // ── Reference inventory short-circuit ──
    const requestedResponseMode = await inferSearchResponseMode({
        lastUserMessage: lastUserContent,
        model,
    })
    const shouldServeStoredReferenceInventory =
        requestedResponseMode === "reference_inventory" &&
        hasRecentSourcesInDb &&
        !enableWebSearch &&
        !isSyncRequest &&
        !isSaveSubmitIntent &&
        !isCompileBibliographyIntent &&
        paperSession?.stageStatus !== "pending_validation" &&
        paperSession?.stageStatus !== "revision"

    if (shouldServeStoredReferenceInventory) {
        const inventoryItems = buildStoredReferenceInventoryItems({
            recentSources: recentSourcesList,
            exactSources: availableExactSources,
        })

        return {
            enableWebSearch: false,
            executionMode: searchExecutionMode,
            intentType: routerIntentType ?? "discussion",
            confidence: 0,
            reason: "reference_inventory_short_circuit",
            earlyReturn: { kind: "reference_inventory", items: inventoryItems },
            isSyncRequest,
            isSaveSubmitIntent,
            isCompileBibliographyIntent,
            shouldForceGetCurrentPaperState: false,
            shouldForceSubmitValidation: false,
            missingArtifactNote: "",
            activeStageSearchNote,
            activeStageSearchReason,
            isGagasanFirstTurn,
        }
    }

    // ── Search unavailability short-circuit ──
    if (searchUnavailableReasonCode) {
        return {
            enableWebSearch: false,
            executionMode: searchExecutionMode,
            intentType: routerIntentType ?? "search",
            confidence: 0,
            reason: searchUnavailableReasonCode,
            earlyReturn: {
                kind: "search_unavailable",
                reasonCode: searchUnavailableReasonCode,
                message: "Pencarian web tidak tersedia saat ini. Saya belum bisa memberikan jawaban faktual tanpa sumber. Coba lagi beberapa saat.",
            },
            isSyncRequest,
            isSaveSubmitIntent,
            isCompileBibliographyIntent,
            shouldForceGetCurrentPaperState: false,
            shouldForceSubmitValidation: false,
            missingArtifactNote: "",
            activeStageSearchNote,
            activeStageSearchReason,
            isGagasanFirstTurn,
        }
    }

    // ── Forced sync/submit flag computation ──
    const shouldForceGetCurrentPaperState = !enableWebSearch
        && isPaperMode
        && isSyncRequest
        && paperSession?.stageStatus !== "pending_validation"
        && paperSession?.stageStatus !== "revision"

    const shouldForceSubmitValidation = !enableWebSearch
        && isPaperMode
        && !shouldForceGetCurrentPaperState
        && isSaveSubmitIntent
        && paperSession?.stageStatus === "drafting"
        && hasStageArtifact(paperSession)

    const missingArtifactNote = !shouldForceSubmitValidation
        && isPaperMode
        && !hasStageArtifact(paperSession)
        && paperSession?.stageStatus === "drafting"
        && isSaveSubmitIntent
        ? `\n⚠️ ARTIFACT NOT YET CREATED for this stage. You MUST call createArtifact() with the content saved in updateStageData BEFORE calling submitStageForValidation(). Make sure to include the 'sources' parameter if AVAILABLE_WEB_SOURCES exist.\n`
        : ""

    return {
        enableWebSearch,
        executionMode: searchExecutionMode,
        intentType: routerIntentType ?? (enableWebSearch ? "search" : "discussion"),
        confidence: 0,
        reason: activeStageSearchReason,
        earlyReturn: undefined,
        isSyncRequest,
        isSaveSubmitIntent,
        isCompileBibliographyIntent,
        shouldForceGetCurrentPaperState,
        shouldForceSubmitValidation,
        missingArtifactNote,
        activeStageSearchNote,
        activeStageSearchReason,
        isGagasanFirstTurn,
    }
}
