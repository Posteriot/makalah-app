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

DO NOT:
- Promise to search ("beri aku waktu", "saya akan mencari", "izinkan saya mencari")
- Announce that you will perform a search
- Ask for permission to search
- Reference or attempt to use tools (no tools are available in this phase)

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

  // Build compose system messages
  // NOTE: paperWorkflowReminder is EXCLUDED — it instructs "call startPaperSession
  // IMMEDIATELY" which is irrelevant and harmful in compose phase (no tools available).
  // COMPOSE_PHASE_DIRECTIVE overrides conflicting instructions from systemPrompt and
  // paperModePrompt (tool references, dialog-first, web-search-mandatory).
  const composeSystemMessages: Array<{ role: "system"; content: string }> = [
    { role: "system", content: config.systemPrompt },
    ...(config.paperModePrompt
      ? [{ role: "system" as const, content: config.paperModePrompt }]
      : []),
    // paperWorkflowReminder intentionally excluded from compose phase
    ...(skillInstructions
      ? [{ role: "system" as const, content: skillInstructions }]
      : []),
    { role: "system", content: COMPOSE_PHASE_DIRECTIVE },
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
