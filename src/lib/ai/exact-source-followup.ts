import type { LanguageModel } from "ai"

import { classifyExactSourceIntent } from "./classifiers/exact-source-classifier"

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
  model?: LanguageModel
}

// ── Preserve: text normalization utilities (deterministic) ──

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

// ── Preserve: source matching logic (structural, not language understanding) ──

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
 * Resolve whether the user is requesting exact source follow-up.
 *
 * Decision flow:
 * 1. Semantic classifier determines intent (exact_detail, summary, continuation, none)
 *    — replaces EXACT_SOURCE_PATTERNS, NON_EXACT_SUMMARY_PATTERNS, CONTINUATION_PATTERNS regex
 * 2. Source matching logic finds which source the user refers to (preserved, unchanged)
 * 3. Resolution: force-inspect (1 match), clarify (multiple/ambiguous), none (no intent)
 *
 * When model is not provided: returns "none" (safe default — no inspection triggered).
 * When classifier fails: returns "none" (safe default).
 */
export async function resolveExactSourceFollowup({
  lastUserMessage,
  recentMessages,
  availableExactSources,
  model,
}: ResolveExactSourceFollowupParams): Promise<ExactSourceFollowupResolution> {
  const normalizedLastUserMessage = normalizeText(lastUserMessage)

  if (!normalizedLastUserMessage) {
    return { mode: "none", reason: "empty-user-message" }
  }

  if (!model) {
    return { mode: "none", reason: "no-model-available" }
  }

  // ── Classifier determines intent ──
  const availableSourceTitles = availableExactSources
    .map((s) => s.title)
    .filter((t): t is string => !!t)

  const classifierResult = await classifyExactSourceIntent({
    lastUserMessage: normalizedLastUserMessage,
    availableSourceTitles,
    model,
  })

  if (!classifierResult) {
    return { mode: "none", reason: "classifier-error" }
  }

  const { sourceIntent, mentionedSourceHint, mode: classifierMode } = classifierResult.output

  // No source-related intent → none
  if (sourceIntent === "none" || classifierMode === "none") {
    return { mode: "none", reason: "not-an-exact-source-request" }
  }

  // Summary intent without exact detail → none (let normal response handle it)
  if (sourceIntent === "summary") {
    return { mode: "none", reason: "summary-request-not-exact" }
  }

  // ── Source matching (preserved logic) ──

  // Try direct matches in current message
  const directMatches = findExplicitMatches(normalizedLastUserMessage, availableExactSources)

  // If hint provided by classifier but no direct match, try hint-based matching
  let hintMatches: ExactSourceSummary[] = []
  if (directMatches.length === 0 && mentionedSourceHint) {
    const normalizedHint = normalizeText(mentionedSourceHint)
    if (normalizedHint) {
      hintMatches = findExplicitMatches(normalizedHint, availableExactSources)
    }
  }

  // For continuation intent, also check recent context
  const contextMatches =
    directMatches.length === 0 && hintMatches.length === 0 && sourceIntent === "continuation"
      ? resolveFromRecentContext(recentMessages, availableExactSources)
      : []

  const matches = directMatches.length > 0
    ? directMatches
    : hintMatches.length > 0
      ? hintMatches
      : contextMatches

  if (matches.length === 1) {
    return {
      mode: "force-inspect",
      reason: directMatches.length > 0
        ? "unique-source-match"
        : hintMatches.length > 0
          ? "hint-source-match"
          : "resolved-from-recent-context",
      matchedSource: matches[0],
    }
  }

  if (matches.length > 1) {
    return { mode: "clarify", reason: "ambiguous-source-match" }
  }

  // Intent detected but no source matched
  if (sourceIntent === "exact_detail") {
    return { mode: "clarify", reason: "exact-intent-without-unique-source" }
  }

  return { mode: "none", reason: "no-source-matched" }
}
