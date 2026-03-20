import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai"
import type { NormalizedCitation } from "@/lib/citations/types"
import { getSearchSystemPrompt, augmentUserMessageForSearch } from "@/lib/ai/search-system-prompt"
import { buildSearchResultsContext } from "@/lib/ai/search-results-context"
import { composeSkillInstructions } from "@/lib/ai/skills"
import { formatParagraphEndCitations } from "@/lib/citations/paragraph-citation-formatter"
import { buildUserFacingSearchPayload } from "@/lib/ai/internal-thought-separator"
import { fetchPageContent } from "./content-fetcher"
import {
  sanitizeMessagesForSearch,
  canonicalizeCitationUrls,
  createSearchUnavailableResponse,
} from "./utils"
import type {
  WebSearchOrchestratorConfig,
  RetrieverChainEntry,
} from "./types"
import type { SkillContext } from "@/lib/ai/skills/types"
import { pipeYamlRender } from "@json-render/yaml"
import { SPEC_DATA_PART_TYPE, applySpecPatch } from "@json-render/core"
import type { Spec, JsonPatch } from "@json-render/core"
import { CHOICE_YAML_SYSTEM_PROMPT } from "@/lib/json-render/choice-yaml-prompt"
import { sanitizeReasoningDelta } from "@/lib/ai/reasoning-sanitizer"
import { ingestToRag } from "@/lib/ai/rag-ingest"

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
- Promise to search ("beri aku waktu", "saya akan mencari", "izinkan saya mencari")
- Announce that you will perform a search
- Ask for permission to search
- Reference or attempt to use tools (no tools are available in this phase)
- Add facts, claims, titles, names, or biographical details not found in verified page content

OVERRIDE — the following instructions from other system messages DO NOT APPLY here:
- Any "dialog first" / "tanya dulu sebelum generate" instructions — present results NOW
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
export async function executeWebSearch(
  config: WebSearchOrchestratorConfig,
): Promise<Response> {
  const orchestratorStart = Date.now()
  const attemptedRetrievers: string[] = []

  // ────────────────────────────────────────────────────────────
  // PHASE 1: Silent search — iterate retrieverChain until one succeeds
  // ────────────────────────────────────────────────────────────
  const phase1Start = Date.now()
  const rawMessages = config.messages ?? []
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

      const searchResult = streamText({
        model,
        messages: searchMessages,
        ...(tools ? { tools: tools as Parameters<typeof streamText>[0]["tools"] } : {}),
        ...config.samplingOptions,
      })

      // Await full text (not streamed to user)
      searchText = await searchResult.text
      const textDone = Date.now()
      const usage = await searchResult.usage
      searchUsage = usage
        ? { inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0 }
        : undefined

      // Extract and canonicalize sources
      const extractStart = Date.now()
      const rawCitations = await retriever.extractSources(searchResult)
      sources = canonicalizeCitationUrls(rawCitations)
      const extractDone = Date.now()

      console.log(`[⏱ LATENCY] Phase1 retriever="${retriever.name}" textGen=${textDone - retrieverStart}ms extractSources=${extractDone - extractStart}ms total=${extractDone - retrieverStart}ms citations=${sources.length} text=${searchText.length}chars`)

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

  console.log(`[⏱ LATENCY] Phase1 TOTAL=${Date.now() - phase1Start}ms tried=${attemptedRetrievers.join(",")} winner=${successRetrieverName || "NONE"}`)

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
    console.error("[Orchestrator] composeSkillInstructions failed:", skillError)
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

      const urlsToFetch = scoredSources.slice(0, 7).map((s) => s.url)
      console.log(`[Orchestrator] Phase 1.5: fetching content for ${urlsToFetch.length} URLs...`)
      const fetchStart = Date.now()

      const fetchedContent = await fetchPageContent(
        urlsToFetch,
        { tavilyApiKey: config.tavilyApiKey, timeoutMs: 5_000 },
      )

      console.log(`[Orchestrator] Phase 1.5 done in ${Date.now() - fetchStart}ms`)

      // Enrich sources with pageContent
      const enrichedSources = scoredSources.map((s) => {
        const fetched = fetchedContent.find((f) => f.url === s.url)
        return {
          ...s,
          ...(fetched?.pageContent ? { pageContent: fetched.pageContent } : {}),
        }
      })

      const enrichedCount = enrichedSources.filter((s) => s.pageContent).length
      const fetchElapsed = Date.now() - fetchStart
      console.log(`[⏱ LATENCY] Phase1.5 FetchWeb total=${fetchElapsed}ms enriched=${enrichedCount}/${enrichedSources.length} urls=${urlsToFetch.length}`)

      // ── Build compose context using enrichedSources ──
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
        )
      } catch (ctxError) {
        console.error("[Orchestrator] buildSearchResultsContext failed:", ctxError)
        searchResultsContext = "## SEARCH RESULTS\nNo sources available."
      }

      // Build compose system messages
      // EXCLUDED from compose phase:
      // - paperModePrompt: Contains "ASK user to confirm search" and tool usage instructions
      //   that conflict with compose behavior. The model follows these over COMPOSE_PHASE_DIRECTIVE
      //   because they are longer and more specific. Compose phase only needs to synthesize
      //   search results — it does not need paper workflow instructions.
      // - paperWorkflowReminder: Instructs "call startPaperSession IMMEDIATELY" — irrelevant
      //   and harmful in compose phase (no tools available).
      // COMPOSE_PHASE_DIRECTIVE goes FIRST — it defines the phase context and overrides.
      // When placed after systemPrompt/skillInstructions, the model treats those larger
      // blocks as primary instructions and ignores the smaller directive.
      const composeSystemMessages: Array<{ role: "system"; content: string }> = [
        { role: "system", content: COMPOSE_PHASE_DIRECTIVE },
        { role: "system", content: searchResultsContext },
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
      ]

      const composeMessages = [
        ...composeSystemMessages,
        ...(config.composeMessages ?? []),
      ]

      console.log(`[⏱ LATENCY] Phase2 contextBuild=${Date.now() - contextBuildStart}ms sysMsgCount=${composeSystemMessages.length} totalMsgCount=${composeMessages.length}`)

      // Start compose stream
      const composeStartTime = Date.now()
      const composeResult = streamText({
        model: config.composeModel,
        messages: composeMessages,
        ...config.samplingOptions,
        ...(config.reasoningProviderOptions
          ? { providerOptions: config.reasoningProviderOptions as Parameters<typeof streamText>[0]["providerOptions"] }
          : {}),
      })

      // Transition to composing
      writer.write({
        type: "data-search",
        id: searchStatusId,
        data: {
          status: sourceCount > 0 ? "composing" : "off",
          ...(sourceCount > 0 ? { sourceCount } : {}),
        },
      })

      // Build UI stream, optionally piping through YAML transform
      const uiStream = composeResult.toUIMessageStream({
        sendStart: false,
        generateMessageId: () => messageId,
        sendReasoning: config.isTransparentReasoning,
      })
      const yamlTransformedStream = config.isDraftingStage
        ? pipeYamlRender(uiStream)
        : uiStream

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

      // Reasoning accumulator: convert raw reasoning chunks to data-reasoning-thought
      // events that the client UI expects (same pattern as non-search path in route.ts)
      const reasoningTraceId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-trace`
      let reasoningChunkCount = 0
      let firstTokenTime = 0
      let textChunkCount = 0

      // Stream compose output to user
      for await (const chunk of iterateStream(yamlTransformedStream)) {
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

        // Convert reasoning chunks to data-reasoning-thought events for UI
        if (
          chunk.type === "reasoning-start" ||
          chunk.type === "reasoning-delta" ||
          chunk.type === "reasoning-end"
        ) {
          if (!config.isTransparentReasoning) continue

          if (chunk.type === "reasoning-delta") {
            reasoningChunkCount += 1
            const sanitized = sanitizeReasoningDelta(chunk.delta ?? "")
            if (sanitized.trim() && (reasoningChunkCount % 3 === 0 || sanitized.length > 100)) {
              writer.write({
                type: "data-reasoning-thought",
                id: `${reasoningTraceId}-thought-${reasoningChunkCount}`,
                data: {
                  traceId: reasoningTraceId,
                  delta: sanitized,
                  ts: Date.now(),
                },
              })
            }
          }
          continue
        }

        if (chunk.type === "text-delta") {
          textChunkCount++
          if (textChunkCount === 1) {
            firstTokenTime = Date.now()
            console.log(`[⏱ LATENCY] Phase2 firstToken=${firstTokenTime - composeStartTime}ms (time-to-first-text from compose start)`)
          }
          composedText += (chunk as { delta?: string }).delta ?? ""
        }

        if (chunk.type === "finish") {
          try {
            const persistedSources =
              scoredSources.length > 0 ? scoredSources : undefined

            // Citation anchors: paragraph-end formatting
            const citationAnchors = scoredSources.map((_, idx) => ({
              position: null as number | null,
              sourceNumbers: [idx + 1],
            }))
            const textWithInlineCitations = formatParagraphEndCitations({
              text: composedText,
              sources: scoredSources,
              anchors: citationAnchors,
            })
            const userFacingPayload =
              buildUserFacingSearchPayload(textWithInlineCitations)

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const composeFinishUsage = (chunk as any).usage
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
            console.log(`[⏱ LATENCY] Phase2 composeTotal=${composeElapsed}ms textChunks=${textChunkCount} composedChars=${composedText.length}`)

            // Call onFinish with the complete result
            const onFinishStart = Date.now()
            await config.onFinish({
              text: textWithInlineCitations,
              sources,
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
            })
            console.log(`[⏱ LATENCY] onFinish(DB writes)=${Date.now() - onFinishStart}ms`)
            console.log(`[⏱ LATENCY] ORCHESTRATOR TOTAL=${Date.now() - orchestratorStart}ms (Phase1=${phase1Start ? Date.now() - phase1Start : '?'}ms includes all)`)

            // ── RAG Ingest: fire-and-forget, SEQUENTIAL to avoid rate limit ──
            // Each source ingested one at a time to stay within embedding API quota.
            const ragSourceCount = fetchedContent.filter((f) => f.fullContent).length
            if (ragSourceCount > 0) {
              console.log(`[⏱ LATENCY] RAG ingest starting (fire-and-forget): ${ragSourceCount} sources`)
            }
            void (async () => {
              const ragStart = Date.now()
              let ragIdx = 0
              for (const fetched of fetchedContent) {
                if (fetched.fullContent) {
                  try {
                    const sourceStart = Date.now()
                    const source = enrichedSources.find((s) => s.url === fetched.url)
                    await ingestToRag({
                      conversationId: config.conversationId,
                      sourceType: "web",
                      sourceId: fetched.url,
                      content: fetched.fullContent,
                      metadata: { title: source?.title },
                      convexToken: config.convexToken,
                    })
                    ragIdx++
                    console.log(`[⏱ LATENCY] RAG ingest [${ragIdx}/${ragSourceCount}] ${fetched.url.slice(0, 60)}... ${Date.now() - sourceStart}ms`)
                  } catch (err) {
                    ragIdx++
                    console.error(`[⏱ LATENCY] RAG ingest [${ragIdx}/${ragSourceCount}] FAILED ${fetched.url.slice(0, 60)}:`, err)
                  }
                }
              }
              if (ragSourceCount > 0) {
                console.log(`[⏱ LATENCY] RAG ingest ALL DONE total=${Date.now() - ragStart}ms sources=${ragSourceCount}`)
              }
            })()
          } catch (err) {
            // Citation finalize failed — ensure search status is terminal
            writer.write({
              type: "data-search",
              id: searchStatusId,
              data: { status: sourceCount > 0 ? "done" : "off" },
            })
            console.error("[Orchestrator] Citation finalize failed:", err)
          }

          continue
        }

        // Forward all other chunk types (text-delta, text-start, text-end, etc.)
        writer.write(chunk)
      }
    },
  })

  return createUIMessageStreamResponse({ stream })
}
