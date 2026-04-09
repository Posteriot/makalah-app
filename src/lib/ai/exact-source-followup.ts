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

function urlSpecificity(source: ExactSourceSummary, message: string): number {
  let best = 0
  for (const url of [source.sourceId, source.originalUrl, source.resolvedUrl]) {
    const normalized = normalizeText(url)
    if (normalized && message.includes(normalized) && normalized.length > best) {
      best = normalized.length
    }
  }
  return best
}

function isArticleLevelMetadata(source: ExactSourceSummary): boolean {
  // For canonical article authority, require author or publishedAt.
  // siteName alone (e.g., portal root) is NOT sufficient — it doesn't
  // represent article-level authorship or publication metadata.
  return !!(source.author || source.publishedAt)
}

function isUrlPrefixOf(prefixSource: ExactSourceSummary, ofSource: ExactSourceSummary): boolean {
  // Check if any URL of prefixSource is a strict prefix of any URL of ofSource.
  // This enforces structural article relationship (e.g., /view/32777 is prefix
  // of /view/32777/16455) and excludes unrelated sources on the same domain.
  const prefixUrls = [prefixSource.sourceId, prefixSource.originalUrl, prefixSource.resolvedUrl]
    .map(normalizeText).filter(Boolean)
  const ofUrls = [ofSource.sourceId, ofSource.originalUrl, ofSource.resolvedUrl]
    .map(normalizeText).filter(Boolean)

  return prefixUrls.some((prefix) =>
    ofUrls.some((url) => url.startsWith(prefix) && url.length > prefix.length)
  )
}

function findExplicitMatches(
  message: string,
  availableExactSources: ExactSourceSummary[]
): ExactSourceSummary[] {
  const matches = availableExactSources.filter((source) => matchesSourceReference(message, source))

  if (matches.length <= 1) return matches

  // URL specificity tiebreaker: when multiple sources match (e.g., portal root
  // vs article URL on the same domain), prefer the source whose URL has the
  // longest overlap with the user's message. This is deterministic — purely
  // based on string length, not heuristic.
  const scored = matches.map((source) => ({
    source,
    specificity: urlSpecificity(source, message),
  }))

  const maxSpecificity = Math.max(...scored.map((s) => s.specificity))
  if (maxSpecificity === 0) return matches

  const best = scored.filter((s) => s.specificity === maxSpecificity).map((s) => s.source)
  const winner = best.length === 1 ? best[0] : null

  // Canonical article metadata resolution: if the best URL-specific match has
  // no article-level metadata, check whether a STRUCTURAL PREFIX source has
  // article-level metadata. Requirements:
  //   1. Candidate URL must be a strict prefix of winner URL (same article)
  //   2. Candidate must have article-level metadata (author or publishedAt)
  //   3. siteName alone is not sufficient (excludes portal roots)
  if (winner && !isArticleLevelMetadata(winner)) {
    const canonicalCandidates = scored
      .filter((s) =>
        s.source !== winner &&
        isArticleLevelMetadata(s.source) &&
        isUrlPrefixOf(s.source, winner)
      )
      .sort((a, b) => b.specificity - a.specificity)
    if (canonicalCandidates.length > 0) {
      console.log(`[EXACT-SOURCE] Canonical metadata resolution: ${winner.sourceId.slice(0, 60)} → ${canonicalCandidates[0].source.sourceId.slice(0, 60)} (article-level prefix authority)`)
      return [canonicalCandidates[0].source]
    }
  }

  return best.length > 0 ? best : matches
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
 * Resolve exact source follow-up using semantic classifier.
 *
 * Classifier determines intent (exact_detail, summary, continuation, none).
 * Source matching logic finds which source the user refers to (preserved unchanged).
 *
 * Replaces: EXACT_SOURCE_PATTERNS (12), NON_EXACT_SUMMARY_PATTERNS (6),
 * CONTINUATION_PATTERNS (7), CONTINUATION_CUES (8), isExactIntent(),
 * isNonExactSummaryRequest(), isContinuationPrompt()
 *
 * When model not provided or classifier fails: returns "none" (safe default).
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

  if (sourceIntent === "none" || classifierMode === "none") {
    return { mode: "none", reason: "not-an-exact-source-request" }
  }

  if (sourceIntent === "summary") {
    return { mode: "none", reason: "summary-request-not-exact" }
  }

  // ── Source matching (preserved logic) ──
  const directMatches = findExplicitMatches(normalizedLastUserMessage, availableExactSources)

  let hintMatches: ExactSourceSummary[] = []
  if (directMatches.length === 0 && mentionedSourceHint) {
    const normalizedHint = normalizeText(mentionedSourceHint)
    if (normalizedHint) {
      hintMatches = findExplicitMatches(normalizedHint, availableExactSources)
    }
  }

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

  if (sourceIntent === "exact_detail") {
    return { mode: "clarify", reason: "exact-intent-without-unique-source" }
  }

  return { mode: "none", reason: "no-source-matched" }
}
