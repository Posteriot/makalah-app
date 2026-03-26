import { normalizeHttpishUrlCandidate } from "./url-validation"

export type LegacyExtractedSource = {
  url: string
  title: string
}

const WHITESPACE_CHARS = new Set([" ", "\n", "\r", "\t"])
const LEADING_WRAPPER_CHARS = new Set(["(", "[", "{", "<", "\"", "'", "`"])
const TRAILING_WRAPPER_CHARS = new Set([")", "]", "}", ">", "\"", "'", "`", ".", ",", ";", ":", "!", "?", "؟"])

function tokenizeByWhitespace(text: string): string[] {
  const tokens: string[] = []
  let start = -1

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (WHITESPACE_CHARS.has(char)) {
      if (start >= 0) {
        tokens.push(text.slice(start, index))
        start = -1
      }
      continue
    }

    if (start < 0) start = index
  }

  if (start >= 0) {
    tokens.push(text.slice(start))
  }

  return tokens
}

function trimCandidateWrappers(raw: string): string {
  let start = 0
  let end = raw.length

  while (start < end && LEADING_WRAPPER_CHARS.has(raw[start])) {
    start += 1
  }

  while (end > start && TRAILING_WRAPPER_CHARS.has(raw[end - 1])) {
    end -= 1
  }

  return raw.slice(start, end).trim()
}

function hasHttpScheme(value: string): boolean {
  const lower = value.toLowerCase()
  return lower.startsWith("http://") || lower.startsWith("https://")
}

function isAsciiAlpha(value: string): boolean {
  if (!value) return false
  for (const char of value) {
    const lower = char.toLowerCase()
    if (lower < "a" || lower > "z") return false
  }
  return true
}

function shouldRejectAmbiguousBareDomainCandidate(rawCandidate: string, normalizedUrl: string): boolean {
  const trimmed = rawCandidate.trim().toLowerCase()
  if (!trimmed || hasHttpScheme(trimmed) || trimmed.startsWith("www.")) return false
  if (trimmed.includes("/") || trimmed.includes("?") || trimmed.includes("#")) return false

  try {
    const parsed = new URL(normalizedUrl)
    const labels = parsed.hostname.toLowerCase().split(".")
    if (labels.length !== 2) return false

    const [firstLabel, tld] = labels
    if (!isAsciiAlpha(firstLabel) || !isAsciiAlpha(tld)) return false
    if (firstLabel.length > 2 || tld.length > 3) return false

    return true
  } catch {
    return false
  }
}

const canonicalSourceKey = (url: string) => {
  try {
    const parsed = new URL(url)
    parsed.searchParams.forEach((_value, key) => {
      if (key.toLowerCase().startsWith("utm_")) parsed.searchParams.delete(key)
    })
    const out = parsed.toString()
    return out.endsWith("/") ? out.slice(0, -1) : out
  } catch {
    return url
  }
}

const displayTitleFromUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname
    return hostname.toLowerCase().startsWith("www.") ? hostname.slice(4) : hostname
  } catch {
    return url
  }
}

export function extractLegacySourcesFromText(text: string): LegacyExtractedSource[] {
  if (!text || !text.trim()) return []

  const deduped = new Map<string, LegacyExtractedSource>()
  const candidates = tokenizeByWhitespace(text)

  for (const candidate of candidates) {
    const trimmedCandidate = trimCandidateWrappers(candidate)
    if (!trimmedCandidate) continue

    const normalized = normalizeHttpishUrlCandidate(trimmedCandidate)
    if (!normalized) continue
    if (shouldRejectAmbiguousBareDomainCandidate(trimmedCandidate, normalized)) continue

    const key = canonicalSourceKey(normalized)
    if (deduped.has(key)) continue
    deduped.set(key, {
      url: normalized,
      title: displayTitleFromUrl(normalized),
    })
  }

  return Array.from(deduped.values())
}
