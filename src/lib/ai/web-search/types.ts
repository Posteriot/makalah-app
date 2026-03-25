import type { LanguageModel, streamText } from "ai"
import type { NormalizedCitation } from "@/lib/citations/types"
import type { PersistedCuratedTraceSnapshot } from "@/lib/ai/curated-trace"
import type {
  ReferencePresentationSource,
  ReferenceVerificationStatus,
  SearchResponseMode,
} from "./reference-presentation"
export type {
  ReferencePresentationSource,
  ReferenceVerificationStatus,
  SearchResponseMode,
} from "./reference-presentation"

export type AnyStreamTextResult = ReturnType<typeof streamText>

export interface ReferenceInventoryItem {
  sourceId?: string
  title: string
  url: string | null
  verificationStatus: ReferenceVerificationStatus | "unavailable"
  note?: string
}

export interface RetrieverConfig {
  apiKey: string
  modelId: string
  providerOptions?: Record<string, unknown>
}

export interface SearchRetriever {
  name: string
  buildStreamConfig(config: RetrieverConfig): {
    model: LanguageModel
    tools?: Record<string, unknown>
  }
  extractSources(result: AnyStreamTextResult): Promise<NormalizedCitation[]>
}

export interface RetrieverChainEntry {
  retriever: SearchRetriever
  retrieverConfig: RetrieverConfig
}

export interface WebSearchOrchestratorConfig {
  requestId?: string
  conversationId: string // needed for RAG ingest
  retrieverChain: RetrieverChainEntry[]
  messages: Parameters<typeof import("ai").streamText>[0]["messages"]
  composeMessages: Parameters<typeof import("ai").streamText>[0]["messages"]
  composeModel: LanguageModel
  /** Fallback model for compose phase. Used only when primary compose fails before first text output. */
  fallbackComposeModel?: LanguageModel
  systemPrompt: string
  paperModePrompt?: string
  paperWorkflowReminder?: string
  currentStage?: string
  fileContext?: string
  samplingOptions: { temperature?: number; topP?: number }
  reasoningTraceEnabled: boolean
  isTransparentReasoning: boolean
  reasoningProviderOptions?: Record<string, unknown>
  traceMode: string
  requestStartedAt?: number
  /** When true, pipe compose stream through pipeYamlRender and inject CHOICE_YAML_SYSTEM_PROMPT. */
  isDraftingStage?: boolean
  tavilyApiKey?: string
  convexToken?: string
  /** Max tokens for retriever Phase 1 (lower = faster search, less wasted output). Defaults to 4096. */
  retrieverMaxTokens?: number
  onFinish: (result: WebSearchResult) => Promise<void>
}

export interface WebSearchResult {
  text: string
  sources: NormalizedCitation[]
  referencePresentation?: {
    responseMode: SearchResponseMode
    sources: ReferencePresentationSource[]
  }
  usage?: { inputTokens: number; outputTokens: number }
  searchUsage?: { inputTokens: number; outputTokens: number }
  retrieverName: string
  retrieverIndex: number
  attemptedRetrievers: string[]
  /** Captured YAML choice spec emitted by pipeYamlRender (drafting stages only). */
  capturedChoiceSpec?: import("@json-render/core").Spec
  /** Persisted reasoning trace snapshot from compose phase (transparent reasoning only). */
  reasoningSnapshot?: PersistedCuratedTraceSnapshot
}

export type SearchExecutionMode =
  | "perplexity"
  | "grok"
  | "google-grounding"
  | "blocked_unavailable"
  | "off"
