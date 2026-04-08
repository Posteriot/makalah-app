import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type LanguageModel,
} from "ai"
import { fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import type { NormalizedCitation } from "@/lib/citations/types"
import { getSearchSystemPrompt, augmentUserMessageForSearch } from "@/lib/ai/search-system-prompt"
import { buildSearchResultsContext } from "@/lib/ai/search-results-context"
import { composeSkillInstructions } from "@/lib/ai/skills"
import { formatParagraphEndCitations } from "@/lib/citations/paragraph-citation-formatter"
import { buildUserFacingSearchPayload } from "@/lib/ai/internal-thought-separator"
import {
  buildReferencePresentationSources,
  inferSearchResponseMode,
} from "./reference-presentation"
import { fetchPageContent } from "./content-fetcher"
import type { FetchedContent } from "./content-fetcher"
import {
  sanitizeMessagesForSearch,
  canonicalizeCitationUrls,
  createSearchUnavailableResponse,
} from "./utils"
import type {
  ReferenceInventoryItem,
  ReferencePresentationSource,
  WebSearchOrchestratorConfig,
  RetrieverChainEntry,
} from "./types"
import type { SkillContext } from "@/lib/ai/skills/types"
import { pipeYamlRender } from "@json-render/yaml"
import { SPEC_DATA_PART_TYPE, applySpecPatch } from "@json-render/core"
import type { Spec, JsonPatch } from "@json-render/core"
import { CHOICE_YAML_SYSTEM_PROMPT } from "@/lib/json-render/choice-yaml-prompt"
import {
  createCuratedTraceController,
  type ReasoningLiveDataPart,
  type PersistedCuratedTraceSnapshot,
} from "@/lib/ai/curated-trace"
import { createReasoningLiveAccumulator, createReasoningLiveResetPart } from "@/lib/ai/reasoning-live-stream"
import { ingestToRag } from "@/lib/ai/rag-ingest"
import { isVertexProxyUrl, resolveVertexProxyUrls } from "./retrievers/google-grounding"

/**
 * Compose Phase Directive — injected into compose context to prevent
 * the model from generating search promises instead of synthesizing results.
 *
 * Addresses:
 * - RC-1: No compose-only directive (model doesn't know it's in compose phase)
 * - RC-2: Tool references from systemPrompt/paperModePrompt without tools available
 * - RC-3: Dialog-first instruction conflict
 * - RC-4: Conversation pattern continuation
 *
 * Must be in English per architecture constraint (model instructions in English).
 */
const COMPOSE_PHASE_DIRECTIVE = `
═══════════════════════════════════════════════════════════════════
COMPOSE PHASE — SEARCH ALREADY COMPLETED
═══════════════════════════════════════════════════════════════════

You are in the COMPOSE phase of a two-pass search flow.
Web search has ALREADY been executed. The search results are provided below.

YOUR TASK:
- Synthesize the search results into a comprehensive, well-cited response
- Present your analysis and findings IMMEDIATELY in this response
- Follow the SKILL.md composition guidelines (RESPONSE COMPOSITION, REFERENCE INTEGRITY)

STRICT CONTENT RULE — ZERO TOLERANCE FOR FABRICATION:
- You may ONLY state facts that appear verbatim or near-verbatim in "Page content (verified)" sections below
- If a source has "Page content (verified)", ONLY use information from that page content — not from your training data, not from the URL, not from the title
- If a source has "[no page content — unverified source]", do NOT make specific factual claims (names, dates, numbers, titles, roles) from it — you may only note it exists
- If page content from different sources describes different people/entities with the same name, present them SEPARATELY — never merge into one profile
- When you are unsure whether a fact is in the page content, LEAVE IT OUT — omission is always better than fabrication
- NEVER add details from your training knowledge to fill gaps. State what the sources say and stop.

DO NOT:
- Promise to search or announce that you will perform a search (e.g., "give me a moment", "I will search for that", "allow me to look for it") in any language
- Ask for permission to search
- Reference or attempt to use tools (no tools are available in this phase)
- Add facts, claims, titles, names, or biographical details not found in verified page content
- Include internal processing thoughts, search acknowledgments, or status messages in your response. Start directly with the substantive answer. Do not write phrases equivalent to "let me search", "I will look for", "please wait", or "I am searching" in any language — those are internal actions, not part of the user-facing response.

OVERRIDE — the following instructions from other system messages DO NOT APPLY here:
- Any "dialog first" / "ask before generating" instructions — present results NOW
- Any "web search mandatory" instructions — search is ALREADY DONE
- Any tool usage instructions (startPaperSession, updateStageData, createArtifact, google_search) — NO tools available
- Any "call startPaperSession IMMEDIATELY" instructions — not applicable

IMPORTANT — TOOL CALLS:
- You have NO access to tools (updateStageData, createArtifact, submitStageForValidation) in this phase.
- Do NOT output JSON tool calls as text. This will NOT work — it will appear as raw text to the user.
- Present your synthesized findings to the user in this response.
- Saving data (updateStageData, createArtifact) happens in a SUBSEQUENT turn when tools are available.
- Simply present the results and discuss with the user. The save step comes next.

The search results below are your source material. Use them.
═══════════════════════════════════════════════════════════════════
`.trim()

const MAX_EXACT_DOCUMENT_TEXT_CHARS = 80_000
const MAX_EXACT_PARAGRAPH_COUNT = 120
const MAX_EXACT_PARAGRAPH_TEXT_CHARS = 24_000
const EXACT_TRUNCATION_MARKER = "[exact payload truncated: tail omitted]"
const EXACT_PARAGRAPH_TAIL_MARKER = "[truncated]"

function extractLastUserMessageText(
  messages: WebSearchOrchestratorConfig["messages"],
): string {
  if (!Array.isArray(messages) || messages.length === 0) return ""

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i] as {
      role?: string
      content?: unknown
      parts?: Array<{ type?: string; text?: string }>
    }
    if (message?.role !== "user") continue

    const content =
      typeof message.content === "string"
        ? message.content
        : message.parts?.find((part) => part.type === "text")?.text ?? ""

    const normalized = typeof content === "string" ? content.trim() : ""
    if (normalized) return normalized
  }

  return ""
}

function buildReferenceInventoryItems(
  sources: ReferencePresentationSource[],
): ReferenceInventoryItem[] {
  return sources.map((source) => ({
    sourceId: source.id,
    title: source.title,
    url: source.url,
    verificationStatus: source.verificationStatus,
  }))
}

export async function persistExactSourceDocuments(params: {
  fetchedContent: FetchedContent[]
  conversationId: Id<"conversations">
  convexOptions?: { token: string }
  requestId?: string
}): Promise<void> {
  const reqTag = params.requestId ? `[${params.requestId}] ` : ""
  const exactSourceCount = params.fetchedContent.filter(
    (fetched) => fetched.fullContent && fetched.documentText
  ).length

  if (exactSourceCount > 0) {
    console.log(
      `[⏱ LATENCY] ${reqTag}Exact source persist starting (detached): ${exactSourceCount} sources`
    )
  }

  const exactStart = Date.now()
  let exactIdx = 0

  for (const fetched of params.fetchedContent) {
    if (!fetched.fullContent || !fetched.documentText) continue

    try {
      const sourceStart = Date.now()
      const exactDocumentText = limitExactDocumentText(fetched.documentText)
      const exactParagraphs = limitExactParagraphs(fetched.paragraphs ?? [])
      await fetchMutation(
        api.sourceDocuments.upsertDocument,
        {
          conversationId: params.conversationId,
          sourceId: fetched.resolvedUrl,
          originalUrl: fetched.url,
          resolvedUrl: fetched.resolvedUrl,
          ...(typeof fetched.title === "string" ? { title: fetched.title } : {}),
          ...(typeof fetched.author === "string" ? { author: fetched.author } : {}),
          ...(typeof fetched.publishedAt === "string"
            ? { publishedAt: fetched.publishedAt }
            : {}),
          ...(typeof fetched.siteName === "string" ? { siteName: fetched.siteName } : {}),
          documentKind: fetched.documentKind,
          paragraphs: exactParagraphs,
          documentText: exactDocumentText,
        },
        params.convexOptions
      )
      exactIdx++
      const paragraphWasCapped =
        exactParagraphs.length < (fetched.paragraphs?.length ?? 0)
      console.log(
        `[⏱ LATENCY] ${reqTag}Exact source persist [${exactIdx}/${exactSourceCount}] ${fetched.resolvedUrl.slice(0, 60)}... ${Date.now() - sourceStart}ms${exactDocumentText.length < fetched.documentText.length ? ` cappedText=${exactDocumentText.length}` : ""}${paragraphWasCapped ? ` cappedParagraphs=${exactParagraphs.length}/${fetched.paragraphs?.length ?? 0}` : ""}`
      )
    } catch (err) {
      exactIdx++
      console.error(
        `[⏱ LATENCY] ${reqTag}Exact source persist [${exactIdx}/${exactSourceCount}] FAILED ${fetched.resolvedUrl.slice(0, 60)}:`,
        err
      )
    }
  }

  if (exactSourceCount > 0) {
    console.log(
      `[⏱ LATENCY] ${reqTag}Exact source persist ALL DONE total=${Date.now() - exactStart}ms sources=${exactSourceCount}`
    )
  }
}

export function emitTransparentReasoningResetForRetry(params: {
  isTransparentReasoning: boolean
  hasReasoning: boolean
  traceId: string
  writer: { write: (chunk: ReasoningLiveDataPart) => void }
}) {
  if (!params.isTransparentReasoning || !params.hasReasoning) {
    return false
  }

  params.writer.write(createReasoningLiveResetPart({ traceId: params.traceId }))
  return true
}

/**
 * Execute a three-phase web search flow:
 *   Phase 1:   Silent search via retriever chain (runs BEFORE stream creation)
 *   Phase 1.5: Fetch page content via FetchWeb (runs INSIDE stream execute)
 *   Phase 2:   Compose with skill instructions, stream to client
 *
 * Phase 1 runs before stream creation so that errors propagate to route.ts
 * for retry / fallback handling. Phase 1.5 runs inside execute so Vercel's
 * streaming timeout doesn't apply (first byte already sent).
 */
export function validateComposeSubstantiveness(composedText: string, sourceCount: number): boolean {
    if (sourceCount === 0) return true
    // composedText is from text-delta chunks AFTER pipeYamlRender.
    // YAML cards already extracted. Raw length is reliable.
    // Transitional: ~50-100 chars. Substantive: ~500+ chars.
    return composedText.trim().length >= 200
}

export async function executeWebSearch(
  config: WebSearchOrchestratorConfig,
): Promise<Response> {
  const orchestratorStart = Date.now()
  const reqId = config.requestId ?? `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const attemptedRetrievers: string[] = []

  // ────────────────────────────────────────────────────────────
  // PHASE 1: Silent search — iterate retrieverChain until one succeeds
  // ────────────────────────────────────────────────────────────
  const phase1Start = Date.now()
  const rawMessages = config.messages ?? []
  const lastUserMessage = extractLastUserMessageText(rawMessages)
  const responseMode = await inferSearchResponseMode({ lastUserMessage })
  const sanitizedMessages = sanitizeMessagesForSearch(rawMessages)
  const searchMessages = augmentUserMessageForSearch([
    { role: "system" as const, content: getSearchSystemPrompt() },
    ...sanitizedMessages.filter(
      (m: { role: string }) => m.role !== "system",
    ),
  ])

  let searchText = ""
  let searchUsage: { inputTokens: number; outputTokens: number } | undefined
  let sources: NormalizedCitation[] = []
  let successRetrieverName = ""
  let successRetrieverIndex = -1

  for (let i = 0; i < config.retrieverChain.length; i++) {
    const entry: RetrieverChainEntry = config.retrieverChain[i]
    const { retriever, retrieverConfig } = entry
    attemptedRetrievers.push(retriever.name)

    try {
      const retrieverStart = Date.now()
      const { model, tools } = retriever.buildStreamConfig(retrieverConfig)

      // Retriever can use lower maxTokens than compose — its text output gets dropped
      // when page content is available. But don't set too low or Gemini skips tool calls.
      const retrieverSamplingOptions = {
        ...config.samplingOptions,
        ...(config.retrieverMaxTokens ? { maxTokens: config.retrieverMaxTokens } : {}),
      }
      const RETRIEVER_TIMEOUT_MS = 60_000 // 60s hard timeout for retriever
      const searchResult = streamText({
        model,
        messages: searchMessages,
        ...(tools ? { tools: tools as Parameters<typeof streamText>[0]["tools"] } : {}),
        ...retrieverSamplingOptions,
      })
      const resultCreatedAt = Date.now()
      console.log(`[⏱ RETRIEVER][${reqId}] result_created name=${retriever.name} t=${resultCreatedAt - retrieverStart}ms`)

      // ── Retriever timeline probes: measure when each promise resolves ──
      // These run concurrently with the text await below. The timestamps
      // reveal whether sources/metadata are available earlier than text.
      let sourcesReadyAt: number | null = null
      let metadataReadyAt: number | null = null

      // Wrap PromiseLike in Promise.resolve() — PromiseLike only has .then(), not .catch()
      const sourcesProbe = Promise.resolve(searchResult.sources)
        .then((value) => {
          sourcesReadyAt = Date.now() - retrieverStart
          console.log(`[⏱ RETRIEVER][${reqId}] sources_ready name=${retriever.name} t=${sourcesReadyAt}ms count=${Array.isArray(value) ? value.length : 0}`)
          return value
        })
        .catch((err: unknown) => {
          sourcesReadyAt = Date.now() - retrieverStart
          console.log(`[⏱ RETRIEVER][${reqId}] sources_failed name=${retriever.name} t=${sourcesReadyAt}ms error=${err instanceof Error ? err.message : String(err)}`)
          throw err
        })

      const metadataProbe = Promise.resolve(searchResult.providerMetadata)
        .then((value) => {
          metadataReadyAt = Date.now() - retrieverStart
          const keys = value && typeof value === "object" ? Object.keys(value).join(",") : "none"
          console.log(`[⏱ RETRIEVER][${reqId}] metadata_ready name=${retriever.name} t=${metadataReadyAt}ms keys=${keys}`)
          return value
        })
        .catch((err: unknown) => {
          metadataReadyAt = Date.now() - retrieverStart
          console.log(`[⏱ RETRIEVER][${reqId}] metadata_failed name=${retriever.name} t=${metadataReadyAt}ms error=${err instanceof Error ? err.message : String(err)}`)
          throw err
        })

      // Await full text with timeout — prevents indefinite hang if API stops responding
      searchText = await Promise.race([
        searchResult.text.then((text) => {
          console.log(`[⏱ RETRIEVER][${reqId}] text_ready name=${retriever.name} t=${Date.now() - retrieverStart}ms chars=${text.length}`)
          return text
        }),
        new Promise<never>((_, reject) => {
          const signal = AbortSignal.timeout(RETRIEVER_TIMEOUT_MS)
          signal.addEventListener("abort", () =>
            reject(new Error(`Retriever "${retriever.name}" timed out after ${RETRIEVER_TIMEOUT_MS}ms`)),
            { once: true }
          )
        }),
      ])
      const textDone = Date.now()
      const usage = await searchResult.usage
      searchUsage = usage
        ? { inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0 }
        : undefined

      // Extract and canonicalize sources
      const extractStart = Date.now()
      console.log(`[⏱ RETRIEVER][${reqId}] extract_start name=${retriever.name} t=${extractStart - retrieverStart}ms`)
      const rawCitations = await retriever.extractSources(searchResult)
      sources = canonicalizeCitationUrls(rawCitations)
      const extractDone = Date.now()
      console.log(`[⏱ RETRIEVER][${reqId}] extract_done name=${retriever.name} t=${extractDone - retrieverStart}ms citations=${sources.length}`)

      // Wait for probes to settle (they should already be resolved by now)
      await Promise.allSettled([sourcesProbe, metadataProbe])

      console.log(
        `[⏱ RETRIEVER][${reqId}] summary name=${retriever.name} ` +
        `created=${resultCreatedAt - retrieverStart}ms ` +
        `text=${textDone - retrieverStart}ms ` +
        `sources=${sourcesReadyAt ?? -1}ms ` +
        `metadata=${metadataReadyAt ?? -1}ms ` +
        `extract=${extractDone - extractStart}ms ` +
        `total=${extractDone - retrieverStart}ms ` +
        `citations=${sources.length}`
      )
      console.log(`[⏱ LATENCY][${reqId}] Phase1 retriever="${retriever.name}" textGen=${textDone - retrieverStart}ms extractSources=${extractDone - extractStart}ms total=${extractDone - retrieverStart}ms citations=${sources.length} text=${searchText.length}chars`)

      // Treat 0 citations as a failure — model didn't call search tool.
      // Fall through to next retriever in chain.
      if (sources.length === 0) {
        console.warn(`[Orchestrator][${reqId}] Retriever "${retriever.name}" returned 0 citations — treating as failure, trying next`)
        continue
      }

      successRetrieverName = retriever.name
      successRetrieverIndex = i
      break
    } catch (retrieverError) {
      console.error(
        `[Orchestrator] Retriever "${retriever.name}" failed:`,
        retrieverError,
      )
      // Continue to next retriever in chain
    }
  }

  console.log(`[⏱ LATENCY][${reqId}] Phase1 TOTAL=${Date.now() - phase1Start}ms tried=${attemptedRetrievers.join(",")} winner=${successRetrieverName || "NONE"}`)

  // All retrievers failed → return error response
  if (successRetrieverIndex === -1) {
    console.error(
      `[Orchestrator] All retrievers failed: ${attemptedRetrievers.join(", ")}`,
    )
    return createSearchUnavailableResponse({
      errorMessage:
        "Maaf, terjadi kesalahan saat mencari sumber. Silakan coba lagi.",
    })
  }

  // ────────────────────────────────────────────────────────────
  // Prepare sources and skill instructions (BEFORE stream creation)
  // ────────────────────────────────────────────────────────────
  // Strip vertex proxy URLs from searchText — real URLs are in sources array
  const cleanSearchText = searchText.replace(
    /https?:\/\/vertexaisearch\.cloud\.google\.com\/grounding-api-redirect\/\S+/g,
    "",
  )

  const scoredSources = sources.map((c) => ({
    url: c.url,
    title: c.title || c.url,
    ...(typeof c.publishedAt === "number" ? { publishedAt: c.publishedAt } : {}),
    ...(c.citedText ? { citedText: c.citedText } : {}),
  }))
  const sourceCount = scoredSources.length

  let skillInstructions: string | null = null
  try {
    const skillContext: SkillContext = {
      isPaperMode: !!config.paperModePrompt,
      currentStage: config.currentStage ?? null,
      hasRecentSources: scoredSources.length > 0,
      availableSources: scoredSources.map((s) => ({
        url: s.url,
        title: s.title,
        ...(typeof s.publishedAt === "number" ? { publishedAt: s.publishedAt } : {}),
      })),
    }
    skillInstructions = composeSkillInstructions(skillContext)
  } catch (skillError) {
    console.error(`[Orchestrator][${reqId}] composeSkillInstructions failed:`, skillError)
  }

  // ────────────────────────────────────────────────────────────
  // PHASE 1.5 + PHASE 2: Stream creation — fetch content, compose, stream
  // ────────────────────────────────────────────────────────────
  const messageId =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  const searchStatusId =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-search`
  const citedTextId =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-cited-text`
  const citedSourcesId =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-cited-sources`
  const referenceInventoryId =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-reference-inventory`
  const internalThoughtId =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-internal-thought`

  // Track captured YAML spec across the stream
  let capturedChoiceSpec: Spec | null = null

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      let composedText = ""

      // Emit search status: "searching" → "fetching-content" → "composing"
      writer.write({ type: "start", messageId })
      writer.write({
        type: "data-search",
        id: searchStatusId,
        data: { status: "searching" },
      })

      // ── Phase 1.5: Fetch page content ──
      writer.write({
        type: "data-search",
        id: searchStatusId,
        data: { status: "fetching-content", sourceCount },
      })

      // Resolve proxy URLs for top 7 BEFORE FetchWeb (proxy URLs can't be fetched directly).
      // This is a lightweight batch HEAD request (~1-2s for 7 URLs in parallel).
      // Remaining 13 sources resolve in parallel with compose (Step 3 below).
      const top7Sources = scoredSources.slice(0, 7)
      const resolvedUrlMap = new Map<string, string>()

      const top7ProxyCount = top7Sources.filter((s) => isVertexProxyUrl(s.url)).length
      if (top7ProxyCount > 0) {
        const resolveStart = Date.now()
        const resolved = await resolveVertexProxyUrls(
          top7Sources.map((s) => ({ url: s.url, title: s.title }))
        )
        for (let i = 0; i < top7Sources.length; i++) {
          if (resolved[i].url !== top7Sources[i].url) {
            resolvedUrlMap.set(top7Sources[i].url, resolved[i].url)
          }
        }
        console.log(`[⏱ LATENCY][${reqId}] Phase1.5 proxyResolve top7=${Date.now() - resolveStart}ms proxies=${top7ProxyCount}`)
      }

      // FetchWeb uses resolved URLs (real URLs, not proxy)
      const urlsToFetch = top7Sources.map((s) => resolvedUrlMap.get(s.url) ?? s.url)
      console.log(`[Orchestrator][${reqId}] Phase 1.5: fetching content for ${urlsToFetch.length} URLs...`)
      const fetchStart = Date.now()

      const fetchedContent = await fetchPageContent(
        urlsToFetch,
        { tavilyApiKey: config.tavilyApiKey, timeoutMs: 5_000, requestId: reqId },
      )

      console.log(`[Orchestrator][${reqId}] Phase 1.5 done in ${Date.now() - fetchStart}ms`)

      // Resolve remaining proxy URLs (non-fetched sources) in parallel with compose.
      const unfetchedProxySources = scoredSources.slice(7).filter((s) => isVertexProxyUrl(s.url))
      const proxyResolvePromise = unfetchedProxySources.length > 0
        ? (async () => {
            const resolveStart = Date.now()
            const resolved = await resolveVertexProxyUrls(
              unfetchedProxySources.map((s) => ({ url: s.url, title: s.title }))
            )
            console.log(`[⏱ LATENCY][${reqId}] proxyResolve (parallel) ${Date.now() - resolveStart}ms for ${unfetchedProxySources.length} URLs`)
            return new Map(unfetchedProxySources.map((s, i) => [s.url, resolved[i].url]))
          })()
        : Promise.resolve(new Map<string, string>())

      // Merge resolved URLs from FetchWeb (response.url) into map
      for (const f of fetchedContent) {
        if (f.resolvedUrl !== f.url) resolvedUrlMap.set(f.url, f.resolvedUrl)
      }

      // Enrich sources with pageContent and resolved URLs.
      // FetchWeb receives resolved URLs, so match by both original and resolved URL.
      const enrichedSources = scoredSources.map((s) => {
        const resolvedUrl = resolvedUrlMap.get(s.url) ?? s.url
        const fetched = fetchedContent.find((f) => f.url === resolvedUrl || f.url === s.url || f.resolvedUrl === resolvedUrl)
        return {
          ...s,
          url: resolvedUrl,
          ...(fetched?.pageContent ? { pageContent: fetched.pageContent } : {}),
        }
      })

      const enrichedCount = enrichedSources.filter((s) => s.pageContent).length
      const fetchElapsed = Date.now() - fetchStart
      console.log(`[⏱ LATENCY][${reqId}] Phase1.5 FetchWeb total=${fetchElapsed}ms enriched=${enrichedCount}/${enrichedSources.length} urls=${urlsToFetch.length}`)

      // ── Build compose context using enrichedSources (top 7 have real URLs) ──
      const contextBuildStart = Date.now()
      let searchResultsContext: string
      try {
        searchResultsContext = buildSearchResultsContext(
          enrichedSources.map((s) => ({
            url: s.url,
            title: s.title,
            ...(s.citedText ? { citedText: s.citedText } : {}),
            ...(s.pageContent ? { pageContent: s.pageContent } : {}),
          })),
          cleanSearchText,
          { responseMode },
        )
      } catch (ctxError) {
        console.error(`[Orchestrator][${reqId}] buildSearchResultsContext failed:`, ctxError)
        searchResultsContext = "## SEARCH RESULTS\nNo sources available."
      }

      // Build compose system messages
      // EXCLUDED from compose phase:
      // - paperModePrompt: Contains workflow and tool-usage instructions that conflict
      //   with compose behavior. Even after search-contract cleanup, compose phase only
      //   needs to synthesize search results — it does not need paper workflow guidance.
      // - paperWorkflowReminder: Instructs "call startPaperSession IMMEDIATELY" — irrelevant
      //   and harmful in compose phase (no tools available).
      // COMPOSE_PHASE_DIRECTIVE goes FIRST — it defines the phase context and overrides.
      // When placed after systemPrompt/skillInstructions, the model treats those larger
      // blocks as primary instructions and ignores the smaller directive.
      const postSearchReminder = sourceCount > 0
        ? `\n═══ SEARCH COMPLETED ═══\nWeb search has ALREADY finished. ${sourceCount} sources were found. The results are above.\nYou MUST present actual findings from these sources NOW.\nDo NOT say "akan mencari", "mohon tunggu", "sedang mencari", or any future-tense search promise.\nSearch is DONE. Present the findings.\n\nIMPORTANT OUTPUT FORMAT:\n- Present a BRIEF summary of key findings (max 3-5 bullet points)\n- Then output a yaml-spec choice card with 2-3 approach options if the stage requires it\n- Do NOT write a full draft/article in chat — that belongs in the artifact (created in the next turn when tools are available)\n- Keep chat output SHORT — the detailed content goes into the artifact later\n═══════════════════════`
        : ""

      const composeSystemMessages: Array<{ role: "system"; content: string }> = [
        { role: "system", content: COMPOSE_PHASE_DIRECTIVE },
        { role: "system", content: searchResultsContext },
        ...(postSearchReminder ? [{ role: "system" as const, content: postSearchReminder }] : []),
        { role: "system", content: config.systemPrompt },
        ...(skillInstructions
          ? [{ role: "system" as const, content: skillInstructions }]
          : []),
        ...(config.fileContext
          ? [{ role: "system" as const, content: `File Context:\n\n${config.fileContext}` }]
          : []),
        ...(config.isDraftingStage
          ? [{ role: "system" as const, content: CHOICE_YAML_SYSTEM_PROMPT }]
          : []),
        // Stage-specific compose override — injected LAST for maximum recency bias
        ...(sourceCount > 0 && config.currentStage === "tinjauan_literatur"
          ? [{ role: "system" as const, content: `FINAL OVERRIDE FOR TINJAUAN LITERATUR:\nSearch is DONE. ${sourceCount} sources found. You MUST:\n1. Write 3-5 bullet points summarizing key literature findings\n2. Output a yaml-spec choice card with 2-3 theoretical framework options\n3. NEVER say "akan mencari", "mohon tunggu", or "setelah pencarian selesai"\nThe search results are ALREADY in your context above. Synthesize them NOW.` }]
          : []),
      ]

      const composeMessages = [
        ...composeSystemMessages,
        ...(config.composeMessages ?? []),
      ]

      console.log(`[⏱ LATENCY][${reqId}] Phase2 contextBuild=${Date.now() - contextBuildStart}ms sysMsgCount=${composeSystemMessages.length} totalMsgCount=${composeMessages.length}`)

      // ── Reasoning trace: live step emission (bar + panel) + persistence ──
      // Headline driven by data-reasoning-live (transparent thinking text).
      // Step events driven by CuratedTraceController → data-reasoning-trace (timeline panel).
      // Same controller used for DB persistence snapshot at finish.
      const reasoningTrace = createCuratedTraceController({
        enabled: config.reasoningTraceEnabled,
        traceId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-ws-trace`,
        mode: "websearch",
        stage: config.currentStage,
        webSearchEnabled: true,
        startedAt: config.requestStartedAt,
      })

      const emitTrace = (events: ReturnType<typeof reasoningTrace.markSourceDetected>) => {
        if (!reasoningTrace.enabled || events.length === 0) return
        for (const event of events) {
          writer.write(event)
        }
      }

      // Emit initial steps — bar gets steps immediately, panel can show timeline
      emitTrace(reasoningTrace.initialEvents)
      // Mark sources already found from Phase 1
      if (sourceCount > 0) {
        emitTrace(reasoningTrace.markSourceDetected())
      }

      // ── Compose failover state ──
      let composeFailoverUsed = false
      let canFailover = !!config.fallbackComposeModel

      const startComposeStream = (model: LanguageModel) => streamText({
        model,
        messages: composeMessages,
        ...config.samplingOptions,
        ...(config.reasoningProviderOptions
          ? { providerOptions: config.reasoningProviderOptions as Parameters<typeof streamText>[0]["providerOptions"] }
          : {}),
      })

      // Start primary compose
      const composeStartTime = Date.now()
      let composeResult = startComposeStream(config.composeModel)

      // Transition to composing
      writer.write({
        type: "data-search",
        id: searchStatusId,
        data: {
          status: sourceCount > 0 ? "composing" : "off",
          ...(sourceCount > 0 ? { sourceCount } : {}),
        },
      })

      // ReadableStream from pipeYamlRender may not have [Symbol.asyncIterator]
      // in all runtimes, so use a reader-based async generator
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

      const reasoningTraceId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-trace`
      const createComposeReasoningAccumulator = () => createReasoningLiveAccumulator({
        traceId: reasoningTraceId,
        enabled: config.isTransparentReasoning,
      })
      let liveReasoningAccumulator = createComposeReasoningAccumulator()
      let reasoningChunkCount = 0
      let firstTokenTime = 0
      let textChunkCount = 0
      let lastTextChunkTime = 0
      let maxGapMs = 0
      let gapsOver500ms = 0
      let reasoningBetweenTextCount = 0
      let lastChunkWasReasoning = false

      const emitCompatThought = (part: ReasoningLiveDataPart) => {
        writer.write({
          type: "data-reasoning-thought",
          id: `${part.id}-compat`,
          data: {
            traceId: part.data.traceId,
            delta: part.data.text,
            ts: part.data.ts,
          },
        })
      }

      // Deferred persistence payload — set inside finish handler, consumed after compose loop
      let postFinishWork: {
        fetchedContent: FetchedContent[]
      } | null = null

      // ── Chunk processor: returns action for stream consumption loop ──
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async function processComposeChunk(chunk: any): Promise<"continue" | "break" | "retry"> {
        // Capture data-spec parts emitted by pipeYamlRender for DB persistence
        if ((chunk as { type?: string }).type === SPEC_DATA_PART_TYPE) {
          try {
            const data = (chunk as { data?: { type?: string; patch?: JsonPatch; spec?: Spec } }).data
            if (data?.type === "patch" && data.patch) {
              if (!capturedChoiceSpec) {
                capturedChoiceSpec = { root: "", elements: {} } as Spec
              }
              applySpecPatch(capturedChoiceSpec, data.patch)
            } else if (data?.type === "flat" && data.spec) {
              capturedChoiceSpec = data.spec
            }
          } catch { /* spec capture error — non-critical */ }
        }

        // Convert reasoning chunks to data-reasoning-live events for UI.
        if (
          chunk.type === "reasoning-start" ||
          chunk.type === "reasoning-delta" ||
          chunk.type === "reasoning-end"
        ) {
          if (!config.isTransparentReasoning) return "continue"

          if (chunk.type === "reasoning-delta") {
            reasoningChunkCount += 1
            lastChunkWasReasoning = true
            const livePart = liveReasoningAccumulator.onReasoningDelta(chunk.delta ?? "")
            if (!livePart) return "continue"

            writer.write(livePart)
            emitCompatThought(livePart)
          }
          return "continue"
        }

        // Handle error/abort chunks — retry if no text sent yet
        if (chunk.type === "error" || chunk.type === "abort") {
          console.warn(`[COMPOSE-DIAG][${reqId}] ${chunk.type} chunk received, textChunkCount=${textChunkCount} canFailover=${canFailover}`)
          if (textChunkCount === 0 && canFailover) {
            emitTransparentReasoningResetForRetry({
              isTransparentReasoning: config.isTransparentReasoning,
              hasReasoning: liveReasoningAccumulator.hasReasoning(),
              traceId: reasoningTraceId,
              writer,
            })
            console.warn(`[COMPOSE-DIAG][${reqId}] returning retry — will attempt fallback compose`)
            return "retry"
          }
          const finalLivePart = liveReasoningAccumulator.finalize()
          if (finalLivePart) {
            writer.write(finalLivePart)
            emitCompatThought(finalLivePart)
          }
          // Text already sent — forward and break (can't retry)
          writer.write(chunk)
          return "break"
        }

        if (chunk.type === "text-delta") {
          const now = Date.now()
          textChunkCount++
          if (textChunkCount === 1) {
            firstTokenTime = now
            lastTextChunkTime = now
            console.log(`[⏱ LATENCY][${reqId}] Phase2 firstToken=${firstTokenTime - composeStartTime}ms (time-to-first-text from compose start)`)
          } else {
            const gap = now - lastTextChunkTime
            if (gap > maxGapMs) maxGapMs = gap
            if (gap > 200) {
              gapsOver500ms++
              console.log(`[⏱ STUTTER][${reqId}] gap=${gap}ms after chunk#${textChunkCount} reasoningBetween=${lastChunkWasReasoning} isDrafting=${!!config.isDraftingStage}`)
            }
            lastTextChunkTime = now
          }
          if (lastChunkWasReasoning) {
            reasoningBetweenTextCount++
            lastChunkWasReasoning = false
          }
          composedText += (chunk as { delta?: string }).delta ?? ""
        }

        if (chunk.type === "finish") {
          try {
            // Await parallel proxy resolution for remaining sources (started alongside compose)
            const remainingResolved = await proxyResolvePromise
            for (const [proxyUrl, realUrl] of remainingResolved) {
              resolvedUrlMap.set(proxyUrl, realUrl)
            }

            // Build final sources with all resolved URLs for citation output
            const finalSources = scoredSources.map((s) => ({
              ...s,
              url: resolvedUrlMap.get(s.url) ?? s.url,
            }))
            // Filter out any remaining unresolved proxy URLs
            const cleanSources = finalSources.filter((s) => !isVertexProxyUrl(s.url))
            const referencePresentationSources = buildReferencePresentationSources({
              citations: cleanSources,
              fetchedContent,
            })
            const referenceInventoryItems = buildReferenceInventoryItems(
              referencePresentationSources,
            )

            const persistedSources =
              cleanSources.length > 0 ? cleanSources : undefined

            // Citation anchors: paragraph-end formatting (use cleanSources with resolved URLs)
            const citationAnchors = cleanSources.map((_, idx) => ({
              position: null as number | null,
              sourceNumbers: [idx + 1],
            }))
            const textWithInlineCitations = formatParagraphEndCitations({
              text: composedText,
              sources: cleanSources,
              anchors: citationAnchors,
            })
            const userFacingPayload =
              buildUserFacingSearchPayload({
                text: textWithInlineCitations,
                responseMode,
                referenceItems: referenceInventoryItems,
              })

            // Close search status as done
            writer.write({
              type: "data-search",
              id: searchStatusId,
              data: {
                status:
                  persistedSources && persistedSources.length > 0
                    ? "done"
                    : "off",
              },
            })

            if (userFacingPayload.referenceInventory) {
              writer.write({
                type: "data-reference-inventory",
                id: referenceInventoryId,
                data: {
                  responseMode: userFacingPayload.responseMode,
                  introText: userFacingPayload.referenceInventory.introText,
                  items: userFacingPayload.referenceInventory.items,
                },
              })
            }

            // Emit cited text
            writer.write({
              type: "data-cited-text",
              id: citedTextId,
              data: { text: userFacingPayload.citedText },
            })

            // Emit internal thought if present
            if (userFacingPayload.internalThoughtText) {
              writer.write({
                type: "data-internal-thought",
                id: internalThoughtId,
                data: { text: userFacingPayload.internalThoughtText },
              })
            }

            // Emit cited sources
            if (persistedSources && persistedSources.length > 0) {
              writer.write({
                type: "data-cited-sources",
                id: citedSourcesId,
                data: { sources: persistedSources },
              })
            }

            // Compute combined usage from search + compose
            const composeFinishUsage = chunk.usage
            const combinedInputTokens =
              (searchUsage?.inputTokens ?? 0) +
              (composeFinishUsage?.inputTokens ?? 0)
            const combinedOutputTokens =
              (searchUsage?.outputTokens ?? 0) +
              (composeFinishUsage?.outputTokens ?? 0)

            // Log captured YAML spec for persistence
            if (capturedChoiceSpec && capturedChoiceSpec.root) {
              console.info(`[CHOICE-CARD][yaml-capture] compose stage=${config.currentStage} specKeys=${Object.keys(capturedChoiceSpec).join(",")}`)
            }

            const composeElapsed = Date.now() - composeStartTime
            console.log(`[⏱ LATENCY][${reqId}] Phase2 composeTotal=${composeElapsed}ms textChunks=${textChunkCount} composedChars=${composedText.length}`)
            console.log(`[⏱ STUTTER][${reqId}] summary: maxGap=${maxGapMs}ms gapsOver200ms=${gapsOver500ms} reasoningInterruptions=${reasoningBetweenTextCount} totalReasoningChunks=${reasoningChunkCount} isDrafting=${!!config.isDraftingStage}`)
            console.log(`[⏱ LIFECYCLE][${reqId}] finish-handler: citations+reasoning written, starting persistence`)

            // Call onFinish with the complete result
            const onFinishStart = Date.now()

            // ── Finalize reasoning trace: emit final step events + build persistence snapshot ──
            let reasoningSnapshot: PersistedCuratedTraceSnapshot | undefined
            if (reasoningTrace.enabled) {
              const finalLivePart = liveReasoningAccumulator.finalize()
              if (finalLivePart) {
                writer.write(finalLivePart)
                emitCompatThought(finalLivePart)
              }
              // Populate step labels from reasoning buffer (transparent mode) —
              // consistent with non-websearch path. ReasoningTracePanel filters
              // out template-only steps in transparent mode automatically.
              const fullReasoning = liveReasoningAccumulator.getFullReasoning()
              if (fullReasoning.length > 0) {
                emitTrace(reasoningTrace.populateFromReasoning(fullReasoning))
              }
              emitTrace(reasoningTrace.finalize({
                outcome: "done",
                sourceCount,
              }))
              reasoningSnapshot = reasoningTrace.getPersistedSnapshot()
              if (typeof reasoningSnapshot.durationSeconds === "number" && Number.isFinite(reasoningSnapshot.durationSeconds)) {
                writer.write({
                  type: "data-reasoning-duration",
                  id: `${reasoningTraceId}-duration`,
                  data: {
                    traceId: reasoningTraceId,
                    seconds: reasoningSnapshot.durationSeconds,
                  },
                })
              }
            }

            if (composeFailoverUsed) {
              console.warn(`[Orchestrator][${reqId}] Compose used fallback model before first text output`)
            }

            await config.onFinish({
              text: textWithInlineCitations,
              sources: cleanSources.map((s) => ({ url: s.url, title: s.title, ...(typeof s.publishedAt === "number" ? { publishedAt: s.publishedAt } : {}), ...(s.citedText ? { citedText: s.citedText } : {}) })),
              referencePresentation: {
                responseMode,
                sources: referencePresentationSources,
              },
              usage:
                combinedInputTokens > 0 || combinedOutputTokens > 0
                  ? {
                      inputTokens: combinedInputTokens,
                      outputTokens: combinedOutputTokens,
                    }
                  : undefined,
              searchUsage,
              retrieverName: successRetrieverName,
              retrieverIndex: successRetrieverIndex,
              attemptedRetrievers,
              capturedChoiceSpec: capturedChoiceSpec && capturedChoiceSpec.root ? capturedChoiceSpec : undefined,
              reasoningSnapshot,
            })
            console.log(`[⏱ LATENCY][${reqId}] onFinish(DB writes)=${Date.now() - onFinishStart}ms`)
            console.log(`[⏱ LIFECYCLE][${reqId}] finish-handler: onFinish done, writing finish event`)
            console.log(`[⏱ LATENCY][${reqId}] ORCHESTRATOR MAIN=${Date.now() - orchestratorStart}ms (Phase1=${phase1Start ? Date.now() - phase1Start : '?'}ms includes all)`)

            // Capture payload for detached persistence — runs after compose loop settles
            postFinishWork = { fetchedContent }
          } catch (err) {
            // Citation finalize failed — ensure search status is terminal
            writer.write({
              type: "data-search",
              id: searchStatusId,
              data: { status: sourceCount > 0 ? "done" : "off" },
            })
            console.error(`[Orchestrator][${reqId}] Citation finalize failed:`, err)
          }

          // Layer 4: Post-compose transitional response detection
          const hasSubstantiveFindings = validateComposeSubstantiveness(composedText, sourceCount)
          if (!hasSubstantiveFindings && sourceCount > 0) {
            const correctiveId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-corrective`
            writer.write({
              type: "data-corrective-findings",
              id: correctiveId,
              data: {
                sources: scoredSources.slice(0, 5).map(s => ({
                  title: s.title,
                  url: s.url,
                  citedText: s.citedText?.slice(0, 200),
                })),
                sourceCount,
              },
            })
            console.warn(`[COMPOSE-GUARD][${reqId}] Transitional response detected with ${sourceCount} sources. Corrective event emitted.`)
          }
          if (hasSubstantiveFindings) {
            console.log("[F1-F6-TEST] ComposeGuard PASS", { sourceCount, composedLength: composedText.trim().length })
          }

          // Forward finish chunk to preserve SDK semantics (finishReason, metadata)
          writer.write(chunk)
          console.log(`[⏱ LIFECYCLE][${reqId}] finish-handler: finish event written, stream closing`)
          return "break"
        }

        // Forward all other chunk types (text-delta, text-start, text-end, etc.)
        writer.write(chunk)
        return "continue"
      }

      // ── Stream consumption helper ──
      async function consumeComposeStream(stream: ReadableStream<unknown>) {
        for await (const chunk of iterateStream(stream)) {
          const action = await processComposeChunk(chunk)
          if (action === "continue") continue
          if (action === "break") break
          if (action === "retry") return "retry"
        }
        return "done"
      }

      // ── One-time fallback: reset compose-local state, switch model ──
      async function tryFallbackCompose() {
        if (!canFailover || !config.fallbackComposeModel || textChunkCount > 0) {
          return false
        }
        canFailover = false
        composeFailoverUsed = true

        // Reset compose-local state only — no user-visible text has been emitted yet
        composedText = ""
        liveReasoningAccumulator = createComposeReasoningAccumulator()
        reasoningChunkCount = 0
        textChunkCount = 0
        firstTokenTime = 0
        lastTextChunkTime = 0
        lastChunkWasReasoning = false
        capturedChoiceSpec = null
        maxGapMs = 0
        gapsOver500ms = 0
        reasoningBetweenTextCount = 0

        composeResult = startComposeStream(config.fallbackComposeModel)
        return true
      }

      // ── Build readable stream from compose result ──
      const buildComposeReadable = (result: ReturnType<typeof streamText>) => {
        const uiStream = result.toUIMessageStream({
          sendStart: false,
          generateMessageId: () => messageId,
          sendReasoning: config.isTransparentReasoning,
        })
        return config.isDraftingStage ? pipeYamlRender(uiStream) : uiStream
      }

      // ── Run compose with one-time failover ──
      try {
        let readable = buildComposeReadable(composeResult)
        const outcome = await consumeComposeStream(readable)

        if (outcome === "retry" && await tryFallbackCompose()) {
          readable = buildComposeReadable(composeResult)
          await consumeComposeStream(readable)
        }
      } catch (composeError) {
        if (await tryFallbackCompose()) {
          const readable = buildComposeReadable(composeResult)
          await consumeComposeStream(readable)
        } else {
          throw composeError
        }
      }

      // Extract lightweight title map to avoid retaining enrichedSources (with pageContent) in detached closure
      const sourceTitleMap = new Map(enrichedSources.map((s) => [s.url, s.title]))

      // ── Post-finish persistence ──────────────────────────────────────────
      // finish event is already delivered to the client and execute is allowed
      // to settle. Only exact-source persistence and RAG ingest run in this
      // detached task, so stream close no longer waits on source-document writes.
      //
      // Assistant message persistence stays awaited in onFinish because it also
      // updates conversation freshness metadata. Detaching that path would be an
      // explicit durability tradeoff and is intentionally NOT part of this task.
      // ─────────────────────────────────────────────────────────────────────
      if (postFinishWork !== null) {
        const pf = postFinishWork as { fetchedContent: FetchedContent[] }
        void (async () => {
          try {
            console.log(`[⏱ LIFECYCLE][${reqId}] post-finish: starting detached exact-source persistence`)

            const convexOptions = config.convexToken ? { token: config.convexToken } : undefined
            await persistExactSourceDocuments({
              fetchedContent: pf.fetchedContent,
              conversationId: config.conversationId as Id<"conversations">,
              convexOptions,
              requestId: reqId,
            })

            const ragSourceCount = pf.fetchedContent.filter((f: FetchedContent) => f.fullContent).length
            if (ragSourceCount > 0) {
              console.log(`[⏱ LATENCY][${reqId}] RAG ingest starting (fire-and-forget): ${ragSourceCount} sources`)
            }

            const ragStart = Date.now()
            let ragIdx = 0
            for (const fetched of pf.fetchedContent) {
              if (!fetched.fullContent) continue
              try {
                const sourceStart = Date.now()
                const realUrl = fetched.resolvedUrl
                const sourceTitle = sourceTitleMap.get(realUrl) ?? sourceTitleMap.get(fetched.url)
                await ingestToRag({
                  conversationId: config.conversationId,
                  sourceType: "web",
                  sourceId: realUrl,
                  content: fetched.fullContent,
                  metadata: { title: sourceTitle },
                  convexToken: config.convexToken,
                })
                ragIdx++
                console.log(`[⏱ LATENCY][${reqId}] RAG ingest [${ragIdx}/${ragSourceCount}] ${realUrl.slice(0, 60)}... ${Date.now() - sourceStart}ms`)
              } catch (err) {
                ragIdx++
                console.error(`[⏱ LATENCY][${reqId}] RAG ingest [${ragIdx}/${ragSourceCount}] FAILED ${fetched.resolvedUrl.slice(0, 60)}:`, err)
              }
            }

            if (ragSourceCount > 0) {
              console.log(`[⏱ LATENCY][${reqId}] RAG ingest ALL DONE total=${Date.now() - ragStart}ms sources=${ragSourceCount}`)
            }
          } catch (err) {
            console.error(`[Orchestrator][${reqId}] Detached post-finish persistence failed:`, err)
          }
          console.log(`[⏱ LATENCY][${reqId}] DETACHED ALL DONE total=${Date.now() - orchestratorStart}ms (from request start, includes persist+RAG)`)
        })()
      }

      // ── Execute settle point: stream can close after this line ──
      console.log(`[⏱ LATENCY][${reqId}] EXECUTE SETTLE=${Date.now() - orchestratorStart}ms (stream will close, client transitions to ready)`)
    },
  })

  return createUIMessageStreamResponse({ stream })
}

function limitExactDocumentText(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").trim()
  if (normalized.length <= MAX_EXACT_DOCUMENT_TEXT_CHARS) return normalized

  const reserved = EXACT_TRUNCATION_MARKER.length + 2
  const maxBodyChars = Math.max(0, MAX_EXACT_DOCUMENT_TEXT_CHARS - reserved)
  const truncated = normalized.slice(0, maxBodyChars)
  const lastBreak = truncated.lastIndexOf("\n\n")
  return lastBreak > MAX_EXACT_DOCUMENT_TEXT_CHARS * 0.5
    ? `${truncated.slice(0, lastBreak)}\n\n${EXACT_TRUNCATION_MARKER}`
    : `${truncated}\n\n${EXACT_TRUNCATION_MARKER}`
}

function limitExactParagraphs(
  paragraphs: Array<{ index: number; text: string }>,
): Array<{ index: number; text: string }> {
  if (paragraphs.length === 0) return []

  const limited: Array<{ index: number; text: string }> = []
  let remainingCount = MAX_EXACT_PARAGRAPH_COUNT
  let remainingChars = Math.max(0, MAX_EXACT_PARAGRAPH_TEXT_CHARS - EXACT_PARAGRAPH_TAIL_MARKER.length)
  let truncated = false

  for (const paragraph of paragraphs) {
    const normalized = paragraph.text.replace(/\r\n/g, "\n").trim()
    if (!normalized) continue

    if (remainingCount <= 0 || remainingChars <= 0) {
      truncated = true
      break
    }

    if (normalized.length <= remainingChars) {
      limited.push({ index: paragraph.index, text: normalized })
      remainingCount -= 1
      remainingChars -= normalized.length
      continue
    }

    if (remainingChars > 0) {
      limited.push({
        index: paragraph.index,
        text: normalized.slice(0, remainingChars),
      })
    }

    truncated = true
    break
  }

  if (truncated) {
    limited.push({
      index: -1,
      text: EXACT_PARAGRAPH_TAIL_MARKER,
    })
  }

  return limited
}
