import type { LanguageModel, streamText } from "ai"
import type { NormalizedCitation } from "@/lib/citations/types"

export type AnyStreamTextResult = ReturnType<typeof streamText>

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
  retrieverChain: RetrieverChainEntry[]
  messages: Parameters<typeof import("ai").streamText>[0]["messages"]
  composeMessages: Parameters<typeof import("ai").streamText>[0]["messages"]
  composeModel: LanguageModel
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
  tavilyApiKey?: string
  onFinish: (result: WebSearchResult) => Promise<void>
}

export interface WebSearchResult {
  text: string
  sources: NormalizedCitation[]
  usage?: { inputTokens: number; outputTokens: number }
  searchUsage?: { inputTokens: number; outputTokens: number }
  retrieverName: string
  retrieverIndex: number
  attemptedRetrievers: string[]
}

export type SearchExecutionMode =
  | "perplexity"
  | "grok"
  | "google-grounding"
  | "blocked_unavailable"
  | "off"
