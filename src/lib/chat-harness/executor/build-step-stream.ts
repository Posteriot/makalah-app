import {
    createUIMessageStream,
    createUIMessageStreamResponse,
    streamText,
    stepCountIs,
} from "ai"
import { createCuratedTraceController } from "@/lib/ai/curated-trace"
import type { PersistedCuratedTraceSnapshot } from "@/lib/ai/curated-trace"
import { createReasoningLiveAccumulator } from "@/lib/ai/reasoning-live-stream"
import type { ReasoningLiveDataPart } from "@/lib/ai/curated-trace"
import { pipePlanCapture } from "@/lib/ai/harness/pipe-plan-capture"
import { pipeYamlRender } from "@json-render/yaml"
import { PLAN_DATA_PART_TYPE } from "@/lib/ai/harness/plan-spec"
import type { PlanSpec } from "@/lib/ai/harness/plan-spec"
import { SPEC_DATA_PART_TYPE, applySpecPatch } from "@json-render/core"
import type { Spec, JsonPatch } from "@json-render/core"
import { paperRecoveryLeakagePattern } from "@/lib/chat/choice-outcome-guard"
import { verifyStepOutcome } from "../verification"
import { buildOnFinishHandler } from "./build-on-finish-handler"
import type { OnFinishStreamContext } from "./build-on-finish-handler"
import type {
    StepExecutionConfig,
    OnFinishConfig,
    StreamPipelineConfig,
} from "./types"

// ────────────────────────────────────────────────────────────────
// Stream Pipeline Configuration
// ────────────────────────────────────────────────────────────────

/** Extended configuration for the stream pipeline beyond StepExecutionConfig. */
export interface StreamPipelineParams extends StreamPipelineConfig {
    /** Whether transparent reasoning is enabled for this stream (primary vs fallback may differ). */
    transparentReasoningEnabled: boolean
    /** Trace mode label for the curated trace controller. */
    traceMode: "normal" | "paper" | "websearch"
    /** Log tag for differentiating primary vs fallback in console output. */
    logTag: string
}

/** Callback to capture the reasoning trace snapshot externally (for persistence outside stream). */
export type CaptureReasoningSnapshotFn = (snapshot: PersistedCuratedTraceSnapshot) => void

// ────────────────────────────────────────────────────────────────
// Helper: reasoning accumulator (wraps createReasoningLiveAccumulator
// with writer + compat thought emission)
// ────────────────────────────────────────────────────────────────

function createReasoningAccumulator(opts: {
    traceId: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writer: { write: (data: any) => void }
    ensureStart: () => void
    enabled: boolean
}) {
    const liveAccumulator = createReasoningLiveAccumulator({
        traceId: opts.traceId,
        enabled: opts.enabled,
    })

    const emitCompatThought = (part: ReasoningLiveDataPart) => {
        opts.writer.write({
            type: "data-reasoning-thought",
            id: `${part.id}-compat`,
            data: {
                traceId: part.data.traceId,
                delta: part.data.text,
                ts: part.data.ts,
            },
        })
    }

    return {
        onReasoningDelta: (delta: string) => {
            const livePart = liveAccumulator.onReasoningDelta(delta)
            if (!livePart) return

            opts.ensureStart()
            opts.writer.write(livePart)
            emitCompatThought(livePart)
        },
        finalize: () => {
            const livePart = liveAccumulator.finalize()
            if (!livePart) return

            opts.ensureStart()
            opts.writer.write(livePart)
            emitCompatThought(livePart)
        },
        getFullReasoning: () => liveAccumulator.getFullReasoning(),
        hasReasoning: () => liveAccumulator.hasReasoning(),
    }
}

// ────────────────────────────────────────────────────────────────
// Helper: async iterate a ReadableStream
// ReadableStream from pipeYamlRender may not have [Symbol.asyncIterator]
// in all runtimes, so use a reader-based async generator.
// ────────────────────────────────────────────────────────────────

async function* iterateStream<T>(stream: ReadableStream<T>): AsyncGenerator<T> {
    const reader = stream.getReader()
    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            yield value
        }
    } finally {
        reader.releaseLock()
    }
}

// ────────────────────────────────────────────────────────────────
// Helper: extract tool name from stream chunk
// ────────────────────────────────────────────────────────────────

function getToolNameFromChunk(chunk: unknown): string | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = chunk as any
    return c?.toolName ?? c?.data?.toolName ?? c?.name ?? undefined
}

// ────────────────────────────────────────────────────────────────
// Helper: build leakage snippet for observability
// ────────────────────────────────────────────────────────────────

function buildLeakageSnippet(text: string, matchIndex: number, matchValue: string): string {
    const start = Math.max(0, matchIndex - 120)
    const end = Math.min(text.length, matchIndex + matchValue.length + 120)
    return text.slice(start, end).replace(/\s+/g, " ").trim()
}

// ────────────────────────────────────────────────────────────────
// buildStepStream
// ────────────────────────────────────────────────────────────────

/**
 * Build a complete streaming response for a single model execution step.
 *
 * Unifies the primary and fallback stream creation blocks from route.ts into
 * a single function. Creates the curated trace controller, reasoning accumulator,
 * calls `buildOnFinishHandler` internally for shared closure scope, invokes
 * `streamText`, applies stream transforms (pipePlanCapture -> pipeYamlRender),
 * and runs the stream writer loop with outcome guard / streamContentOverride logic.
 *
 * Returns `Response` directly via `createUIMessageStreamResponse`.
 */
export function buildStepStream(params: {
    executionConfig: StepExecutionConfig
    onFinishConfig: OnFinishConfig
    streamContext: OnFinishStreamContext
    reasoningTraceEnabled: boolean
    enablePlanCapture: boolean
    enableYamlRender: boolean
    /** Whether transparent reasoning is enabled for this particular stream call. */
    transparentReasoningEnabled: boolean
    /** Trace mode label for curated trace controller. */
    traceMode: "normal" | "paper" | "websearch"
    /** Log tag for distinguishing primary vs fallback in console output. */
    logTag: string
    /** Optional callback to capture the reasoning trace snapshot externally. */
    onReasoningSnapshot?: CaptureReasoningSnapshotFn
    /** Optional callback to capture the source count externally. */
    onSourceCount?: (count: number) => void
}): Response {
    const {
        executionConfig,
        onFinishConfig,
        streamContext,
        reasoningTraceEnabled,
        enablePlanCapture,
        enableYamlRender,
        transparentReasoningEnabled,
        traceMode,
        logTag,
        onReasoningSnapshot,
        onSourceCount,
    } = params

    const messageId = streamContext.messageId
    const traceId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-trace`

    // ── Curated trace controller ──
    const paperStageScope = onFinishConfig.paperStageScope
    const reasoningTrace = createCuratedTraceController({
        enabled: reasoningTraceEnabled,
        traceId,
        mode: traceMode,
        stage: paperStageScope ?? undefined,
        webSearchEnabled: false,
        startedAt: onFinishConfig.requestStartedAt,
    })

    // Wire the trace controller into streamContext so onFinish handler can access it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    streamContext.reasoningTrace.controller = reasoningTrace as any
    streamContext.reasoningTrace.enabled = reasoningTraceEnabled

    const captureSnapshot = () => {
        if (!reasoningTrace.enabled) return
        const snapshot = reasoningTrace.getPersistedSnapshot()
        if (snapshot) {
            streamContext.reasoningTrace.snapshot = snapshot
            onReasoningSnapshot?.(snapshot)
        }
    }
    streamContext.reasoningTrace.captureSnapshot = captureSnapshot

    // ── Build onFinish handler (shared closure for streamContentOverrideRef) ──
    const {
        handler: onFinishHandler,
        streamContentOverrideRef,
        capturedSpecRef,
        capturedPlanSpecRef,
    } = buildOnFinishHandler(onFinishConfig, streamContext)

    // Wire plan snapshot getter so onFinish can access captured plan
    const originalGetPlanSnapshot = streamContext.getCurrentPlanSnapshot
    streamContext.getCurrentPlanSnapshot = () => {
        return capturedPlanSpecRef.current ?? originalGetPlanSnapshot()
    }

    // ── Observability refs from onFinishConfig ──
    const paperToolTracker = onFinishConfig.paperToolTracker
    const paperTurnObservability = onFinishConfig.paperTurnObservability
    const resolvedWorkflow = onFinishConfig.resolvedWorkflow

    // ── Create the UI message stream ──
    const uiMessageStream = createUIMessageStream({
        execute: async ({ writer }) => {
            let started = false
            let sourceCount = 0
            // Accumulate ALL streamed text deltas for outcome-gated guard.
            // onFinish text only has final step — this captures full stream.
            let accumulatedStreamText = ""

            const ensureStart = () => {
                if (started) return
                started = true
                writer.write({ type: "start", messageId })
            }

            const emitTrace = (events: ReturnType<typeof reasoningTrace.markToolRunning>) => {
                if (!reasoningTrace.enabled) return
                captureSnapshot()
                if (events.length === 0) return
                ensureStart()
                for (const event of events) {
                    writer.write(event)
                }
            }

            const emitDurationPart = () => {
                if (!reasoningTrace.enabled) return
                const snapshot = reasoningTrace.getPersistedSnapshot()
                if (typeof snapshot.durationSeconds !== "number" || !Number.isFinite(snapshot.durationSeconds)) return
                ensureStart()
                writer.write({
                    type: "data-reasoning-duration",
                    id: `${traceId}-duration`,
                    data: {
                        traceId,
                        seconds: snapshot.durationSeconds,
                    },
                })
            }

            const reasoningAccumulator = createReasoningAccumulator({
                traceId,
                writer,
                ensureStart,
                enabled: transparentReasoningEnabled,
            })

            emitTrace(reasoningTrace.initialEvents)

            // ── Invoke streamText with execution config + onFinish ──
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const streamTextConfig: any = {
                model: executionConfig.model,
                messages: executionConfig.messages,
                tools: executionConfig.tools,
                toolChoice: executionConfig.toolChoice,
                prepareStep: executionConfig.prepareStep,
                stopWhen: stepCountIs(executionConfig.maxSteps),
                ...executionConfig.samplingOptions,
                onFinish: async ({ text, steps, providerMetadata, usage }: {
                    text: string
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    steps: any[]
                    providerMetadata?: unknown
                    usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number }
                }) => {
                    await onFinishHandler({
                        text,
                        steps,
                        providerMetadata,
                        usage: {
                            inputTokens: usage?.inputTokens,
                            outputTokens: usage?.outputTokens,
                            totalTokens: usage?.totalTokens,
                        },
                    })
                },
            }
            if (executionConfig.providerOptions) {
                streamTextConfig.providerOptions = executionConfig.providerOptions
            }
            const result = streamText(streamTextConfig)

            // ── Stream transforms: pipePlanCapture -> pipeYamlRender ──
            const uiStream = result.toUIMessageStream({
                sendStart: false,
                generateMessageId: () => messageId,
                sendReasoning: transparentReasoningEnabled,
            })

            // pipePlanCapture BEFORE pipeYamlRender: plan-spec stripping works
            // with AI SDK's textDelta format. pipeYamlRender then transforms
            // the clean text into @json-render format for the client.
            const planTransformedStream = enablePlanCapture
                ? pipePlanCapture(uiStream) as typeof uiStream
                : uiStream

            const yamlTransformedStream = enableYamlRender
                ? pipeYamlRender(planTransformedStream)
                : planTransformedStream

            // ── Stream writer loop ──
            for await (const chunk of iterateStream(yamlTransformedStream)) {
                // Capture data-spec parts emitted by pipeYamlRender for DB persistence
                if ((chunk as { type?: string }).type === SPEC_DATA_PART_TYPE) {
                    try {
                        const data = (chunk as { data?: { type?: string; patch?: JsonPatch; spec?: Spec } }).data
                        if (data?.type === "patch" && data.patch) {
                            // Accumulate patches into a running spec
                            if (!capturedSpecRef.current) {
                                capturedSpecRef.current = { root: "", elements: {} } as Spec
                            }
                            applySpecPatch(capturedSpecRef.current, data.patch)
                        } else if (data?.type === "flat" && data.spec) {
                            // If a flat spec is emitted, use it directly
                            capturedSpecRef.current = data.spec
                        }
                    } catch { /* spec capture error — non-critical */ }
                }

                // Capture plan-spec parts emitted by pipePlanCapture for DB persistence.
                // These are internal-only — do NOT forward to client.
                if ((chunk as { type?: string }).type === PLAN_DATA_PART_TYPE) {
                    try {
                        const data = (chunk as { data?: { spec?: PlanSpec } }).data
                        if (data?.spec) {
                            capturedPlanSpecRef.current = data.spec
                        }
                    } catch { /* plan capture error — non-critical */ }
                    continue
                }

                if (chunk.type === "reasoning-start" || chunk.type === "reasoning-delta" || chunk.type === "reasoning-end") {
                    if (chunk.type === "reasoning-delta") {
                        reasoningAccumulator.onReasoningDelta(
                            typeof (chunk as { delta?: unknown }).delta === "string"
                                ? (chunk as { delta?: unknown }).delta as string
                                : ""
                        )
                    }
                    continue
                }

                if (chunk.type === "source-url") {
                    sourceCount += 1
                    onSourceCount?.(sourceCount)
                    emitTrace(reasoningTrace.markSourceDetected())
                }

                if (chunk.type === "tool-input-start") {
                    const toolName = getToolNameFromChunk(chunk)
                    emitTrace(reasoningTrace.markToolRunning(toolName))
                }

                if (chunk.type === "finish") {
                    // Log captured YAML spec for persistence
                    if (capturedSpecRef.current && capturedSpecRef.current.root) {
                        const elementTypes = Object.entries(capturedSpecRef.current.elements || {}).map(([id, el]) => `${id}:${(el as { type?: string }).type ?? '?'}`).join(", ")
                        const hasSubmitBtn = Object.values(capturedSpecRef.current.elements || {}).some((el) => (el as { type?: string }).type === "ChoiceSubmitButton")
                        console.info(`[CHOICE-CARD][yaml-capture]${logTag} stage=${paperStageScope} specKeys=${Object.keys(capturedSpecRef.current).join(",")}`)
                        console.info(`[F1-F6-TEST] ChoiceCardSpec${logTag} { elements: "${elementTypes}", hasSubmitButton: ${hasSubmitBtn} }`)
                    }

                    // Outcome-gated stream override via verifyStepOutcome
                    if (!streamContentOverrideRef.current && accumulatedStreamText.length > 0) {
                        const streamVerification = verifyStepOutcome({
                            text: accumulatedStreamText,
                            toolChainOrder: [], // stream-side has no step-level tool chain; onFinish handles full chain
                            paperToolTracker,
                            paperTurnObservability,
                            resolvedWorkflow,
                            choiceInteractionEvent: onFinishConfig.choiceInteractionEvent,
                            paperSession: onFinishConfig.paperSession
                                ? { currentStage: onFinishConfig.paperSession.currentStage, stageStatus: onFinishConfig.paperSession.stageStatus }
                                : null,
                            paperStageScope,
                            isDraftingStage: onFinishConfig.isDraftingStage,
                            isCompileThenFinalize: onFinishConfig.isCompileThenFinalize,
                        })
                        if (streamVerification.streamContentOverride) {
                            streamContentOverrideRef.current = streamVerification.streamContentOverride
                            console.info(
                                `[PAPER][outcome-guard-stream]${logTag} stage=${paperStageScope} ` +
                                `action=${resolvedWorkflow?.action ?? "unknown"} ` +
                                `accumulatedLen=${accumulatedStreamText.length}`
                            )
                            console.info(`[PAPER][outcome-guard-stream]${logTag}[details]`, {
                                stage: paperStageScope,
                                firstLeakageMatch: paperTurnObservability.firstLeakageMatch,
                                firstLeakageAtMs: paperTurnObservability.firstLeakageAtMs,
                                firstLeakageSnippet: paperTurnObservability.firstLeakageSnippet,
                                createArtifactAtMs: paperTurnObservability.createArtifactAtMs,
                                updateArtifactAtMs: paperTurnObservability.updateArtifactAtMs,
                                sawCreateArtifactSuccess: paperToolTracker.sawCreateArtifactSuccess,
                                sawUpdateArtifactSuccess: paperToolTracker.sawUpdateArtifactSuccess,
                                sawSubmitValidationSuccess: paperToolTracker.sawSubmitValidationSuccess,
                            })
                        }
                    }

                    if (streamContentOverrideRef.current) {
                        const overrideId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-override`
                        writer.write({
                            type: "data-cited-text",
                            id: overrideId,
                            data: { text: streamContentOverrideRef.current },
                        } as Parameters<typeof writer.write>[0])
                        console.info(`[PAPER][outcome-gated]${logTag} emitted data-cited-text stream override`)
                    }

                    if (reasoningAccumulator.hasReasoning()) {
                        emitTrace(reasoningTrace.populateFromReasoning(
                            reasoningAccumulator.getFullReasoning()
                        ))
                    }
                    reasoningAccumulator.finalize()
                    emitTrace(reasoningTrace.finalize({
                        outcome: "done",
                        sourceCount,
                    }))
                    emitDurationPart()
                    writer.write(chunk)
                    break
                }

                if (chunk.type === "error") {
                    reasoningAccumulator.finalize()
                    emitTrace(reasoningTrace.finalize({
                        outcome: "error",
                        sourceCount,
                        errorNote: `${logTag || "primary"}-stream-error`,
                    }))
                    emitDurationPart()
                    writer.write(chunk)
                    break
                }

                if (chunk.type === "abort") {
                    reasoningAccumulator.finalize()
                    emitTrace(reasoningTrace.finalize({
                        outcome: "stopped",
                        sourceCount,
                    }))
                    emitDurationPart()
                    writer.write(chunk)
                    break
                }

                // Accumulate text deltas for outcome-gated full-stream guard
                if (chunk.type === "text-delta" && typeof (chunk as { delta?: unknown }).delta === "string") {
                    const delta = (chunk as { delta: string }).delta
                    accumulatedStreamText += delta
                    if (!paperTurnObservability.firstLeakageMatch) {
                        const match = paperRecoveryLeakagePattern.exec(accumulatedStreamText)
                        if (match && typeof match.index === "number") {
                            paperTurnObservability.firstLeakageMatch = match[0]
                            paperTurnObservability.firstLeakageAtMs = Date.now()
                            paperTurnObservability.firstLeakageSnippet = buildLeakageSnippet(accumulatedStreamText, match.index, match[0])
                            console.warn(`[PAPER][recovery-leakage-first-detected]${logTag}`, {
                                stage: paperStageScope,
                                match: paperTurnObservability.firstLeakageMatch,
                                snippet: paperTurnObservability.firstLeakageSnippet,
                                sawUpdateStageData: paperToolTracker.sawUpdateStageData,
                                sawCreateArtifactSuccess: paperToolTracker.sawCreateArtifactSuccess,
                                sawUpdateArtifactSuccess: paperToolTracker.sawUpdateArtifactSuccess,
                                sawSubmitValidationSuccess: paperToolTracker.sawSubmitValidationSuccess,
                            })
                        }
                    }
                }

                ensureStart()
                writer.write(chunk)
            }
        },
    })

    return createUIMessageStreamResponse({ stream: uiMessageStream })
}
