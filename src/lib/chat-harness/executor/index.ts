// ────────────────────────────────────────────────────────────────
// Executor barrel — re-exports for route.ts consumption
// ────────────────────────────────────────────────────────────────

export { buildToolRegistry } from "./build-tool-registry"
export { buildStepStream } from "./build-step-stream"
export { saveAssistantMessage } from "./save-assistant-message"
export { buildOnFinishHandler } from "./build-on-finish-handler"

// Re-export types needed by route.ts when constructing configs
export type {
    StepExecutionConfig,
    OnFinishConfig,
    StreamPipelineConfig,
    PaperSessionForExecutor,
    PaperTurnObservability,
    BillingContext,
    SaveAssistantMessageParams,
} from "./types"

export type {
    OnFinishStreamContext,
    ReasoningTraceContext,
    TelemetryContext,
} from "./build-on-finish-handler"
