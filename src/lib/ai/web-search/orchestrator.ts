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

/**
 * Execute a two-pass web search flow:
 *   Phase 1: Silent search via retriever chain (runs BEFORE stream creation)
 *   Phase 2: Compose with skill instructions, stream to client
 *
 * Phase 1 runs before stream creation so that errors propagate to route.ts
 * for retry / fallback handling.
 */
export async function executeWebSearch(
  config: WebSearchOrchestratorConfig,
): Promise<Response> {
  const attemptedRetrievers: string[] = []

  // ────────────────────────────────────────────────────────────
  // PHASE 1: Silent search — iterate retrieverChain until one succeeds
  // ────────────────────────────────────────────────────────────
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
      const { model, tools } = retriever.buildStreamConfig(retrieverConfig)

      const searchResult = streamText({
        model,
        messages: searchMessages,
        ...(tools ? { tools: tools as Parameters<typeof streamText>[0]["tools"] } : {}),
        ...config.samplingOptions,
      })

      // Await full text (not streamed to user)
      searchText = await searchResult.text
      const usage = await searchResult.usage
      searchUsage = usage
        ? { inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0 }
        : undefined

      // Extract and canonicalize sources
      const rawCitations = await retriever.extractSources(searchResult)
      sources = canonicalizeCitationUrls(rawCitations)

      console.log(`[Orchestrator] success: ${retriever.name}, citations=${sources.length}, text=${searchText.length}chars`)

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
  // Build compose context (BEFORE stream creation)
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
  }))
  const sourceCount = scoredSources.length

  let skillInstructions: string | null = null
  try {
    const skillContext: SkillContext = {
      isPaperMode: !!config.paperModePrompt,
      currentStage: null,
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

  let searchResultsContext: string
  try {
    searchResultsContext = buildSearchResultsContext(
      scoredSources.map((s) => ({ url: s.url, title: s.title })),
      cleanSearchText,
    )
  } catch (ctxError) {
    console.error("[Orchestrator] buildSearchResultsContext failed:", ctxError)
    searchResultsContext = "## SEARCH RESULTS\nNo sources available."
  }

  // Build compose messages: system + optional paper prompts + skills + search results + file context + conversation
  const composeSystemMessages: Array<{ role: "system"; content: string }> = [
    { role: "system", content: config.systemPrompt },
    ...(config.paperModePrompt
      ? [{ role: "system" as const, content: config.paperModePrompt }]
      : []),
    ...(config.paperWorkflowReminder
      ? [{ role: "system" as const, content: config.paperWorkflowReminder }]
      : []),
    ...(skillInstructions
      ? [{ role: "system" as const, content: skillInstructions }]
      : []),
    { role: "system", content: searchResultsContext },
    ...(config.fileContext
      ? [{ role: "system" as const, content: `File Context:\n\n${config.fileContext}` }]
      : []),
  ]

  const composeMessages = [
    ...composeSystemMessages,
    ...(config.composeMessages ?? []),
  ]

  // Start compose stream — may throw, which propagates to route.ts for retry
  const composeResult = streamText({
    model: config.composeModel,
    messages: composeMessages,
    ...config.samplingOptions,
  })

  // ────────────────────────────────────────────────────────────
  // PHASE 2: Stream creation — emit search status, compose output, citations
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

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      let composedText = ""

      // Emit search status: "searching" → "composing" (Phase 1 already done)
      writer.write({ type: "start", messageId })
      writer.write({
        type: "data-search",
        id: searchStatusId,
        data: { status: "searching" },
      })

      // Transition to composing (Phase 1 completed before stream)
      writer.write({
        type: "data-search",
        id: searchStatusId,
        data: {
          status: sourceCount > 0 ? "composing" : "off",
          ...(sourceCount > 0 ? { sourceCount } : {}),
        },
      })

      // Stream compose output to user
      for await (const chunk of composeResult.toUIMessageStream({
        sendStart: false,
        generateMessageId: () => messageId,
        sendReasoning: config.isTransparentReasoning,
      })) {
        // Skip reasoning chunks (not forwarded in web search mode)
        if (
          chunk.type === "reasoning-start" ||
          chunk.type === "reasoning-delta" ||
          chunk.type === "reasoning-end"
        ) {
          continue
        }

        if (chunk.type === "text-delta") {
          composedText += chunk.delta
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

            // Call onFinish with the complete result
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
            })
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
