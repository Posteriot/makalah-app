type ExactSourceSummaryForGuardrail = {
  sourceId: string
  originalUrl: string
  resolvedUrl: string
  title?: string
  siteName?: string
}

type DeterministicExactSourceResolution =
  | { mode: "none"; reason: string }
  | { mode: "clarify"; reason: string }
  | { mode: "force-inspect"; reason: string; matchedSource: ExactSourceSummaryForGuardrail }

type SimpleChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export const EXACT_SOURCE_NARRATIVE_BANNED_PHRASES = [
  "metadata sumber",
  "data yang tersimpan",
  "hasil pencarian sebelumnya",
  "aku akan cek metadata",
  "sumber yang tersimpan",
  "saya akan cek metadata",
]

export const EXACT_SOURCE_INSPECTION_RULES = `EXACT SOURCE INSPECTION RULES:
- For any request asking for an exact title, author, published date, paragraph number, or verbatim quote from a previously stored source, call inspectSourceDocument before answering.
- Use quoteFromSource and searchAcrossSources only for semantic retrieval, not for exact paragraph positions or exact metadata verification.
- If the requested exact detail is unavailable, say it cannot be verified exactly from the verified source data.
- Do not infer article titles from URLs, slugs, or citation labels.
- Never mention internal tools, RAG, retrieval, fetch pipelines, or available web sources to the user.
- Do not say phrases like: ${EXACT_SOURCE_NARRATIVE_BANNED_PHRASES.join(", ")}.
- Respond in natural narrative language.`

export function buildExactSourceInspectionSystemMessage() {
  return {
    role: "system" as const,
    content: EXACT_SOURCE_INSPECTION_RULES,
  }
}

export function buildExactSourceInspectionRouterNote(hasRecentSources: boolean) {
  if (!hasRecentSources) return ""

  return `
RAG SOURCE CHUNKS AVAILABLE:
Stored source content from previous web search turns is available for follow-up inspection without a new web search.
Use inspectSourceDocument for exact title, author, published date, paragraph number, or verbatim quote requests about existing sources.
Use quoteFromSource and searchAcrossSources only when the user needs relevant passages or semantic matches within existing sources.
Set enableWebSearch=false when the user asks about previously cited sources, requests quotes,
asks for exact title/author/date/paragraph details from earlier results, or references information from prior search responses.
Only set enableWebSearch=true when the user explicitly asks for NEW/ADDITIONAL sources on a NEW topic.`
}

export function buildDeterministicExactSourceForceInspectNote(
  source: ExactSourceSummaryForGuardrail
) {
  return `
DETERMINISTIC EXACT SOURCE ROUTING:
The source target has already been resolved uniquely.
You must call inspectSourceDocument first using sourceId="${source.sourceId}".
Selected source title: ${source.title ?? "(title unavailable)"}
Selected source site: ${source.siteName ?? "(site unavailable)"}
Selected source original URL: ${source.originalUrl}
Selected source resolved URL: ${source.resolvedUrl}
Do not answer from memory, prior assistant wording, semantic matches, or conversation context before the tool result returns.
After the tool result returns, answer naturally without exposing internal mechanics.`
}

export function buildDeterministicExactSourceClarifyNote() {
  return `
DETERMINISTIC EXACT SOURCE ROUTING:
The user appears to be asking for exact source verification, but the target source is not uniquely identified.
Ask a brief clarification question to identify the exact source first.
Do not guess.
Do not answer from memory or semantic similarity.
Keep the clarification natural and do not expose internal mechanics.`
}

function injectSystemNote(
  messages: SimpleChatMessage[],
  note: string
): SimpleChatMessage[] {
  if (!note.trim()) return messages

  if (messages.length === 0) {
    return [{ role: "system", content: note.trim() }]
  }

  return [messages[0], { role: "system", content: note.trim() }, ...messages.slice(1)]
}

export function buildDeterministicExactSourcePrepareStep(options: {
  messages: SimpleChatMessage[]
  resolution: DeterministicExactSourceResolution
}) {
  if (options.resolution.mode === "force-inspect") {
    const note = buildDeterministicExactSourceForceInspectNote(options.resolution.matchedSource)
    return {
      messages: injectSystemNote(options.messages, note),
      prepareStep: ({ stepNumber }: { stepNumber: number }) => {
        if (stepNumber === 0) {
          return {
            toolChoice: { type: "tool", toolName: "inspectSourceDocument" } as const,
            activeTools: ["inspectSourceDocument"] as string[],
          }
        }

        if (stepNumber === 1) {
          return {
            toolChoice: "none" as const,
            activeTools: [] as string[],
          }
        }

        return undefined
      },
      maxToolSteps: 2,
    }
  }

  if (options.resolution.mode === "clarify") {
    return {
      messages: injectSystemNote(options.messages, buildDeterministicExactSourceClarifyNote()),
      prepareStep: undefined,
      maxToolSteps: undefined,
    }
  }

  return {
    messages: options.messages,
    prepareStep: undefined,
    maxToolSteps: undefined,
  }
}
