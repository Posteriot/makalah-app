/**
 * Synchronous harness orchestrator (Phase 7, Task 7.1b).
 *
 * Owns the 13-step execution engine lifted from `src/app/api/chat/route.ts`.
 * Calls existing harness phase modules (entry / context / policy / executor /
 * verification / persistence) in the order the legacy route did, with two
 * deliberate changes:
 *   1. Tool registry now runs AFTER policy (Q2 decision — policy-derived
 *      `forcedToolChoice` / `allowedToolNames` must be visible to the tool
 *      builder in the future; preserved ordering here to keep the seam).
 *   2. Paper context is resolved once in step 5 (a single aggregated object)
 *      and threaded explicitly to every downstream consumer — no more
 *      closure capture of `paperSession` in `getCurrentPlanSnapshot` or
 *      the fallback path (Q4 decision). (The legacy `saveAssistantMessageLocal`
 *      wrapper has no consumer in this orchestrator and is intentionally
 *      not reproduced — persistence lives in the executor's `onFinishConfig`.)
 *
 * Pause control-flow (Q5):
 *   After policy evaluation, if `policyDecision.requiresApproval === true`
 *   the orchestrator returns `{ kind: "paused", ... }`. Phase 8 extends this
 *   with `runStore.updateStatus("paused", ...)` + pending-decision row
 *   creation; Phase 7 only establishes the early-return seam.
 *
 * Fidelity contract:
 *   Zero behavior change. All `[PAPER][*]` / `[FREE-TEXT-CONTEXT]` /
 *   `[HARNESS][*]` logs fire at the same call sites; all telemetry events
 *   (`logAiTelemetry`) fire with identical labels; stream output is
 *   semantically equivalent to pre-Phase-7.
 */
import * as Sentry from "@sentry/nextjs"
import type { ToolSet } from "ai"

import { getSystemPrompt } from "@/lib/ai/chat-config"
import { getPaperModeSystemPrompt } from "@/lib/ai/paper-mode-prompt"
import { createPaperToolTracker } from "@/lib/ai/paper-tools"
import { getSearchSkill } from "@/lib/ai/skills"
import { logAiTelemetry, classifyError } from "@/lib/ai/telemetry"
import type { PlanSpec } from "@/lib/ai/harness/plan-spec"

import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"
import type { PaperStageId } from "../../../../convex/paperSessions/constants"

import {
    resolveConversation,
    resolveAttachments,
    persistUserMessage,
    validateChoiceInteraction,
    resolveRunLane,
} from "../entry"
import {
    assembleStepContext,
    buildExactSourceRouting,
    buildForcedSyncStatusMessage,
} from "../context"
import { evaluateRuntimePolicy } from "../policy"
import {
    buildToolRegistry,
    buildStepStream,
} from "../executor"
import type {
    PaperSessionForExecutor,
    PaperTurnObservability,
} from "../executor/types"
import type { RunLane } from "../types"
import type { ResolvedStepContext } from "../context/types"
import type { RuntimePolicyDecision } from "../policy/types"
import type { AcceptedChatRequest } from "../types/runtime"
import type { RunStore, EventStore } from "../persistence"

import type {
    PaperContextResolution,
    SyncRunContext,
    SyncRunResult,
} from "./types"

// ═══════════════════════════════════════════════════════════════════════
// Entry point
// ═══════════════════════════════════════════════════════════════════════

export async function orchestrateSyncRun(
    ctx: SyncRunContext,
): Promise<SyncRunResult> {
    const { accepted, runStore, eventStore } = ctx

    // ── Step 1: resolve conversation ──────────────────────────────────
    const conversation = await resolveConversation({
        conversationId: accepted.conversationId,
        userId: accepted.userId,
        firstUserContent: accepted.firstUserContent,
        fetchQueryWithToken: accepted.fetchQueryWithToken,
        fetchMutationWithToken: accepted.fetchMutationWithToken,
    })

    // ── Step 2: resolve run lane (creates harnessRuns + emits run_started)
    const lane = await resolveRunLane({
        requestId: accepted.requestId,
        conversationId: conversation.conversationId,
        userId: accepted.userId,
        isNewConversation: conversation.isNewConversation,
        runStore,
        eventStore,
        fetchQuery: accepted.fetchQueryWithToken,
    })

    // ── Step 3: resolve attachments ───────────────────────────────────
    const attachments = await resolveAttachments({
        conversationId: conversation.conversationId,
        messages: accepted.messages,
        requestFileIds: accepted.requestFileIds,
        requestedAttachmentMode: accepted.requestedAttachmentMode,
        replaceAttachmentContext: accepted.replaceAttachmentContext,
        inheritAttachmentContext: accepted.inheritAttachmentContext,
        clearAttachmentContext: accepted.clearAttachmentContext,
        fetchQueryWithToken: accepted.fetchQueryWithToken,
        fetchMutationWithToken: accepted.fetchMutationWithToken,
    })

    // ── Step 4: persist user message (+ emits user_message_received) ──
    const msgResult = await persistUserMessage({
        messages: accepted.messages,
        conversationId: conversation.conversationId,
        effectiveFileIds: attachments.effectiveFileIds,
        requestedAttachmentMode: accepted.requestedAttachmentMode,
        attachmentResolution: attachments.attachmentResolution,
        fetchMutationWithToken: accepted.fetchMutationWithToken,
        eventStore,
        lane,
        userId: accepted.userId,
    })
    if (msgResult instanceof Response) {
        return { kind: "stream", response: msgResult }
    }

    // System prompt (global). Resolved once, shared across all paths.
    const systemPrompt = await getSystemPrompt()

    // ── Step 5: resolve paper-mode context ────────────────────────────
    const paperContext = await resolvePaperContext({
        accepted,
        conversationId: conversation.conversationId,
    })

    // ── Step 6: validate choice interaction (depends on paperSession) ─
    const choiceResult = await validateChoiceInteraction({
        choiceInteractionEvent: accepted.choiceInteractionEvent,
        conversationId: conversation.conversationId,
        // Cast mirrors route.ts: Convex return is structurally compatible with
        // PaperSessionForChoice; PaperSessionForExecutor uses a narrower
        // `stageData: unknown` that must be widened at the call site.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        paperSession: paperContext.paperSession as any,
        paperStageScope: paperContext.paperStageScope,
        paperModePrompt: paperContext.paperModePrompt,
        eventStore,
        lane,
        userId: accepted.userId,
    })
    if (choiceResult instanceof Response) {
        // Stale choice (409) — the 409 IS the user-facing response.
        return { kind: "stream", response: choiceResult }
    }
    const { resolvedWorkflow, choiceContextNote } = choiceResult

    const isPaperMode = !!paperContext.paperModePrompt

    // Skill telemetry context (depends on paperContext + isPaperMode).
    const skillTelemetryContext = isPaperMode
        ? {
              skillResolverFallback: paperContext.skillResolverFallback,
              stageScope: paperContext.paperStageScope,
              stageInstructionSource: paperContext.stageInstructionSource,
              activeSkillId: paperContext.activeSkillId,
              activeSkillVersion: paperContext.activeSkillVersion,
              fallbackReason: paperContext.fallbackReason,
          }
        : {}

    // ── Step 7: assemble step context ─────────────────────────────────
    const stepContext = await assembleStepContext({
        accepted,
        conversation,
        attachments,
        // Cast mirrors route.ts: assembleStepContext expects a concrete
        // stageData shape while PaperSessionForExecutor uses `unknown`.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        paperSession: paperContext.paperSession as any,
        paperModePrompt: paperContext.paperModePrompt,
        paperStageScope: paperContext.paperStageScope,
        isDraftingStage: paperContext.isDraftingStage,
        isHasilPostChoice: paperContext.isHasilPostChoice,
        isPostEditResendReset: paperContext.isPostEditResendReset,
        choiceContextNote,
        freeTextContextNote: paperContext.freeTextContextNote,
        resolvedWorkflow,
        systemPrompt,
        skillTelemetryContext,
        skillResolverFallback: paperContext.skillResolverFallback,
    })
    if (stepContext instanceof Response) {
        return { kind: "stream", response: stepContext }
    }

    // ── Step 8: evaluate runtime policy (async post-Phase-6) ──────────
    const policyDecision = await evaluateRuntimePolicy({
        enforcerContext: {
            paperSession: paperContext.paperSession,
            paperStageScope: paperContext.paperStageScope,
            paperToolTracker: paperContext.paperToolTracker,
            resolvedWorkflow,
            choiceInteractionEvent: accepted.choiceInteractionEvent,
        },
        exactSourceRouting: stepContext.exactSourceRouting,
        forcedSyncPrepareStep: stepContext.forcedSyncPrepareStep,
        forcedToolChoice: stepContext.forcedToolChoice,
        runStore,
        eventStore,
        lane,
        userId: accepted.userId,
    })

    // ── Step 8.5: pause seam (Phase 8 extension point) ────────────────
    if (policyDecision.requiresApproval) {
        return {
            kind: "paused",
            runId: lane.runId,
            // Phase 8 populates via runStore.updateStatus + pending-decision row.
            pendingDecisionId: null,
        }
    }

    // ── Step 9: build tool registry (AFTER policy per Q2 decision) ────
    const skill = getSearchSkill()
    const tools = buildToolRegistry({
        conversationId: conversation.conversationId,
        userId: accepted.userId,
        paperSession: paperContext.paperSession,
        paperStageScope: paperContext.paperStageScope,
        paperToolTracker: paperContext.paperToolTracker,
        paperTurnObservability: paperContext.paperTurnObservability,
        resolvedWorkflow,
        fetchQueryWithToken: accepted.fetchQueryWithToken,
        fetchMutationWithToken: accepted.fetchMutationWithToken,
        skill,
        recentSourcesList: stepContext.recentSourcesList,
        hasRecentSourcesInDb: stepContext.hasRecentSourcesInDb,
        convexToken: accepted.convexToken,
        modelProvider: stepContext.modelNames.primary.provider,
        isPaperMode,
    })

    // ── Step 10: build telemetry scope ────────────────────────────────
    const telemetry = buildTelemetryScope({
        stepContext,
        skillTelemetryContext,
        isPaperMode,
        paperContext,
        accepted,
        conversationId: conversation.conversationId,
    })

    // ── Step 11: primary stream execution ─────────────────────────────
    try {
        const primaryMessageId =
            globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

        const response = buildStepStream({
            executionConfig: {
                model: stepContext.model,
                messages: stepContext.messages,
                tools,
                prepareStep: policyDecision.prepareStep,
                stopWhen: undefined,
                maxSteps: stepContext.maxSteps,
                modelName: stepContext.modelNames.primary.model,
                toolChoice: stepContext.toolChoice,
                providerOptions: stepContext.providerOptions,
                samplingOptions: stepContext.samplingOptions,
                runStore,
                eventStore,
            },
            onFinishConfig: {
                conversationId: conversation.conversationId,
                userId: accepted.userId,
                modelName: stepContext.modelNames.primary.model,
                model: stepContext.model,
                requestId: accepted.requestId,
                convexToken: accepted.convexToken,
                billingContext: accepted.billingContext,
                paperSession: paperContext.paperSession,
                paperStageScope: paperContext.paperStageScope,
                paperToolTracker: paperContext.paperToolTracker,
                paperTurnObservability: paperContext.paperTurnObservability,
                resolvedWorkflow,
                choiceInteractionEvent: accepted.choiceInteractionEvent,
                isCompileThenFinalize: policyDecision.isCompileThenFinalize,
                normalizedLastUserContent: stepContext.normalizedLastUserContent,
                lane,
                maybeUpdateTitleFromAI: conversation.maybeUpdateTitleFromAI,
                fetchQueryWithToken: accepted.fetchQueryWithToken,
                fetchMutationWithToken: accepted.fetchMutationWithToken,
                requestStartedAt: accepted.requestStartedAt,
                isDraftingStage: paperContext.isDraftingStage,
                isHasilPostChoice: paperContext.isHasilPostChoice,
                buildLeakageSnippet: buildLeakageSnippetFn,
                enableGroundingExtraction: true,
                enableSourceTitleEnrichment: true,
                enableRevisionClassifier: true,
                enablePlanSpecFallbackExtraction: true,
                runStore,
                eventStore,
            },
            streamContext: {
                messageId: primaryMessageId,
                reasoningTrace: {
                    enabled: telemetry.reasoningTraceEnabled,
                    controller: null,
                    snapshot: undefined,
                    sourceCount: 0,
                    captureSnapshot: () => {},
                },
                telemetry: {
                    provider: stepContext.modelNames.primary.provider,
                    model: stepContext.modelNames.primary.model,
                    isPrimaryProvider: true,
                    failoverUsed: false,
                    toolUsed: telemetry.forcedToolTelemetryName,
                    mode: isPaperMode ? "paper" : "normal",
                    startTime: telemetry.telemetryStartTime,
                    skillContext: telemetry.telemetrySkillContext,
                },
                shouldForceGetCurrentPaperState: telemetry.shouldForceGetCurrentPaperState,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                buildForcedSyncStatusMessage: buildForcedSyncStatusMessage as any,
                getCurrentPlanSnapshot: () =>
                    getCurrentPlanSnapshot(paperContext.paperSession, paperContext.paperStageScope),
                enforcerStepStartTime: policyDecision.stepTimingRef.current,
                activeStep: null,
            },
            reasoningTraceEnabled: telemetry.reasoningTraceEnabled,
            enablePlanCapture: !!paperContext.paperStageScope,
            enableYamlRender: paperContext.isDraftingStage,
            transparentReasoningEnabled: telemetry.isTransparentReasoning,
            traceMode: telemetry.getTraceModeLabel(!!paperContext.paperModePrompt, false),
            logTag: "",
        })

        return { kind: "stream", response }
    } catch (error) {
        // ── Step 12: fallback path ────────────────────────────────────
        const fallbackResponse = await attemptFallbackExecution({
            accepted,
            lane,
            paperContext,
            stepContext,
            policyDecision,
            tools,
            telemetry,
            runStore,
            eventStore,
            resolvedWorkflow,
            conversationId: conversation.conversationId,
            maybeUpdateTitleFromAI: conversation.maybeUpdateTitleFromAI,
            isPaperMode,
            skillTelemetryContext,
            originalError: error,
        })
        return { kind: "stream", response: fallbackResponse }
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Step 5 helper — paper-mode context resolution
// ═══════════════════════════════════════════════════════════════════════

async function resolvePaperContext(params: {
    accepted: AcceptedChatRequest
    conversationId: Id<"conversations">
}): Promise<PaperContextResolution> {
    const { accepted, conversationId } = params

    const paperModeContext = await getPaperModeSystemPrompt(
        conversationId,
        accepted.userId,
        accepted.convexToken,
        accepted.requestId,
    )
    const paperModePrompt = paperModeContext.prompt || null
    const skillResolverFallback = paperModeContext.skillResolverFallback

    const paperSession = paperModePrompt
        ? ((await accepted.fetchQueryWithToken(api.paperSessions.getByConversation, {
              conversationId,
          })) as PaperSessionForExecutor | null)
        : null

    const paperStageScope =
        paperSession && paperSession.currentStage !== "completed"
            ? (paperSession.currentStage as PaperStageId)
            : undefined
    const isDraftingStage = !!paperStageScope && paperSession?.stageStatus === "drafting"

    // Post-edit-resend-reset: drafting but stageData is empty (only revisionCount).
    const currentStageDataKeys = paperSession?.stageData
        ? Object.keys(
              (paperSession.stageData as Record<string, Record<string, unknown>>)[
                  paperSession.currentStage
              ] ?? {},
          ).filter((k) => k !== "revisionCount")
        : []
    const isPostEditResendReset =
        !!paperStageScope &&
        paperSession?.stageStatus === "drafting" &&
        currentStageDataKeys.length === 0

    console.info(
        `[PAPER][session-resolve] stage=${paperSession?.currentStage ?? "none"} status=${
            paperSession?.stageStatus ?? "none"
        } hasPrompt=${!!paperModePrompt} skillFallback=${skillResolverFallback} stageInstructionSource=${
            paperModeContext.stageInstructionSource
        }${isPostEditResendReset ? " postEditResendReset=true" : ""}`,
    )

    const isHasilPostChoice = accepted.choiceInteractionEvent?.stage === "hasil"
    const paperToolTracker = createPaperToolTracker()
    const paperTurnObservability: PaperTurnObservability = {
        firstLeakageMatch: null,
        firstLeakageSnippet: null,
        firstLeakageAtMs: null,
        createArtifactAtMs: null,
        updateArtifactAtMs: null,
    }

    // Free-text context note.
    let freeTextContextNote: string | undefined
    if (!accepted.choiceInteractionEvent && paperStageScope && isDraftingStage) {
        const sd = (paperSession?.stageData as
            | Record<string, Record<string, unknown>>
            | undefined)?.[paperStageScope]
        const plan = sd?._plan as { tasks?: { label: string; status: string }[] } | undefined
        const hasArtifact = !!sd?.artifactId
        const completedTasks = plan?.tasks?.filter((t) => t.status === "complete").length ?? 0
        const totalTasks = plan?.tasks?.length ?? 0
        const allTasksComplete = totalTasks > 0 && completedTasks === totalTasks

        const lines: string[] = [
            `═══ FREE-TEXT TURN CONTEXT ═══`,
            `Stage: ${paperStageScope} | Status: drafting | Plan: ${
                totalTasks === 0 ? "not yet generated" : `${completedTasks}/${totalTasks} tasks complete`
            }`,
            ``,
            `The user is responding via free text, not a choice card button.`,
            `Interpret their message as a direction choice — they may be:`,
            `- Selecting a direction from your previous suggestions`,
            `- Asking to continue discussion on a specific aspect`,
            `- Requesting to finalize the stage`,
            ``,
            `Respond as if they selected the most relevant option from your last response.`,
            `Do NOT ask them to use a button or re-present the same options.`,
        ]

        if (allTasksComplete && !hasArtifact) {
            lines.push(
                ``,
                `NOTE: All plan tasks are complete but no artifact has been created yet.`,
                `If the user's message indicates agreement or readiness to proceed,`,
                `treat it as a finalize signal: updateStageData → createArtifact → submitStageForValidation.`,
            )
        }

        lines.push(`═══════════════════════════════`)
        freeTextContextNote = lines.join("\n")
        console.info(
            `[FREE-TEXT-CONTEXT] stage=${paperStageScope} plan=${
                totalTasks === 0 ? "none" : `${completedTasks}/${totalTasks}`
            } hasArtifact=${hasArtifact} finalizeHint=${allTasksComplete && !hasArtifact}`,
        )
    }

    // Billing context mutation — critical timing: AFTER paperSession fetch,
    // BEFORE downstream context assembly. Preserves route.ts L202-205 semantics.
    if (paperSession) {
        accepted.billingContext.operationType = "paper_generation"
    }

    return {
        paperSession,
        paperModePrompt,
        paperStageScope,
        isDraftingStage,
        isPostEditResendReset,
        isHasilPostChoice,
        paperToolTracker,
        paperTurnObservability,
        freeTextContextNote,
        skillResolverFallback,
        stageInstructionSource: paperModeContext.stageInstructionSource,
        activeSkillId: paperModeContext.activeSkillId,
        activeSkillVersion: paperModeContext.activeSkillVersion,
        fallbackReason: paperModeContext.fallbackReason,
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Step 10 helper — telemetry scope aggregation
// ═══════════════════════════════════════════════════════════════════════

interface TelemetryScope {
    telemetryStartTime: number
    reasoningTraceEnabled: boolean
    isTransparentReasoning: boolean
    getTraceModeLabel: (isPaper: boolean, webSearch: boolean) => "normal" | "paper" | "websearch"
    shouldForceGetCurrentPaperState: boolean
    shouldForceSubmitValidation: boolean
    forcedToolTelemetryName: string | undefined
    telemetrySkillContext: Record<string, unknown>
}

function buildTelemetryScope(params: {
    stepContext: ResolvedStepContext
    skillTelemetryContext: Record<string, unknown>
    isPaperMode: boolean
    paperContext: PaperContextResolution
    accepted: AcceptedChatRequest
    conversationId: Id<"conversations">
}): TelemetryScope {
    const { stepContext, skillTelemetryContext } = params

    const telemetryStartTime = Date.now()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reasoningSettings = stepContext.reasoningSettings as any
    const reasoningTraceEnabled =
        reasoningSettings.traceMode === "curated" ||
        reasoningSettings.traceMode === "transparent"
    const isTransparentReasoning = reasoningSettings.traceMode === "transparent"
    const getTraceModeLabel = (
        isPaper: boolean,
        webSearch: boolean,
    ): "normal" | "paper" | "websearch" => {
        if (webSearch) return "websearch"
        if (isPaper) return "paper"
        return "normal"
    }

    const shouldForceGetCurrentPaperState = !!stepContext.forcedSyncPrepareStep
    const shouldForceSubmitValidation = !!stepContext.forcedToolChoice
    const forcedToolTelemetryName = shouldForceGetCurrentPaperState
        ? "getCurrentPaperState"
        : undefined
    const telemetrySkillContext = forcedToolTelemetryName
        ? { ...skillTelemetryContext, fallbackReason: "explicit_sync_request" }
        : skillTelemetryContext

    return {
        telemetryStartTime,
        reasoningTraceEnabled,
        isTransparentReasoning,
        getTraceModeLabel,
        shouldForceGetCurrentPaperState,
        shouldForceSubmitValidation,
        forcedToolTelemetryName,
        telemetrySkillContext,
    }
}

// ═══════════════════════════════════════════════════════════════════════
// paperSession-parameterized helpers (Q4 — no closure capture)
// ═══════════════════════════════════════════════════════════════════════

function getCurrentPlanSnapshot(
    paperSession: PaperSessionForExecutor | null,
    paperStageScope: PaperStageId | undefined,
): PlanSpec | undefined {
    if (!paperSession?.stageData || !paperStageScope) return undefined
    const sd = paperSession.stageData as Record<string, Record<string, unknown>>
    return (sd[paperStageScope]?._plan as PlanSpec | undefined) ?? undefined
}

// Leakage-snippet helper duplicated from route.ts (used in onFinishConfig).
function buildLeakageSnippetFn(text: string, matchIndex: number, matchValue: string): string {
    const start = Math.max(0, matchIndex - 120)
    const end = Math.min(text.length, matchIndex + matchValue.length + 120)
    return text.slice(start, end).replace(/\s+/g, " ").trim()
}

// ═══════════════════════════════════════════════════════════════════════
// Step 12 — fallback execution path
// ═══════════════════════════════════════════════════════════════════════

async function attemptFallbackExecution(params: {
    accepted: AcceptedChatRequest
    lane: RunLane
    paperContext: PaperContextResolution
    stepContext: ResolvedStepContext
    policyDecision: RuntimePolicyDecision
    tools: ToolSet
    telemetry: TelemetryScope
    runStore: RunStore
    eventStore: EventStore
    resolvedWorkflow: ReturnType<() => unknown> | undefined
    conversationId: Id<"conversations">
    maybeUpdateTitleFromAI: (opts: {
        assistantText: string
        minPairsForFinalTitle: number
    }) => Promise<void>
    isPaperMode: boolean
    skillTelemetryContext: Record<string, unknown>
    originalError: unknown
}): Promise<Response> {
    const {
        accepted,
        lane,
        paperContext,
        stepContext,
        tools,
        telemetry,
        runStore,
        eventStore,
        resolvedWorkflow,
        conversationId,
        maybeUpdateTitleFromAI,
        isPaperMode,
        skillTelemetryContext,
        originalError,
    } = params

    console.error("Gateway stream failed, trying fallback:", originalError)
    Sentry.addBreadcrumb({
        category: "ai.failover",
        message: `Primary provider failed, switching to fallback`,
        level: "warning",
        data: { errorType: classifyError(originalError).errorType },
    })

    // Primary-failure telemetry ───────────────────────────────────────
    const primaryErrorInfo = classifyError(originalError)
    logAiTelemetry({
        token: accepted.convexToken,
        userId: accepted.userId,
        conversationId,
        provider: stepContext.modelNames.primary.provider as "vercel-gateway" | "openrouter",
        model: stepContext.modelNames.primary.model,
        isPrimaryProvider: true,
        failoverUsed: false,
        toolUsed: stepContext.searchDecision.enableWebSearch ? "perplexity_search" : undefined,
        mode: stepContext.searchDecision.enableWebSearch
            ? "websearch"
            : isPaperMode
              ? "paper"
              : "normal",
        success: false,
        errorType: primaryErrorInfo.errorType,
        errorMessage: primaryErrorInfo.errorMessage,
        latencyMs: Date.now() - telemetry.telemetryStartTime,
        ...skillTelemetryContext,
    })

    // Dynamic imports (deferred like route.ts) ────────────────────────
    const { getOpenRouterModel, buildReasoningProviderOptions } = await import(
        "@/lib/ai/streaming"
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reasoningSettings = stepContext.reasoningSettings as any

    const fallbackReasoningProviderOptions = buildReasoningProviderOptions({
        settings: reasoningSettings,
        target: "fallback",
        profile: "narrative",
    })

    const fallbackModel = await getOpenRouterModel({ enableWebSearch: false })
    const fallbackForcedToolChoice = telemetry.shouldForceSubmitValidation
        ? ({ type: "tool", toolName: "submitStageForValidation" } as const)
        : undefined
    const fallbackMaxToolSteps = telemetry.shouldForceGetCurrentPaperState ? 2 : 5
    const fallbackDeterministicSyncPrepareStep = telemetry.shouldForceGetCurrentPaperState
        ? ({ stepNumber }: { stepNumber: number }) => {
              if (stepNumber === 0) {
                  return {
                      toolChoice: { type: "tool", toolName: "getCurrentPaperState" } as const,
                      activeTools: ["getCurrentPaperState"] as string[],
                  }
              }
              if (stepNumber === 1) {
                  return {
                      toolChoice: "none" as const,
                      activeTools: [] as string[],
                  }
              }
              return undefined
          }
        : undefined

    // Re-derive exact-source routing for fallback messages.
    const fallbackExactSourceRouting = buildExactSourceRouting({
        exactSourceResolution: stepContext.exactSourceResolution,
        enableWebSearch: false,
        forcedSyncPrepareStep: stepContext.forcedSyncPrepareStep,
        forcedToolChoice: fallbackForcedToolChoice,
        availableExactSources: stepContext.availableExactSources,
        messages: stepContext.messages,
        stageStatus: paperContext.paperSession?.stageStatus as string | undefined,
    })

    const fallbackMessageId =
        globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

    // Re-evaluate policy for fallback with its own exact-source routing.
    const fallbackPolicyDecision = await evaluateRuntimePolicy({
        enforcerContext: {
            paperSession: paperContext.paperSession,
            paperStageScope: paperContext.paperStageScope,
            paperToolTracker: paperContext.paperToolTracker,
            resolvedWorkflow: resolvedWorkflow as Parameters<
                typeof evaluateRuntimePolicy
            >[0]["enforcerContext"]["resolvedWorkflow"],
            choiceInteractionEvent: accepted.choiceInteractionEvent,
        },
        exactSourceRouting: {
            mode: fallbackExactSourceRouting.prepareStep ? "force-inspect" : "none",
            matchedSourceId: stepContext.exactSourceRouting.matchedSourceId,
            prepareStep: fallbackExactSourceRouting.prepareStep,
        },
        forcedSyncPrepareStep: fallbackDeterministicSyncPrepareStep,
        forcedToolChoice: fallbackForcedToolChoice,
        runStore,
        eventStore,
        lane,
        userId: accepted.userId,
    })

    const fallbackTransparent =
        telemetry.isTransparentReasoning && reasoningSettings.fallback.supported

    return buildStepStream({
        executionConfig: {
            model: fallbackModel,
            messages: fallbackExactSourceRouting.messages,
            tools,
            prepareStep: fallbackPolicyDecision.prepareStep,
            stopWhen: undefined,
            maxSteps: fallbackExactSourceRouting.maxToolSteps ?? fallbackMaxToolSteps,
            modelName: stepContext.modelNames.fallback.model,
            toolChoice: fallbackForcedToolChoice,
            providerOptions: fallbackReasoningProviderOptions,
            samplingOptions: stepContext.samplingOptions,
            runStore,
            eventStore,
        },
        onFinishConfig: {
            conversationId,
            userId: accepted.userId,
            modelName: stepContext.modelNames.fallback.model,
            model: fallbackModel,
            requestId: accepted.requestId,
            convexToken: accepted.convexToken,
            billingContext: accepted.billingContext,
            paperSession: paperContext.paperSession,
            paperStageScope: paperContext.paperStageScope,
            paperToolTracker: paperContext.paperToolTracker,
            paperTurnObservability: paperContext.paperTurnObservability,
            resolvedWorkflow: resolvedWorkflow as Parameters<
                typeof buildStepStream
            >[0]["onFinishConfig"]["resolvedWorkflow"],
            choiceInteractionEvent: accepted.choiceInteractionEvent,
            isCompileThenFinalize: fallbackPolicyDecision.isCompileThenFinalize,
            normalizedLastUserContent: stepContext.normalizedLastUserContent,
            lane,
            maybeUpdateTitleFromAI,
            fetchQueryWithToken: accepted.fetchQueryWithToken,
            fetchMutationWithToken: accepted.fetchMutationWithToken,
            requestStartedAt: accepted.requestStartedAt,
            isDraftingStage: paperContext.isDraftingStage,
            isHasilPostChoice: paperContext.isHasilPostChoice,
            buildLeakageSnippet: buildLeakageSnippetFn,
            enableGroundingExtraction: false,
            enableSourceTitleEnrichment: false,
            enableRevisionClassifier: false,
            enablePlanSpecFallbackExtraction: false,
            runStore,
            eventStore,
        },
        streamContext: {
            messageId: fallbackMessageId,
            reasoningTrace: {
                enabled: telemetry.reasoningTraceEnabled,
                controller: null,
                snapshot: undefined,
                sourceCount: 0,
                captureSnapshot: () => {},
            },
            telemetry: {
                provider: stepContext.modelNames.fallback.provider,
                model: stepContext.modelNames.fallback.model,
                isPrimaryProvider: false,
                failoverUsed: true,
                toolUsed: undefined,
                mode: isPaperMode ? "paper" : "normal",
                startTime: telemetry.telemetryStartTime,
                skillContext: skillTelemetryContext,
            },
            shouldForceGetCurrentPaperState: telemetry.shouldForceGetCurrentPaperState,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            buildForcedSyncStatusMessage: buildForcedSyncStatusMessage as any,
            getCurrentPlanSnapshot: () =>
                getCurrentPlanSnapshot(
                    paperContext.paperSession,
                    paperContext.paperStageScope,
                ),
            enforcerStepStartTime: undefined,
            activeStep: null,
        },
        reasoningTraceEnabled: telemetry.reasoningTraceEnabled,
        enablePlanCapture: !!paperContext.paperStageScope,
        enableYamlRender: paperContext.isDraftingStage,
        transparentReasoningEnabled: fallbackTransparent,
        traceMode: telemetry.getTraceModeLabel(!!paperContext.paperModePrompt, false),
        logTag: "[fallback]",
    })
}
