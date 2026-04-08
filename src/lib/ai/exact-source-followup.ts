export type ExactSourceSummary = {
  sourceId: string
  originalUrl: string
  resolvedUrl: string
  title?: string
  siteName?: string
  author?: string
  publishedAt?: string
}

export type ExactSourceConversationMessage = {
  role: string
  content: string
}

export type ExactSourceFollowupResolution =
  | { mode: "none"; reason: string }
  | { mode: "clarify"; reason: string }
  | { mode: "force-inspect"; reason: string; matchedSource: ExactSourceSummary }

type ResolveExactSourceFollowupParams = {
  lastUserMessage: string
  recentMessages: ExactSourceConversationMessage[]
  availableExactSources: ExactSourceSummary[]
  dualWriteModel?: import("ai").LanguageModel
}

const EXACT_SOURCE_PATTERNS = [
  /\bjudul\b/,
  /\bjudul lengkap(?:nya)?\b/,
  /\bpenulis\b/,
  /\bauthor\b/,
  /\btanggal\b/,
  /\bterbit\b/,
  /\bpublished\b/,
  /\bparagraf\b/,
  /\bverbatim\b/,
  /\bkutip(?:an)?\b/,
  /\bsecara persis\b/,
  /\bkata demi kata\b/,
]

const NON_EXACT_SUMMARY_PATTERNS = [
  /\bringkas\b/,
  /\brangkum\b/,
  /\bsimpulkan\b/,
  /\binti\b/,
  /\bgambaran\b/,
  /\bdampak\b/,
]

const CONTINUATION_PATTERNS = [
  /^lengkapnya\??$/,
  /^judul lengkapnya\??$/,
  /^yang itu\??$/,
  /^yang itu tadi\??$/,
  /^yang tadi\??$/,
  /^yang mana\??$/,
  /^itu tadi\??$/,
]

const CONTINUATION_CUES = [
  "lengkapnya",
  "judul lengkapnya",
  "yang itu",
  "yang itu tadi",
  "yang tadi",
  "itu tadi",
  "tidak lengkap",
  "belum lengkap",
]

function normalizeText(value: string | undefined): string {
  if (!value) return ""
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/https?:\/\//g, "")
    .replace(/www\./g, "")
    .replace(/[^\p{L}\p{N}\s./-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function extractDomainLabel(url: string | undefined): string {
  if (!url) return ""
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, "").toLowerCase()
  } catch {
    return normalizeText(url).split("/")[0] ?? ""
  }
}

function isExactIntent(text: string): boolean {
  if (!text) return false
  return EXACT_SOURCE_PATTERNS.some((pattern) => pattern.test(text))
}

function isNonExactSummaryRequest(text: string): boolean {
  if (!text) return false
  return NON_EXACT_SUMMARY_PATTERNS.some((pattern) => pattern.test(text))
}

function isContinuationPrompt(text: string): boolean {
  if (!text) return false
  if (CONTINUATION_PATTERNS.some((pattern) => pattern.test(text))) return true
  if (text.length > 80) return false

  return CONTINUATION_CUES.some((cue) => text.includes(cue))
}

function buildSourceCandidates(source: ExactSourceSummary): string[] {
  return [
    normalizeText(source.title),
    normalizeText(source.siteName),
    normalizeText(source.author),
    normalizeText(source.originalUrl),
    normalizeText(source.resolvedUrl),
    normalizeText(source.sourceId),
    extractDomainLabel(source.originalUrl),
    extractDomainLabel(source.resolvedUrl),
  ].filter(Boolean)
}

function hasTitleMatch(message: string, source: ExactSourceSummary): boolean {
  const normalizedTitle = normalizeText(source.title)
  if (!normalizedTitle) return false
  if (message.includes(normalizedTitle)) return true

  const titleTokens = normalizedTitle.split(" ").filter((token) => token.length >= 4)
  if (titleTokens.length < 2) return false
  const matchedTokenCount = titleTokens.filter((token) => message.includes(token)).length
  return matchedTokenCount >= Math.min(4, titleTokens.length)
}

function matchesSourceReference(message: string, source: ExactSourceSummary): boolean {
  if (hasTitleMatch(message, source)) return true

  return buildSourceCandidates(source).some((candidate) => {
    if (!candidate) return false
    if (candidate.length <= 2) return false
    if (candidate.includes(".") || candidate.includes("/")) {
      return message.includes(candidate)
    }
    return new RegExp(`\\b${escapeRegExp(candidate)}\\b`, "u").test(message)
  })
}

function findExplicitMatches(
  message: string,
  availableExactSources: ExactSourceSummary[]
): ExactSourceSummary[] {
  return availableExactSources.filter((source) => matchesSourceReference(message, source))
}

function resolveFromRecentContext(
  recentMessages: ExactSourceConversationMessage[],
  availableExactSources: ExactSourceSummary[]
): ExactSourceSummary[] {
  for (let index = recentMessages.length - 1; index >= 0; index -= 1) {
    const normalizedContent = normalizeText(recentMessages[index]?.content ?? "")
    if (!normalizedContent) continue

    const matches = findExplicitMatches(normalizedContent, availableExactSources)
    if (matches.length > 0) {
      return matches
    }
  }

  return []
}

/**
 * Resolve exact source follow-up.
 *
 * Regex is primary. When `dualWriteModel` is provided, fires the semantic
 * classifier in the background for parity comparison. Regex result is ALWAYS
 * returned. Classifier shadow data is logged for parity evaluation (ST-5.5).
 */
export function resolveExactSourceFollowup({
  lastUserMessage,
  recentMessages,
  availableExactSources,
  dualWriteModel,
}: ResolveExactSourceFollowupParams): ExactSourceFollowupResolution {
  const normalizedLastUserMessage = normalizeText(lastUserMessage)

  if (!normalizedLastUserMessage) {
    return { mode: "none", reason: "empty-user-message" }
  }

  // ── Regex intent detection (primary, unchanged) ──
  const explicitExactIntent = isExactIntent(normalizedLastUserMessage)
  const continuationPrompt = isContinuationPrompt(normalizedLastUserMessage)

  if (!explicitExactIntent && !continuationPrompt) {
    fireDualWrite(dualWriteModel, normalizedLastUserMessage, availableExactSources, "none")
    return { mode: "none", reason: "not-an-exact-source-request" }
  }

  if (isNonExactSummaryRequest(normalizedLastUserMessage) && !explicitExactIntent) {
    fireDualWrite(dualWriteModel, normalizedLastUserMessage, availableExactSources, "none")
    return { mode: "none", reason: "not-an-exact-source-request" }
  }

  // ── Source matching (preserved, unchanged) ──
  const directMatches = findExplicitMatches(normalizedLastUserMessage, availableExactSources)
  const contextMatches =
    directMatches.length === 0 && continuationPrompt
      ? resolveFromRecentContext(recentMessages, availableExactSources)
      : []
  const matches = directMatches.length > 0 ? directMatches : contextMatches

  if (matches.length === 1) {
    fireDualWrite(dualWriteModel, normalizedLastUserMessage, availableExactSources, "force-inspect")
    return {
      mode: "force-inspect",
      reason: directMatches.length > 0 ? "unique-source-match" : "resolved-from-recent-context",
      matchedSource: matches[0],
    }
  }

  if (matches.length > 1) {
    fireDualWrite(dualWriteModel, normalizedLastUserMessage, availableExactSources, "clarify")
    return {
      mode: "clarify",
      reason: "ambiguous-source-match",
    }
  }

  if (explicitExactIntent) {
    fireDualWrite(dualWriteModel, normalizedLastUserMessage, availableExactSources, "clarify")
    return {
      mode: "clarify",
      reason: "exact-intent-without-unique-source",
    }
  }

  fireDualWrite(dualWriteModel, normalizedLastUserMessage, availableExactSources, "none")
  return { mode: "none", reason: "not-an-exact-source-request" }
}

// ── Dual-write: fire-and-forget classifier comparison ──

function fireDualWrite(
  model: import("ai").LanguageModel | undefined,
  lastUserMessage: string,
  availableExactSources: ExactSourceSummary[],
  regexMode: "none" | "force-inspect" | "clarify",
): void {
  if (!model) return

  const availableSourceTitles = availableExactSources
    .map((s) => s.title)
    .filter((t): t is string => !!t)

  import("./classifiers/exact-source-classifier")
    .then(({ classifyExactSourceIntent }) =>
      classifyExactSourceIntent({ lastUserMessage, availableSourceTitles, model })
    )
    .then((classifierResult) => {
      if (!classifierResult) {
        console.info("[exact-source][dual-write] classifier returned null")
        return
      }
      const c = classifierResult.output
      const classifierMode = c.mode === "force_inspect" ? "force-inspect" : c.mode
      if (classifierMode !== regexMode) {
        console.info(
          `[exact-source][dual-write] DISCREPANCY mode: regex=${regexMode} classifier=${classifierMode} ` +
          `sourceIntent=${c.sourceIntent} hint=${c.mentionedSourceHint} confidence=${c.confidence} ` +
          `input="${lastUserMessage.slice(0, 80)}"`
        )
      } else {
        console.info(
          `[exact-source][dual-write] MATCH mode=${regexMode} sourceIntent=${c.sourceIntent} ` +
          `confidence=${c.confidence} input="${lastUserMessage.slice(0, 80)}"`
        )
      }
    })
    .catch((err) => {
      console.error("[exact-source][dual-write] classifier comparison failed:", err)
    })
}
