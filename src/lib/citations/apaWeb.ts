export interface WebSource {
  url: string
  title?: string | null
}

const GOOGLE_PROXY_HOSTS = new Set([
  'vertexaisearch.cloud.google.com',
  'vertexaisearch.cloud.google',
])

const GOOGLE_PROXY_PREFIX = 'vertexaisearch.cloud.google.'

const ID_MULTI_TLDS = [
  'co.id',
  'ac.id',
  'go.id',
  'or.id',
  'sch.id',
  'web.id',
  'mil.id',
  'net.id',
  'biz.id',
  'my.id',
  'desa.id',
]

function tryParseAbsoluteUrl(input: string): URL | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  try {
    return new URL(trimmed)
  } catch {
    try {
      return new URL(`https://${trimmed}`)
    } catch {
      return null
    }
  }
}

function decodeUrlMaybe(value: string): string {
  let current = value
  for (let i = 0; i < 3; i += 1) {
    try {
      const decoded = decodeURIComponent(current)
      if (decoded === current) break
      current = decoded
    } catch {
      break
    }
  }
  return current
}

function isProbablyUrlish(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (t.includes('://')) return true
  if (t.startsWith('www.')) return true
  if (/\s/.test(t)) return false
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(t)
}

function stripTrailingPunctuation(text: string): string {
  return text.trim().replace(/[)\].,;:!؟!?]+$/g, '').trim()
}

function startsWithHttp(text: string): boolean {
  return /^https?:\/\//i.test(text.trim())
}

function isGoogleProxyHost(hostname: string): boolean {
  if (GOOGLE_PROXY_HOSTS.has(hostname)) return true
  return hostname.startsWith(GOOGLE_PROXY_PREFIX)
}

function unwrapGoogleProxyUrl(input: URL): URL | null {
  if (!isGoogleProxyHost(input.hostname)) return null

  const candidates = [
    'url',
    'u',
    'q',
    'target',
    'dest',
    'destination',
    'link',
    'redirect',
  ]

  for (const key of candidates) {
    const raw = input.searchParams.get(key)
    if (!raw) continue
    const decoded = decodeUrlMaybe(raw)
    const cleaned = stripTrailingPunctuation(decoded)

    const parsed = tryParseAbsoluteUrl(cleaned)
    if (parsed && startsWithHttp(parsed.toString())) return parsed
  }

  return null
}

export function normalizeWebSearchUrl(rawUrl: string): string {
  const parsed = tryParseAbsoluteUrl(rawUrl)
  if (!parsed) return rawUrl

  const unwrapped = unwrapGoogleProxyUrl(parsed)
  return (unwrapped ?? parsed).toString()
}

function hostnameFromUrl(rawUrl: string): string | null {
  const parsed = tryParseAbsoluteUrl(rawUrl)
  return parsed?.hostname ?? null
}

function stripCommonSubdomains(hostname: string): string {
  return hostname.replace(/^(www|m|mobile|news|blog|support|help|docs)\./i, '')
}

function stripKnownSuffixes(hostname: string): string {
  for (const suffix of ID_MULTI_TLDS) {
    if (hostname.toLowerCase().endsWith(`.${suffix}`)) {
      return hostname.slice(0, -1 * (`.${suffix}`).length)
    }
  }
  return hostname.replace(
    /(\.(com|org|net|edu|gov|mil|co|io|ai|info|biz|me|tv|us|uk|ca|au|fr|de|jp|my|sg|id))$/i,
    ''
  )
}

function titleCaseWords(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function extractUrlWordHints(rawUrl: string): Set<string> {
  const hints = new Set<string>()
  const parsed = tryParseAbsoluteUrl(rawUrl)
  if (!parsed) return hints

  const add = (value: string) => {
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .map((t) => t.trim())
      .filter(Boolean)
      .forEach((t) => hints.add(t))
  }

  add(parsed.hostname)
  add(parsed.pathname)
  return hints
}

const ID_PROPER_NOUN_HINTS = new Set([
  'indonesia',
  'jakarta',
  'jawa',
  'sumatra',
  'sumatera',
  'kalimantan',
  'sulawesi',
  'papua',
  'bali',
  'aceh',
  'bandung',
  'surabaya',
  'yogyakarta',
  'semarang',
  'medan',
  'makassar',
  'bogor',
  'depok',
  'tangerang',
  'bekasi',
])

function toSentenceCaseApa(title: string, rawUrlForHints: string): string {
  const trimmed = title.trim()
  if (!trimmed) return trimmed

  const urlHints = extractUrlWordHints(rawUrlForHints)

  const words = trimmed.split(/\s+/).filter(Boolean)
  const titleCaseLikeCount = words.filter((w) => /^[A-Z][a-z]+$/.test(w.replace(/[)\].,;:!؟!?]+$/g, ''))).length
  const isLikelyTitleCase = words.length >= 4 && titleCaseLikeCount / words.length >= 0.6

  const normalizeBare = (raw: string) =>
    raw
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '')

  const isAcronym = (raw: string) => {
    const stripped = raw.replace(/^[([{"'`]+|[)\]}",'`:;!?]+$/g, '')
    return (
      stripped.length > 1 &&
      stripped.length <= 6 &&
      stripped === stripped.toUpperCase() &&
      /[A-Z]/.test(stripped)
    )
  }

  const transformed = words.map((raw, idx) => {
    if (idx === 0) return raw
    if (!isLikelyTitleCase) return raw
    if (isAcronym(raw)) return raw

    const bareKey = normalizeBare(raw)
    if (bareKey && (urlHints.has(bareKey) || ID_PROPER_NOUN_HINTS.has(bareKey))) return raw

    return raw.toLowerCase()
  })

  let out = transformed.join(' ')
  out = out.replace(
    /(^|[:.!?]\s+)([a-zà-öø-ÿ])/g,
    (_match, prefix, ch: string) => `${prefix}${ch.toUpperCase()}`
  )
  out = out.replace(/^\s*([a-zà-öø-ÿ])/g, (_m, ch: string) => ch.toUpperCase())
  return out
}

export function deriveSiteNameFromUrl(rawUrl: string): string {
  const hostname = hostnameFromUrl(rawUrl)
  if (!hostname) return 'Situs web'

  let cleaned = stripCommonSubdomains(hostname)
  if (isGoogleProxyHost(cleaned)) return 'Situs web'

  cleaned = stripKnownSuffixes(cleaned)
  cleaned = cleaned.replace(/[-_]/g, ' ')
  const out = titleCaseWords(cleaned)
  return out || 'Situs web'
}

function ensureEndsWithPeriod(text: string): string {
  const t = text.trim()
  if (!t) return t
  if (/[.?!؟!]$/.test(t)) return t
  return `${t}.`
}

export interface ApaWebReferenceParts {
  author: string
  title: string
  siteName?: string
  url: string
}

function stripTrailingPeriod(text: string): string {
  return text.trim().replace(/\.$/, '').trim()
}

function equalsIgnoreCase(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0
}

function deriveTitleFromUrl(rawUrl: string): string | null {
  const parsed = tryParseAbsoluteUrl(rawUrl)
  if (!parsed) return null

  const segments = parsed.pathname
    .split('/')
    .map((s) => decodeUrlMaybe(s))
    .map((s) => s.trim())
    .filter(Boolean)

  if (segments.length === 0) return null

  const ignored = new Set(['amp', 'index', 'home', 'beranda'])
  for (let idx = segments.length - 1; idx >= 0; idx -= 1) {
    let segment = segments[idx]
    segment = segment.replace(/\.(html?|php|aspx?)$/i, '')
    segment = segment.replace(/[#?].*$/, '')
    segment = segment.trim()
    if (!segment) continue
    if (ignored.has(segment.toLowerCase())) continue
    if (/^\d+$/.test(segment)) continue
    if (/^\d{4}-\d{2}-\d{2}$/.test(segment)) continue

    const words = segment
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!words) continue

    return words || null
  }

  return null
}

export function getApaWebReferenceParts(source: WebSource): ApaWebReferenceParts {
  const normalizedFromUrl = normalizeWebSearchUrl(source.url)

  const titleText = (source.title ?? '').trim()
  const urlFromTitle =
    isProbablyUrlish(titleText) && !startsWithHttp(titleText)
      ? `https://${stripTrailingPunctuation(titleText)}`
      : titleText

  const maybeResolvedUrl =
    isGoogleProxyHost(hostnameFromUrl(normalizedFromUrl) ?? '') && isProbablyUrlish(titleText)
      ? urlFromTitle
      : normalizedFromUrl

  const resolvedUrl = normalizeWebSearchUrl(maybeResolvedUrl)
  const author = deriveSiteNameFromUrl(resolvedUrl)

  const hasMeaningfulTitle = titleText && !isProbablyUrlish(titleText)
  const looksLikeSiteName = hasMeaningfulTitle
    ? equalsIgnoreCase(stripTrailingPeriod(titleText), author)
    : false

  const derivedFromUrl = deriveTitleFromUrl(resolvedUrl)

  const preferredTitleRaw = (() => {
    if (hasMeaningfulTitle && !looksLikeSiteName) return titleText
    if (derivedFromUrl && !equalsIgnoreCase(stripTrailingPeriod(derivedFromUrl), author)) return derivedFromUrl
    if (hasMeaningfulTitle) return titleText
    return author
  })()

  const title = ensureEndsWithPeriod(toSentenceCaseApa(preferredTitleRaw, resolvedUrl))

  const siteNameRaw = deriveSiteNameFromUrl(resolvedUrl)
  const siteName = siteNameRaw.toLowerCase() === author.toLowerCase() ? undefined : siteNameRaw

  return {
    author,
    title,
    siteName,
    url: resolvedUrl,
  }
}
