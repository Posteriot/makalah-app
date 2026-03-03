export type LegacyExtractedSource = {
  url: string
  title: string
}

const BARE_URL_REGEX = /\bhttps?:\/\/[^\s<>()\[\]{}"']+/gi
const DOMAIN_REGEX = /\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+){1,}(?:\/[^\s<>()\[\]{}"']*)?\b/gi

const normalizeCandidateUrl = (raw: string): string | null => {
  const trimmed = raw.trim().replace(/[.,;:!?]+$/g, "")
  if (!trimmed) return null
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const parsed = new URL(candidate)
    if (!["http:", "https:"].includes(parsed.protocol)) return null
    if (!parsed.hostname.includes(".")) return null
    parsed.hash = ""
    return parsed.toString()
  } catch {
    return null
  }
}

const canonicalSourceKey = (url: string) => {
  try {
    const parsed = new URL(url)
    parsed.searchParams.forEach((_value, key) => {
      if (/^utm_/i.test(key)) parsed.searchParams.delete(key)
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
    return parsed.hostname.replace(/^www\./i, "")
  } catch {
    return url
  }
}

export function extractLegacySourcesFromText(text: string): LegacyExtractedSource[] {
  if (!text || !text.trim()) return []

  const matches = [
    ...Array.from(text.matchAll(BARE_URL_REGEX), (match) => match[0]),
    ...Array.from(text.matchAll(DOMAIN_REGEX), (match) => match[0]),
  ]

  const deduped = new Map<string, LegacyExtractedSource>()
  for (const match of matches) {
    const normalized = normalizeCandidateUrl(match)
    if (!normalized) continue
    const key = canonicalSourceKey(normalized)
    if (deduped.has(key)) continue
    deduped.set(key, {
      url: normalized,
      title: displayTitleFromUrl(normalized),
    })
  }

  return Array.from(deduped.values())
}

