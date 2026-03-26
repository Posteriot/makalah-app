const TRAILING_PUNCTUATION_REGEX = /[)\].,;:!?؟]+$/g
const BARE_DOMAIN_REGEX = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s<>()\[\]{}"']*)?$/i

function stripTrailingPunctuation(value: string): string {
  return value.trim().replace(TRAILING_PUNCTUATION_REGEX, "").trim()
}

function normalizeHost(hostname: string): string {
  return hostname.trim().replace(/\.$/, "").toLowerCase()
}

function isValidTopLevelDomainLabel(label: string): boolean {
  if (/^[a-z]{2,}$/i.test(label)) return true
  return /^xn--[a-z0-9-]{2,}$/i.test(label)
}

export function isValidCitationHostname(hostname: string): boolean {
  const normalized = normalizeHost(hostname)
  if (!normalized || normalized.includes(" ")) return false

  const labels = normalized.split(".")
  if (labels.length < 2) return false

  for (const label of labels) {
    if (!label || label.length > 63) return false
    if (!/^[a-z0-9-]+$/i.test(label)) return false
    if (label.startsWith("-") || label.endsWith("-")) return false
  }

  const tld = labels[labels.length - 1]
  return isValidTopLevelDomainLabel(tld)
}

export function normalizeHttpishUrlCandidate(raw: string): string | null {
  const trimmed = stripTrailingPunctuation(raw)
  if (!trimmed) return null

  const hasProtocol = /^https?:\/\//i.test(trimmed)
  if (!hasProtocol && !BARE_DOMAIN_REGEX.test(trimmed)) return null

  const candidate = hasProtocol ? trimmed : `https://${trimmed}`

  try {
    const parsed = new URL(candidate)
    if (!["http:", "https:"].includes(parsed.protocol)) return null
    if (!isValidCitationHostname(parsed.hostname)) return null
    parsed.hash = ""
    return parsed.toString()
  } catch {
    return null
  }
}

export function isValidCitationUrl(value: unknown): value is string {
  if (typeof value !== "string") return false
  return normalizeHttpishUrlCandidate(value) !== null
}
