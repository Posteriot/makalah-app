import * as Sentry from "@sentry/nextjs"
import type { GoogleGenerativeAIProviderMetadata } from "@ai-sdk/google"
import type { Spec } from "@json-render/core"
import type { PlanSpec } from "@/lib/ai/harness/plan-spec"
import type { PersistedCuratedTraceSnapshot } from "@/lib/ai/curated-trace"
import type { PaperStageId } from "../../../../convex/paperSessions/constants"
import type { Id } from "../../../../convex/_generated/dataModel"
import { api } from "../../../../convex/_generated/api"
import { retryMutation, retryQuery } from "@/lib/convex/retry"
import { normalizeWebSearchUrl } from "@/lib/citations/apaWeb"
import { enrichSourcesWithFetchedTitles } from "@/lib/citations/webTitle"
import { classifyRevisionIntent } from "@/lib/ai/classifiers/revision-intent-classifier"
import { logAiTelemetry } from "@/lib/ai/telemetry"
import { recordUsageAfterOperation, type OperationType } from "@/lib/billing/enforcement"
import { verifyStepOutcome } from "../verification"
import { UNFENCED_PLAN_REGEX, planSpecSchema, autoCompletePlanOnValidation } from "@/lib/ai/harness/plan-spec"
import { compileChoiceSpec } from "@/lib/json-render/compile-choice-spec"
import { getStageLabel } from "../../../../convex/paperSessions/constants"
import { shouldAttemptRescue } from "@/lib/chat/choice-request"
import { saveAssistantMessage } from "./save-assistant-message"
import type {
    OnFinishConfig,
    PaperSessionForExecutor,
} from "./types"
import { HARNESS_EVENT_TYPES } from "../persistence"
import type {
    StepVerificationSummary,
    ToolCallRecord,
    ExecutorResultSummary,
    StepStatus,
} from "../persistence"
import type { StepVerificationResult } from "../verification/types"

// ────────────────────────────────────────────────────────────────
// Types for buildOnFinishHandler
// ────────────────────────────────────────────────────────────────

/** Reasoning trace closure — shared mutable state between stream writer and onFinish. */
export interface ReasoningTraceContext {
    enabled: boolean
    controller: { enabled: boolean; finalize: (opts: { outcome: string; sourceCount: number }) => void; getPersistedSnapshot: () => PersistedCuratedTraceSnapshot | undefined } | null
    snapshot: PersistedCuratedTraceSnapshot | undefined
    sourceCount: number
    captureSnapshot: () => void
}

/** Telemetry context passed to logAiTelemetry. */
export interface TelemetryContext {
    provider: string
    model: string
    isPrimaryProvider: boolean
    failoverUsed: boolean
    toolUsed: string | undefined
    mode: "paper" | "normal"
    startTime: number
    skillContext: Record<string, unknown>
}

/** Active harness step identity, populated by buildStepStream after startStep. */
export interface ActiveHarnessStep {
    stepId: Id<"harnessRunSteps">
    stepIndex: number
    startedAt: number
    /** Flipped to true after completeStep has been called so the failure path can avoid double-completing. */
    completed: boolean
}

/** Per-stream-call context that changes between primary/fallback invocations. */
export interface OnFinishStreamContext {
    messageId: string
    reasoningTrace: ReasoningTraceContext
    telemetry: TelemetryContext
    /** Whether this particular stream is forced-sync (model was forced to getCurrentPaperState). */
    shouldForceGetCurrentPaperState: boolean
    /** Builds the forced-sync status message from session state. */
    buildForcedSyncStatusMessage: (session: PaperSessionForExecutor | null) => string
    /** Returns the current plan snapshot from the stream pipeline capture layer. */
    getCurrentPlanSnapshot: () => PlanSpec | undefined
    /** Elapsed ms ref for step timing (primary only). */
    enforcerStepStartTime: number | undefined
    /**
     * Harness step identity for this stream (Task 6.4b).
     * Populated by buildStepStream once runStore.startStep succeeds; read by
     * the onFinish handler to call completeStep and emit step-level events.
     * `null` until the step row exists (or when persistence was skipped).
     */
    activeStep: ActiveHarnessStep | null
}

/** Result from buildOnFinishHandler. */
export interface OnFinishHandlerResult {
    handler: (result: {
        text: string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        steps: any[]
        providerMetadata?: unknown
        usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number }
        /** Top-level finish reason from the AI SDK streamText result (Task 6.4b). */
        finishReason?: string
    }) => Promise<void>
    streamContentOverrideRef: { current: string | null }
    capturedSpecRef: { current: Spec | null }
    capturedPlanSpecRef: { current: PlanSpec | null }
}

// ────────────────────────────────────────────────────────────────
// buildOnFinishHandler
// ────────────────────────────────────────────────────────────────

/**
 * Build a unified onFinish handler for streamText.
 *
 * The 5 primary-only behaviors are gated by feature flags in `OnFinishConfig`:
 *   1. enableGroundingExtraction — Google grounding metadata → sources
 *   2. enableSourceTitleEnrichment — enrichSourcesWithFetchedTitles
 *   3. enableRevisionClassifier — classifyRevisionIntent
 *   4. isCompileThenFinalize — tool chain expected order includes compileDaftarPustaka
 *   5. enablePlanSpecFallbackExtraction — UNFENCED_PLAN_REGEX + YAML fallback
 *
 * Returns mutable refs so the stream writer (buildStepStream) can share state.
 */
export function buildOnFinishHandler(
    config: OnFinishConfig,
    streamCtx: OnFinishStreamContext,
): OnFinishHandlerResult {
    // Mutable refs shared with stream writer
    const streamContentOverrideRef: { current: string | null } = { current: null }
    const capturedSpecRef: { current: Spec | null } = { current: null }
    const capturedPlanSpecRef: { current: PlanSpec | null } = { current: null }

    const {
        conversationId,
        userId,
        modelName,
        model,
        convexToken,
        billingContext,
        paperSession,
        paperStageScope,
        paperToolTracker,
        paperTurnObservability,
        resolvedWorkflow,
        choiceInteractionEvent,
        isCompileThenFinalize,
        normalizedLastUserContent,
        lane,
        maybeUpdateTitleFromAI,
        fetchQueryWithToken,
        fetchMutationWithToken,
        requestStartedAt,
        isDraftingStage,
        isHasilPostChoice,
        enableGroundingExtraction,
        enableSourceTitleEnrichment,
        enableRevisionClassifier,
        enablePlanSpecFallbackExtraction,
        runStore,
        eventStore,
    } = config

    const logTag = streamCtx.telemetry.failoverUsed ? "[fallback]" : ""

    const handler = async (result: {
        text: string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        steps: any[]
        providerMetadata?: unknown
        usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number }
        /** Top-level finish reason from the AI SDK streamText result (Task 6.4b). */
        finishReason?: string
    }): Promise<void> => {
        const { text, steps, providerMetadata, usage } = result

        // ── ONFINISH timing instrumentation (E2E iteration 1) ──
        // Per-step elapsed lines + final breakdown summary so we can locate
        // tail-latency contributors in this handler. Names are stable and
        // grep-friendly. Conditional blocks only emit a line when they fire.
        const onFinishStart = Date.now()
        const onFinishReqId = lane.requestId
        const breakdown: Record<string, number> = {}
        const measureStep = (name: string, elapsed: number): void => {
            breakdown[name] = elapsed
            console.info(`[⏱ ONFINISH][${onFinishReqId}] step=${name} elapsed=${elapsed}ms`)
        }

        // ── Step timing log (primary only, when enforcerStepStartTime provided) ──
        if (streamCtx.enforcerStepStartTime && paperStageScope && Array.isArray(steps) && steps.length > 0) {
            const lastIdx = steps.length - 1
            const lastTools = steps[lastIdx]?.toolCalls?.map((tc: { toolName: string }) => tc.toolName).join(",") ?? "text"
            console.info(`[STEP-TIMING] step=${lastIdx} stage=${paperStageScope} tools=[${lastTools}] elapsed=${Date.now() - streamCtx.enforcerStepStartTime}ms (final)`)
        }

        // ── Tool chain ordering observability ──
        if (paperStageScope && Array.isArray(steps) && steps.length > 0) {
            const toolSequence = steps
                .flatMap((s: { toolCalls?: Array<{ toolName: string }> }, i: number) =>
                    (s.toolCalls ?? []).map(tc => `${i}:${tc.toolName}`)
                )
            if (toolSequence.length > 0) {
                const finalizationTools = ["updateStageData", "createArtifact", "submitStageForValidation"]
                // Feature flag #4: isCompileThenFinalize changes expected sequence
                const expected = isCompileThenFinalize
                    ? ["compileDaftarPustaka", "updateStageData", "createArtifact", "submitStageForValidation"]
                    : ["updateStageData", "createArtifact", "submitStageForValidation"]
                const actualNames = toolSequence.map(t => t.split(":")[1])
                const dedupedNames = actualNames.filter((name, i) => i === 0 || name !== actualNames[i - 1])
                const hasFinalizationTool = actualNames.some(name => finalizationTools.includes(name))
                if (hasFinalizationTool) {
                    const isCorrectOrder = expected.every((tool, idx) => dedupedNames[idx] === tool)
                    console.info(`[F1-F6-TEST] ToolChainOrder${logTag} { stage: "${paperStageScope}", sequence: [${toolSequence.join(", ")}], expected: [${expected.join(", ")}], correct: ${isCorrectOrder} }`)
                } else {
                    console.info(`[F1-F6-TEST] ToolChainOrder${logTag} { stage: "${paperStageScope}", sequence: [${toolSequence.join(", ")}], status: "not_applicable" }`)
                }
            }
        }

        // ── Feature flag #1: Grounding extraction (primary only) ──
        let sources: { url: string; title: string; publishedAt?: number | null }[] | undefined

        if (enableGroundingExtraction && providerMetadata) {
            const googleMetadata = (providerMetadata as Record<string, unknown>)?.google as unknown as GoogleGenerativeAIProviderMetadata | undefined
            const groundingMetadata = googleMetadata?.groundingMetadata
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const chunks = (groundingMetadata as any)?.groundingChunks as any[] | undefined

            if (chunks) {
                sources = chunks
                    .map((chunk) => {
                        if (chunk.web?.uri) {
                            const normalizedUrl = normalizeWebSearchUrl(chunk.web.uri)
                            return {
                                url: normalizedUrl,
                                title: chunk.web.title || normalizedUrl,
                            }
                        }
                        return null
                    })
                    .filter(Boolean) as { url: string; title: string; publishedAt?: number | null }[]
            }
        }

        // ── Concatenate + normalize text ──
        const allStepsText = Array.isArray(steps) && steps.length > 1
            ? steps.map((s: { text?: string }) => typeof s.text === "string" ? s.text : "").filter((t) => t.trim().length > 0).join("\n\n").trim()
            : ""
        const rawText = (allStepsText || (typeof text === "string" ? text : "")).trim()
        const normalizedText = rawText.replace(
            /```yaml-spec[\s\S]*?```/g,
            ""
        ).replace(
            /```plan-spec[\s\S]*?```/g,
            ""
        ).replace(
            /(?:^|\n)stage:\s*\w+\s*\nsummary:\s*.+\ntasks:\s*\n(?:\s*-\s*label:\s*.+\n\s*status:\s*(?:complete|in-progress|pending)\s*\n?)+/g,
            ""
        ).replace(/\n{3,}/g, "\n\n").trim()

        const shouldPersistForcedSyncFallback = streamCtx.shouldForceGetCurrentPaperState && normalizedText.length === 0
        let persistedContent = shouldPersistForcedSyncFallback
            ? streamCtx.buildForcedSyncStatusMessage(paperSession)
            : normalizedText

        // ── Hasil post-choice observability ──
        if (isHasilPostChoice && normalizedText.length > 0) {
            if (
                paperToolTracker.sawSubmitValidationArtifactMissing &&
                paperToolTracker.sawCreateArtifactSuccess &&
                !paperToolTracker.sawSubmitValidationSuccess
            ) {
                console.warn(`[HASIL][ordering-bug]${logTag} submitStageForValidation failed before artifact existed, createArtifact succeeded later, but submit was not retried.`)
            }
            if (
                paperToolTracker.sawUpdateStageData &&
                !paperToolTracker.sawCreateArtifactSuccess &&
                !paperToolTracker.sawSubmitValidationSuccess
            ) {
                console.warn(`[HASIL][partial-save-stall]${logTag} updateStageData called but createArtifact and submitStageForValidation were not called. Tool chain incomplete.`)
            }
            if (
                /panel validasi|approve|revisi/i.test(normalizedText) &&
                !paperToolTracker.sawSubmitValidationSuccess
            ) {
                console.warn(`[HASIL][false-validation-claim]${logTag} response mentioned validation flow without successful submitStageForValidation.`)
            }
            if (
                /aku akan menyusun|draf ini akan|berikut adalah draf/i.test(normalizedText) &&
                !paperToolTracker.sawCreateArtifactSuccess
            ) {
                console.warn(`[HASIL][prose-leakage]${logTag} post-choice response previewed draft content in chat before artifact creation.`)
            }
        }

        // ── Daftar pustaka observability ──
        if (paperStageScope === "daftar_pustaka" && normalizedText.length > 0) {
            if (
                paperToolTracker.sawCompileDaftarPustakaPersist &&
                !paperToolTracker.sawCreateArtifactSuccess &&
                !paperToolTracker.sawUpdateArtifactSuccess
            ) {
                console.warn(`[DAFTAR_PUSTAKA][compiled-but-no-artifact]${logTag} persist compilation succeeded but no artifact tool followed.`)
            }
            if (
                /kesalahan teknis|maafkan aku|saya akan coba|memperbaiki/i.test(normalizedText) &&
                (paperToolTracker.sawCreateArtifactSuccess || paperToolTracker.sawUpdateArtifactSuccess)
            ) {
                console.warn(`[PAPER][nonfatal-error-leakage]${logTag} response exposed internal failure narration even though artifact was created successfully.`)
            }
            if (
                paperSession?.stageStatus === "revision" &&
                paperToolTracker.sawCreateArtifactSuccess &&
                !paperToolTracker.sawUpdateArtifactSuccess
            ) {
                console.warn(`[DAFTAR_PUSTAKA][revision-create-instead-of-update]${logTag} revision turn created new artifact instead of updating existing one.`)
            }
            if (
                (paperToolTracker.sawCreateArtifactSuccess || paperToolTracker.sawUpdateArtifactSuccess) &&
                !paperToolTracker.sawSubmitValidationSuccess
            ) {
                console.warn(`[DAFTAR_PUSTAKA][artifact-without-submit]${logTag} artifact created/updated but submitStageForValidation was not called.`)
            }
        }

        // ── Feature flag #3: Revision classifier (primary only) ──
        if (enableRevisionClassifier
            && paperSession?.stageStatus === "pending_validation"
            && !paperToolTracker.sawRequestRevision
            && !paperToolTracker.sawUpdateStageData
            && !paperToolTracker.sawCreateArtifactSuccess
            && !paperToolTracker.sawUpdateArtifactSuccess
            && normalizedLastUserContent
            && model) {
            const revisionClassifyStart = Date.now()
            const revisionResult = await classifyRevisionIntent({
                lastUserContent: normalizedLastUserContent,
                model,
            })
            measureStep("revisionClassify", Date.now() - revisionClassifyStart)
            if (revisionResult?.output.hasRevisionIntent && revisionResult.output.confidence >= 0.6) {
                console.warn(
                    `[revision-intent-answered-without-tools] stage=${paperSession.currentStage} ` +
                    `confidence=${revisionResult.output.confidence} — model responded to apparent revision intent with prose only`
                )
            }
        }

        // ── Step verification (replaces inline partial-save-stall + outcome guard) ──
        const toolChainOrder = Array.isArray(steps)
            ? steps.flatMap((s: { toolCalls?: Array<{ toolName: string }> }) =>
                (s.toolCalls ?? []).map(tc => tc.toolName)
            )
            : []

        const verifyStepStart = Date.now()
        const stepVerification = await verifyStepOutcome({
            text: normalizedText,
            toolChainOrder,
            paperToolTracker,
            paperTurnObservability,
            resolvedWorkflow,
            choiceInteractionEvent,
            paperSession: paperSession ? { currentStage: paperSession.currentStage, stageStatus: paperSession.stageStatus } : null,
            paperStageScope,
            isDraftingStage,
            isCompileThenFinalize,
            eventStore,
            lane,
            userId,
            stepId: streamCtx.activeStep?.stepId ?? null,
            emitEvents: true, // definitive verification pass — single emit per step
        })
        measureStep("verifyStep", Date.now() - verifyStepStart)

        // Log completion blockers from verification
        if (stepVerification.completionBlockers.length > 0 && paperStageScope) {
            for (const blocker of stepVerification.completionBlockers) {
                console.warn(`[VERIFICATION][blocker]${logTag} ${blocker}`)
            }
        }
        if (stepVerification.mustPause && paperStageScope) {
            console.warn(`[VERIFICATION][must-pause]${logTag} stage=${paperStageScope} reason=${stepVerification.pauseReason ?? "unknown"}`)
        }

        // Apply outcome guard override from verification result
        if (stepVerification.streamContentOverride) {
            persistedContent = stepVerification.streamContentOverride
            streamContentOverrideRef.current = stepVerification.streamContentOverride
            console.info(`[PAPER][outcome-guard]${logTag} stage=${paperStageScope} action=${resolvedWorkflow?.action ?? "unknown"} contract=${resolvedWorkflow?.contractVersion ?? "legacy"}`)
        }

        // ── System-owned closing message for completed session ──
        if (
            paperSession?.currentStage === "completed" &&
            normalizedText.length > 0 &&
            /tool_code|sekarang kita masuk ke tahap|yaml-spec|plan-spec|```yaml/i.test(normalizedText)
        ) {
            persistedContent = "Semua tahap penyusunan makalah sudah selesai dan disetujui.\n\nRiwayat percakapan di sidebar menyimpan artifact dari setiap tahap, mulai dari gagasan awal sampai pemilihan judul. Linimasa progres juga sudah penuh, menandakan seluruh tahapan penyusunan makalah telah terlewati."
            console.info(`[PAPER][completed-guard]${logTag} replaced corrupt/off-context model output with system-owned closing message`)
        }

        // ── Server-owned fallback: lampiran "tidak ada" path ──
        const NO_APPENDIX_IDS = new Set(["tidak-ada-lampiran", "option-tidak-ada-lampiran", "no-appendix"])
        const lampiranRescueCheck = resolvedWorkflow ? shouldAttemptRescue({
            resolvedWorkflow,
            paperToolTracker,
        }) : { shouldRescue: true, reason: "legacy_no_resolver" }
        if (
            paperStageScope === "lampiran" &&
            lampiranRescueCheck.shouldRescue &&
            choiceInteractionEvent?.stage === "lampiran" &&
            choiceInteractionEvent.selectedOptionIds.some(id => NO_APPENDIX_IDS.has(id.trim().toLowerCase())) &&
            paperToolTracker.sawUpdateStageData &&
            !paperToolTracker.sawCreateArtifactSuccess &&
            !paperToolTracker.sawUpdateArtifactSuccess
        ) {
            console.info(`[PAPER][rescue] stage=lampiran reason=${lampiranRescueCheck.reason} fallbackPolicy=${resolvedWorkflow?.fallbackPolicy ?? "legacy"}${logTag ? ` path=fallback` : ""}`)
            const lampiranRescueStart = Date.now()
            try {
                const lampiranStageData = (paperSession!.stageData as Record<string, Record<string, unknown> | undefined> | undefined)?.["lampiran"]
                const alasan = typeof lampiranStageData?.alasanTidakAda === "string" ? lampiranStageData.alasanTidakAda : ""
                const placeholderContent = alasan
                    ? `Tidak ada lampiran.\n\nAlasan: ${alasan}`
                    : "Tidak ada lampiran."

                const placeholderResult = await retryMutation(
                    () => fetchMutationWithToken(api.artifacts.create, {
                        conversationId,
                        userId,
                        type: "section",
                        title: "Lampiran",
                        content: placeholderContent,
                    }),
                    `artifacts.create(lampiran-placeholder${logTag ? "-fallback" : ""})`
                ) as { artifactId: string }

                try {
                    await retryMutation(
                        () => fetchMutationWithToken(api.paperSessions.updateStageData, {
                            sessionId: paperSession!._id,
                            stage: "lampiran",
                            data: { artifactId: placeholderResult.artifactId },
                        }),
                        `paperSessions.updateStageData(lampiran-link${logTag ? "-fallback" : ""})`
                    )
                } catch { /* non-critical */ }

                await retryMutation(
                    () => fetchMutationWithToken(api.paperSessions.submitForValidation, {
                        sessionId: paperSession!._id,
                    }),
                    `paperSessions.submitForValidation(lampiran${logTag ? "-fallback" : ""})`
                )
                paperToolTracker.sawCreateArtifactSuccess = true
                paperToolTracker.sawSubmitValidationSuccess = true
                persistedContent = "Tidak ada lampiran untuk paper ini. Silakan review di panel validasi."
                console.info(`[LAMPIRAN][server-fallback]${logTag} placeholder artifact created and submitted for validation`)
            } catch (fallbackErr) {
                console.error(`[LAMPIRAN][server-fallback]${logTag} failed:`, fallbackErr)
            }
            measureStep("lampiranRescue", Date.now() - lampiranRescueStart)
        }

        // ── Server-owned fallback: judul title selection ──
        const judulRescueCheck = resolvedWorkflow ? shouldAttemptRescue({
            resolvedWorkflow,
            paperToolTracker,
        }) : { shouldRescue: true, reason: "legacy_no_resolver" }
        if (
            paperStageScope === "judul" &&
            judulRescueCheck.shouldRescue &&
            choiceInteractionEvent?.stage === "judul" &&
            !paperToolTracker.sawUpdateStageData &&
            !paperToolTracker.sawCreateArtifactSuccess &&
            !paperToolTracker.sawUpdateArtifactSuccess &&
            normalizedText.length > 0
        ) {
            console.info(`[PAPER][rescue] stage=judul reason=${judulRescueCheck.reason} fallbackPolicy=${resolvedWorkflow?.fallbackPolicy ?? "legacy"}${logTag ? ` path=fallback` : ""}`)
            const judulRescueStart = Date.now()
            try {
                let selectedTitle: string | undefined
                try {
                    const sourceMsg = await retryQuery(
                        () => fetchQueryWithToken(api.messages.getMessageByUiMessageId, {
                            uiMessageId: choiceInteractionEvent.sourceMessageId,
                            conversationId,
                        }),
                        `messages.getMessageByUiMessageId(judul-source${logTag ? "-fb" : ""})`
                    ) as { jsonRendererChoice?: string } | null
                    if (sourceMsg?.jsonRendererChoice) {
                        const spec = JSON.parse(sourceMsg.jsonRendererChoice)
                        const selectedId = choiceInteractionEvent.selectedOptionIds[0]
                        const elements = spec?.elements ?? {}
                        for (const el of Object.values(elements) as Array<{ type?: string; props?: { optionId?: string; label?: string } }>) {
                            if (el?.type === "ChoiceOptionButton" && el?.props?.optionId === selectedId && el?.props?.label) {
                                selectedTitle = el.props.label
                                break
                            }
                        }
                        if (selectedTitle) {
                            console.info(`[JUDUL][server-fallback]${logTag} resolved title from choice payload: "${selectedTitle}"`)
                        } else {
                            console.warn(`[JUDUL][server-fallback]${logTag}[selected-option-unresolved] option ${selectedId} not found in spec elements`)
                        }
                    } else {
                        console.warn(`[JUDUL][server-fallback]${logTag}[source-message-missing-choice-payload] no jsonRendererChoice in source message`)
                    }
                } catch (resolveErr) {
                    console.warn(`[JUDUL][server-fallback]${logTag} choice payload resolution failed:`, resolveErr)
                }
                if (!selectedTitle) {
                    const titleMatch = normalizedText.match(/judulTerpilih["\s:]*"([^"]+)"/i)
                        ?? normalizedText.match(/judul[^"]*"([^"]{20,})"/)
                        ?? normalizedText.match(/["""]([^"""]{20,})["""]/)
                    selectedTitle = titleMatch?.[1]?.trim()
                }

                if (selectedTitle) {
                    await retryMutation(
                        () => fetchMutationWithToken(api.paperSessions.updateStageData, {
                            sessionId: paperSession!._id,
                            stage: "judul",
                            data: { judulTerpilih: selectedTitle, alasanPemilihan: "Dipilih oleh user via choice card." },
                        }),
                        `paperSessions.updateStageData(judul-fallback${logTag ? "-fb" : ""})`
                    )

                    const judulStageData = (paperSession!.stageData as Record<string, Record<string, unknown> | undefined> | undefined)?.["judul"]
                    const existingJudulArtifactId = judulStageData?.artifactId as string | undefined

                    if (existingJudulArtifactId) {
                        await retryMutation(
                            () => fetchMutationWithToken(api.artifacts.update, {
                                artifactId: existingJudulArtifactId as Id<"artifacts">,
                                userId,
                                content: `Judul Terpilih:\n\n${selectedTitle}`,
                                title: "Pemilihan Judul",
                            }),
                            `artifacts.update(judul-fallback${logTag ? "-fb" : ""})`
                        )
                        paperToolTracker.sawUpdateArtifactSuccess = true
                    } else {
                        const judulArtifact = await retryMutation(
                            () => fetchMutationWithToken(api.artifacts.create, {
                                conversationId,
                                userId,
                                type: "section",
                                title: "Pemilihan Judul",
                                content: `Judul Terpilih:\n\n${selectedTitle}`,
                            }),
                            `artifacts.create(judul-fallback${logTag ? "-fb" : ""})`
                        ) as { artifactId: string }

                        try {
                            await retryMutation(
                                () => fetchMutationWithToken(api.paperSessions.updateStageData, {
                                    sessionId: paperSession!._id,
                                    stage: "judul",
                                    data: { artifactId: judulArtifact.artifactId },
                                }),
                                `paperSessions.updateStageData(judul-link${logTag ? "-fb" : ""})`
                            )
                        } catch { /* non-critical */ }
                    }

                    await retryMutation(
                        () => fetchMutationWithToken(api.paperSessions.submitForValidation, {
                            sessionId: paperSession!._id,
                        }),
                        `paperSessions.submitForValidation(judul-fallback${logTag ? "-fb" : ""})`
                    )
                    paperToolTracker.sawCreateArtifactSuccess = true
                    paperToolTracker.sawSubmitValidationSuccess = true
                    persistedContent = `Judul "${selectedTitle}" sudah dipilih. Silakan review di panel validasi.`
                    console.info(`[JUDUL][server-fallback]${logTag} title saved, artifact created, submitted for validation`)
                } else {
                    console.warn(`[JUDUL][server-fallback]${logTag} could not extract title from model response`)
                }
            } catch (fallbackErr) {
                console.error(`[JUDUL][server-fallback]${logTag} failed:`, fallbackErr)
            }
            measureStep("judulRescue", Date.now() - judulRescueStart)
        }

        // ── Feature flag #2: Source title enrichment (primary only) ──
        if (enableSourceTitleEnrichment && normalizedText.length > 0 && sources && sources.length > 0) {
            const enrichSourcesStart = Date.now()
            sources = await enrichSourcesWithFetchedTitles(sources, {
                concurrency: 4,
                timeoutMs: 5000,
            })
            measureStep("enrichSources", Date.now() - enrichSourcesStart)
        }

        // ── Harness chain completion ──
        if (
            paperStageScope &&
            paperSession?._id &&
            isDraftingStage &&
            paperToolTracker.sawUpdateStageData &&
            !paperToolTracker.sawCreateArtifactSuccess &&
            !paperToolTracker.sawUpdateArtifactSuccess &&
            !paperToolTracker.sawSubmitValidationSuccess
        ) {
            const chainStartTime = Date.now()
            try {
                const artifactContent = normalizedText.trim() || persistedContent.trim() || "Draft content"
                const artifactTitle = getStageLabel(paperStageScope as PaperStageId)

                console.info(`[CHAIN-COMPLETION]${logTag} stage=${paperStageScope} starting: createArtifact + submitForValidation (model abandoned chain after updateStageData)`)

                const artifactResult = await retryMutation(
                    () => fetchMutationWithToken(api.artifacts.create, {
                        conversationId,
                        userId,
                        type: "section",
                        title: artifactTitle,
                        content: artifactContent,
                        format: "markdown",
                    }),
                    `artifacts.create(chain-completion${logTag ? "-fallback" : ""})`
                ) as { artifactId: string }

                await retryMutation(
                    () => fetchMutationWithToken(api.paperSessions.updateStageData, {
                        sessionId: paperSession!._id,
                        stage: paperStageScope,
                        data: { artifactId: artifactResult.artifactId },
                    }),
                    `paperSessions.updateStageData(chain-completion${logTag ? "-fallback" : ""}-link)`
                )

                await retryMutation(
                    () => fetchMutationWithToken(api.paperSessions.submitForValidation, {
                        sessionId: paperSession!._id,
                    }),
                    `paperSessions.submitForValidation(chain-completion${logTag ? "-fallback" : ""})`
                )

                paperToolTracker.sawCreateArtifactSuccess = true
                paperToolTracker.sawSubmitValidationSuccess = true

                console.info(`[CHAIN-COMPLETION]${logTag} stage=${paperStageScope} success: artifactId=${artifactResult.artifactId} elapsed=${Date.now() - chainStartTime}ms`)
            } catch (chainErr) {
                console.error(`[CHAIN-COMPLETION]${logTag} stage=${paperStageScope} failed after ${Date.now() - chainStartTime}ms:`, chainErr)
            }
            measureStep("chainCompletion", Date.now() - chainStartTime)
        }

        // ── Empty response recovery ──
        if (
            persistedContent.length === 0 &&
            paperStageScope &&
            paperSession?.stageStatus === "drafting" &&
            !paperToolTracker?.sawSubmitValidationSuccess
        ) {
            persistedContent = "Please select the next step to continue."
            console.info(`[EMPTY-RESPONSE][recovery]${logTag} stage=${paperStageScope} injecting recovery message + fallback choice card`)
        }

        // ── Message persistence ──
        if (persistedContent.length > 0) {
            const persistedReasoningTrace = (() => {
                if (!streamCtx.reasoningTrace.enabled) return undefined
                if (!streamCtx.reasoningTrace.controller?.enabled) return undefined
                if (!streamCtx.reasoningTrace.snapshot) {
                    streamCtx.reasoningTrace.controller.finalize({
                        outcome: "done",
                        sourceCount: streamCtx.reasoningTrace.sourceCount,
                    })
                }
                streamCtx.reasoningTrace.captureSnapshot()
                return streamCtx.reasoningTrace.snapshot
            })()

            // Fallback choice card injection
            if (
                !(capturedSpecRef.current && capturedSpecRef.current.root) &&
                paperStageScope &&
                paperSession?.stageStatus === "drafting" &&
                !paperToolTracker?.sawSubmitValidationSuccess
            ) {
                const { spec: fallbackSpec } = compileChoiceSpec({
                    stage: paperStageScope,
                    kind: "single-select",
                    title: "Apa langkah selanjutnya?",
                    options: [
                        { id: "lanjutkan-diskusi", label: "Lanjutkan diskusi" },
                    ],
                    recommendedId: "lanjutkan-diskusi",
                    appendValidationOption: true,
                })
                capturedSpecRef.current = fallbackSpec as Spec
                console.info(`[CHOICE-CARD][fallback-injected] stage=${paperStageScope} reason=model_did_not_emit_choice_card${logTag ? " (fallback model)" : ""}`)
            }

            // Auto-complete plan when validation succeeded
            const planSnapshot = capturedPlanSpecRef.current ?? streamCtx.getCurrentPlanSnapshot()
            const finalSnapshot = planSnapshot
                ? autoCompletePlanOnValidation(planSnapshot as PlanSpec, paperToolTracker.sawSubmitValidationSuccess)
                : undefined

            // Observability: log persisted planSnapshot
            if (finalSnapshot && paperStageScope) {
                const snap = finalSnapshot as PlanSpec
                const taskDetail = snap.tasks.map((t, i) => `${i}:${t.status}:${t.label.slice(0, 40)}`).join(", ")
                console.info(`[PLAN-SNAPSHOT]${logTag} stage=${paperStageScope} tasks=${snap.tasks.length} autoCompleted=${paperToolTracker.sawSubmitValidationSuccess} detail=[${taskDetail}]`)
            }

            const saveAssistantMsgStart = Date.now()
            await saveAssistantMessage({
                conversationId,
                content: persistedContent,
                sources: normalizedText.length > 0 ? sources : undefined,
                usedModel: modelName,
                reasoningTrace: persistedReasoningTrace,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                jsonRendererChoice: capturedSpecRef.current && capturedSpecRef.current.root ? capturedSpecRef.current as any : undefined,
                uiMessageId: streamCtx.messageId,
                planSnapshot: finalSnapshot,
                fetchMutationWithToken,
            })
            measureStep("saveAssistantMsg", Date.now() - saveAssistantMsgStart)
        }

        // ── Feature flag #5: Plan spec fallback extraction (primary only) ──
        if (!capturedPlanSpecRef.current && paperStageScope) {
            if (enablePlanSpecFallbackExtraction) {
                const localPlanRegex = new RegExp(UNFENCED_PLAN_REGEX.source, UNFENCED_PLAN_REGEX.flags)
                const unfencedMatch = localPlanRegex.exec(rawText)
                if (unfencedMatch) {
                    try {
                        const { default: yaml } = await import("js-yaml")
                        const parsed = yaml.load(unfencedMatch[1])
                        const parseResult = planSpecSchema.safeParse(parsed)
                        if (parseResult.success) {
                            capturedPlanSpecRef.current = parseResult.data
                            console.info(`[PLAN-CAPTURE] fallback extracted from rawText (tools path) stage=${paperStageScope} tasks=${parseResult.data.tasks.length}`)
                        }
                    } catch { /* yaml parse fail — ignore */ }
                }
            }
            if (!capturedPlanSpecRef.current) {
                const planProbe = rawText.substring(0, 500).replace(/\n/g, "\\n")
                const hasFenced = rawText.includes("```plan-spec")
                const hasUnfenced = /stage:\s*\w+\s*\nsummary:/.test(rawText)
                console.info(`[PLAN-CAPTURE] no plan-spec detected in response (stage=${paperStageScope}) hasFenced=${hasFenced} hasUnfenced=${hasUnfenced} rawTextLen=${rawText.length} probe=${planProbe}`)
            }
        }

        // ── Persist captured plan to stageData ──
        if (capturedPlanSpecRef.current && paperSession?._id && paperStageScope) {
            const finalPlan = autoCompletePlanOnValidation(capturedPlanSpecRef.current, paperToolTracker.sawSubmitValidationSuccess)
            const updatePlanStart = Date.now()
            try {
                await fetchMutationWithToken(api.paperSessions.updatePlan, {
                    sessionId: paperSession._id,
                    stage: paperStageScope,
                    plan: finalPlan,
                })
                console.info(`[PLAN-CAPTURE] persisted${logTag ? " (fallback)" : ""} stage=${paperStageScope} tasks=${finalPlan.tasks.length} elapsed=${requestStartedAt ? Date.now() - requestStartedAt : '?'}ms`)
            } catch (e) {
                console.warn(`[PLAN-CAPTURE]${logTag ? " fallback" : ""} persist failed:`, e)
            }
            measureStep("updatePlan", Date.now() - updatePlanStart)
        }

        // ── Billing: record token usage ──
        if (usage) {
            const recordUsageStart = Date.now()
            await recordUsageAfterOperation({
                userId: billingContext.userId,
                conversationId,
                sessionId: paperSession?._id,
                inputTokens: usage.inputTokens ?? 0,
                outputTokens: usage.outputTokens ?? 0,
                totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
                model: modelName,
                operationType: billingContext.operationType as OperationType,
                convexToken,
            }).catch(err => Sentry.captureException(err, { tags: { subsystem: "billing" } }))
            measureStep("recordUsage", Date.now() - recordUsageStart)
        }

        // ── Telemetry ──
        // Note: logAiTelemetry is fire-and-forget (no await). Measurement here
        // only captures the synchronous call cost — the actual telemetry POST
        // does not block onFinish.
        const logTelemetryStart = Date.now()
        logAiTelemetry({
            token: convexToken,
            userId,
            conversationId,
            provider: streamCtx.telemetry.provider as "vercel-gateway" | "openrouter",
            model: streamCtx.telemetry.model,
            isPrimaryProvider: streamCtx.telemetry.isPrimaryProvider,
            failoverUsed: streamCtx.telemetry.failoverUsed,
            toolUsed: streamCtx.telemetry.toolUsed,
            mode: streamCtx.telemetry.mode,
            success: true,
            latencyMs: Date.now() - streamCtx.telemetry.startTime,
            inputTokens: usage?.inputTokens,
            outputTokens: usage?.outputTokens,
            ...streamCtx.telemetry.skillContext,
        })
        measureStep("logTelemetry", Date.now() - logTelemetryStart)

        // ── Title update ──
        if (normalizedText.length > 0) {
            const minPairsForFinalTitle = Number.parseInt(
                process.env.CHAT_TITLE_FINAL_MIN_PAIRS ?? "3",
                10
            )
            const updateTitleStart = Date.now()
            await maybeUpdateTitleFromAI({
                assistantText: normalizedText,
                minPairsForFinalTitle: Number.isFinite(minPairsForFinalTitle)
                    ? minPairsForFinalTitle
                    : 3,
            })
            measureStep("updateTitle", Date.now() - updateTitleStart)
        }

        // ── Harness step persistence (Task 6.4b) ──
        // Aggregate-pass tool event emission: see header comment in this file
        // and the per-emit comment below for why we chose aggregate over
        // per-stream-part emission.
        const activeStep = streamCtx.activeStep
        if (activeStep && !activeStep.completed) {
            // Build executor result summary from the AI SDK result.
            const finishReason = typeof result.finishReason === "string" ? result.finishReason : "unknown"
            const executorResultSummary: ExecutorResultSummary = {
                finishReason,
                ...(usage?.inputTokens !== undefined ? { inputTokens: usage.inputTokens } : {}),
                ...(usage?.outputTokens !== undefined ? { outputTokens: usage.outputTokens } : {}),
                ...(usage?.totalTokens !== undefined ? { totalTokens: usage.totalTokens } : {}),
            }

            // Flatten StepVerificationResult → durable summary (booleans + arrays only).
            const verificationSummary = buildVerificationSummary(stepVerification)

            // Build tool-call records from result.steps (aggregate pass).
            // Each step exposes `toolCalls` (calls model issued) and `toolResults`
            // (results returned). We pair them by toolCallId so each record carries
            // both the call identity and result status when available.
            // `toolCallArgs` is parallel to `toolCalls` and held separately so the
            // ToolCallRecord shape stays compatible with Convex strict validators.
            const { records: toolCalls, argsByIndex: toolCallArgs } = collectToolCallRecords(steps)

            // Determine step status. "failed" if AI SDK reported an error finish
            // reason or verification mandated a non-approval pause. Approval
            // pauses are NOT failures — they are normal pause-for-user moments.
            const isFailureFinishReason = finishReason === "error"
            const isFailingVerificationPause =
                stepVerification.mustPause &&
                !!stepVerification.pauseReason &&
                !/approval|user|decision|choice/i.test(stepVerification.pauseReason)
            const stepStatus: Exclude<StepStatus, "running"> =
                isFailureFinishReason || isFailingVerificationPause ? "failed" : "completed"

            // Track whether persistence actually succeeded so we can keep the
            // observability stream consistent with the harnessRunSteps row
            // (audit fix HIGH 2). If completeStep throws, skip emitting
            // step_completed + agent_output_received so replay consumers do
            // not see a "done" event for a step that is still marked running
            // (or lacks a summary) in the persistence layer.
            let stepPersisted = false
            const completeStepStart = Date.now()
            try {
                await runStore.completeStep(activeStep.stepId, {
                    status: stepStatus,
                    executorResultSummary,
                    verificationSummary,
                    toolCalls,
                    completedAt: Date.now(),
                })
                activeStep.completed = true
                stepPersisted = true
            } catch (err) {
                console.warn(
                    `[HARNESS][persistence] completeStep failed — skipping step_completed and agent_output_received emits to keep observability consistent`,
                    err,
                )
            }
            measureStep("completeStep", Date.now() - completeStepStart)

            if (stepPersisted) {
                // Emit step_completed.
                eventStore
                    .emit({
                        eventType: HARNESS_EVENT_TYPES.STEP_COMPLETED,
                        userId,
                        sessionId: lane.sessionId,
                        chatId: lane.conversationId,
                        runId: lane.runId,
                        stepId: activeStep.stepId,
                        correlationId: lane.requestId,
                        payload: {
                            stepId: activeStep.stepId,
                            stepIndex: activeStep.stepIndex,
                            status: stepStatus,
                            finishReason,
                            toolCount: toolCalls.length,
                            blockers: verificationSummary.completionBlockers,
                            durationMs: Date.now() - activeStep.startedAt,
                        },
                    })
                    .catch(err => console.warn(`[HARNESS][event] step_completed emit failed`, err))

                // Emit agent_output_received (executor output shape).
                eventStore
                    .emit({
                        eventType: HARNESS_EVENT_TYPES.AGENT_OUTPUT_RECEIVED,
                        userId,
                        sessionId: lane.sessionId,
                        chatId: lane.conversationId,
                        runId: lane.runId,
                        stepId: activeStep.stepId,
                        correlationId: lane.requestId,
                        payload: {
                            stepId: activeStep.stepId,
                            outputTextLength: typeof result.text === "string" ? result.text.length : 0,
                            finishReason,
                            toolCallCount: toolCalls.length,
                        },
                    })
                    .catch(err => console.warn(`[HARNESS][event] agent_output_received emit failed`, err))
            }

            // Aggregate-pass tool_called + tool_result_received emission.
            // We emit one tool_called and one tool_result_received per
            // toolCallId observed in result.steps. Per-stream-part emission was
            // rejected for V1 because the chunk loop in build-step-stream.ts
            // already filters/transforms parts (pipePlanCapture, pipeYamlRender)
            // and adding side-effect emits there risks breaking the stream
            // pipeline. The cost is timestamp accuracy: emits fire at step
            // completion, not at the moment the model issued each call.
            // Note: tool emits are fire-and-forget (.catch only). Measurement
            // captures only the synchronous scheduling cost.
            const aggregateEmitStart = Date.now()
            for (let i = 0; i < toolCalls.length; i++) {
                const tc = toolCalls[i]
                const argsBlob = serializeToolArgs(toolCallArgs[i])
                eventStore
                    .emit({
                        eventType: HARNESS_EVENT_TYPES.TOOL_CALLED,
                        userId,
                        sessionId: lane.sessionId,
                        chatId: lane.conversationId,
                        runId: lane.runId,
                        stepId: activeStep.stepId,
                        correlationId: lane.requestId,
                        payload: {
                            stepId: activeStep.stepId,
                            toolName: tc.toolName,
                            ...(tc.toolCallId !== undefined ? { toolCallId: tc.toolCallId } : {}),
                            ...(argsBlob !== undefined ? { args: argsBlob } : {}),
                        },
                    })
                    .catch(err => console.warn(`[HARNESS][event] tool_called emit failed`, err))

                if (tc.resultStatus !== undefined) {
                    eventStore
                        .emit({
                            eventType: HARNESS_EVENT_TYPES.TOOL_RESULT_RECEIVED,
                            userId,
                            sessionId: lane.sessionId,
                            chatId: lane.conversationId,
                            runId: lane.runId,
                            stepId: activeStep.stepId,
                            correlationId: lane.requestId,
                            payload: {
                                stepId: activeStep.stepId,
                                toolName: tc.toolName,
                                ...(tc.toolCallId !== undefined ? { toolCallId: tc.toolCallId } : {}),
                                resultStatus: tc.resultStatus,
                            },
                        })
                        .catch(err => console.warn(`[HARNESS][event] tool_result_received emit failed`, err))
                }
            }
            measureStep("aggregateEmits", Date.now() - aggregateEmitStart)
        }

        // ── ONFINISH summary ──
        // Final breakdown line so reviewers can grep "[⏱ ONFINISH]" + "total="
        // and see where the tail latency went per request.
        const onFinishTotal = Date.now() - onFinishStart
        const breakdownStr = Object.entries(breakdown)
            .map(([k, v]) => `${k}=${v}`)
            .join(",")
        console.info(`[⏱ ONFINISH][${onFinishReqId}] total=${onFinishTotal}ms breakdown=${breakdownStr || "none"}`)
    }

    return {
        handler,
        streamContentOverrideRef,
        capturedSpecRef,
        capturedPlanSpecRef,
    }
}

// ────────────────────────────────────────────────────────────────
// Persistence helpers (Task 6.4b)
// ────────────────────────────────────────────────────────────────

/** Flatten StepVerificationResult to the durable summary shape. */
function buildVerificationSummary(v: StepVerificationResult): StepVerificationSummary {
    return {
        canContinue: v.canContinue,
        mustPause: v.mustPause,
        ...(v.pauseReason !== undefined ? { pauseReason: v.pauseReason } : {}),
        canComplete: v.canComplete,
        completionBlockers: v.completionBlockers,
        leakageDetected: v.leakageDetected,
        artifactChainComplete: v.artifactChainComplete,
        planComplete: v.planComplete,
        streamContentOverridden: v.streamContentOverride !== undefined,
    }
}

/**
 * Walk result.steps and pair toolCalls with their toolResults by toolCallId.
 * Returns BOTH:
 *   - `records`: clean ToolCallRecord[] for runStore.completeStep (Convex
 *     v.object validators reject extra fields, so this is strict).
 *   - `argsByIndex`: per-record args payload kept off the record so it can be
 *     attached only to tool_called emits.
 *
 * A tool result without a matching call is ignored. A tool call without a
 * matching result is recorded with `resultStatus = undefined`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectToolCallRecords(steps: any[] | undefined): {
    records: ToolCallRecord[]
    argsByIndex: Array<unknown>
} {
    if (!Array.isArray(steps)) return { records: [], argsByIndex: [] }
    const records: ToolCallRecord[] = []
    const argsByIndex: Array<unknown> = []
    for (const step of steps) {
        const calls = (step?.toolCalls ?? []) as Array<{
            toolName?: string
            toolCallId?: string
            args?: unknown
            input?: unknown
        }>
        const results = (step?.toolResults ?? []) as Array<{
            toolCallId?: string
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result?: any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            output?: any
            isError?: boolean
        }>
        const resultByCallId = new Map<string, (typeof results)[number]>()
        for (const r of results) {
            if (r?.toolCallId) resultByCallId.set(r.toolCallId, r)
        }
        for (const call of calls) {
            if (!call?.toolName) continue
            const matched = call.toolCallId ? resultByCallId.get(call.toolCallId) : undefined
            const resultStatus = matched
                ? matched.isError === true
                    ? "error"
                    : "success"
                : undefined
            records.push({
                toolName: call.toolName,
                ...(call.toolCallId !== undefined ? { toolCallId: call.toolCallId } : {}),
                ...(resultStatus !== undefined ? { resultStatus } : {}),
            })
            argsByIndex.push(call.args !== undefined ? call.args : call.input)
        }
    }
    return { records, argsByIndex }
}

/** Cap tool args at ~2KB when serialized to keep event payloads manageable. */
function serializeToolArgs(args: unknown): unknown {
    if (args === undefined) return undefined
    try {
        const json = typeof args === "string" ? args : JSON.stringify(args)
        if (typeof json !== "string") return undefined
        const MAX = 2048
        if (json.length <= MAX) {
            return typeof args === "string" ? args : JSON.parse(json)
        }
        return { __truncated: true, preview: json.slice(0, MAX), originalLength: json.length }
    } catch {
        return { __truncated: true, reason: "serialize_failed" }
    }
}
