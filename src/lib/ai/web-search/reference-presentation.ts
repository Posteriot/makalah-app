import type { NormalizedCitation } from "@/lib/citations/types"
import type { FetchedContent, FetchRouteKind } from "./content-fetcher"

export type SearchResponseMode = "synthesis"

export type ReferenceVerificationStatus =
  | "verified_content"
  | "unverified_link"
  | "unavailable"

export interface ReferencePresentationSource {
  id: string
  url: string | null
  title: string
  publishedAt?: number | null
  documentKind: "html" | "pdf" | "unknown"
  routeKind?:
    | "html_standard"
    | "pdf_or_download"
    | "academic_wall_risk"
    | "proxy_or_redirect_like"
  verificationStatus: ReferenceVerificationStatus
  referenceAvailable: boolean
  claimable: boolean
  fetchMethod?: "fetch" | "tavily" | null
  failureReason?: string
  citedText?: string
}

type CitationInput = Pick<NormalizedCitation, "url" | "title" | "publishedAt" | "citedText">

const TRACKING_QUERY_PARAMS = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "msclkid",
  "dclid",
])

function isTrackingQueryParam(key: string): boolean {
  return /^utm_/i.test(key) || TRACKING_QUERY_PARAMS.has(key.toLowerCase())
}

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url)
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (isTrackingQueryParam(key)) parsed.searchParams.delete(key)
    }
    parsed.hash = ""
    const normalized = parsed.toString()
    return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized
  } catch {
    return url.endsWith("/") ? url.slice(0, -1) : url
  }
}

function canonicalUrlKey(url: string | null | undefined): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url)
    const params = Array.from(parsed.searchParams.entries())
      .filter(([key]) => !isTrackingQueryParam(key))
      .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
        const keyCompare = leftKey.localeCompare(rightKey)
        if (keyCompare !== 0) return keyCompare
        return leftValue.localeCompare(rightValue)
      })

    const search = params.length
      ? `?${params
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join("&")}`
      : ""

    const path = parsed.pathname.endsWith("/") && parsed.pathname !== "/"
      ? parsed.pathname.slice(0, -1)
      : parsed.pathname

    return `${parsed.host}${path}${search}`
  } catch {
    return normalizeUrl(url)
  }
}

function inferDocumentKindFromUrl(url: string | null): "html" | "pdf" | "unknown" {
  if (!url) return "unknown"
  return /\.pdf(?:$|[?#])/i.test(url) ? "pdf" : "html"
}

function inferRouteKindFromUrl(url: string | null): FetchRouteKind | undefined {
  if (!url) return undefined
  return /\.pdf(?:$|[?#])/i.test(url) ? "pdf_or_download" : "html_standard"
}

function toPublishedAtMs(value: string | number | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string" && value.length > 0) {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function isWeakFallbackTitle(title: string | null | undefined, fallbackUrls: Array<string | null | undefined>): boolean {
  if (!title) return true

  const normalizedTitle = title.trim()
  if (!normalizedTitle) return true
  if (/^source-\d+$/i.test(normalizedTitle)) return true
  if (/^https?:\/\//i.test(normalizedTitle) || /^www\./i.test(normalizedTitle)) return true

  const titleKey = canonicalUrlKey(normalizedTitle)
  if (!titleKey) return false

  return fallbackUrls.some((fallbackUrl) => {
    const fallbackKey = canonicalUrlKey(fallbackUrl)
    return Boolean(fallbackKey && fallbackKey === titleKey)
  })
}

function selectFetchedTitle(fetched: FetchedContent): string | null {
  const title = fetched.title?.trim()
  if (title) return title
  const rawTitle = fetched.rawTitle?.trim()
  if (rawTitle) return rawTitle
  return null
}

function isWeakPresentationTitle(title: string | null | undefined): boolean {
  if (!title) return true

  const normalized = title.trim()
  if (!normalized) return true
  if (/^source-\d+$/i.test(normalized)) return true
  if (/^https?:\/\//i.test(normalized) || /^www\./i.test(normalized)) return true

  return false
}

function dedupeCitationInputs(citations: CitationInput[]): CitationInput[] {
  const deduped: CitationInput[] = []
  const indexByKey = new Map<string, number>()

  for (const citation of citations) {
    const normalizedUrl = normalizeUrl(citation.url) ?? citation.url
    const canonicalKey = canonicalUrlKey(normalizedUrl) ?? normalizedUrl
    const existingIndex = indexByKey.get(canonicalKey)

    const nextCitation: CitationInput = {
      ...citation,
      url: normalizedUrl,
    }

    if (typeof existingIndex !== "number") {
      indexByKey.set(canonicalKey, deduped.length)
      deduped.push(nextCitation)
      continue
    }

    const existing = deduped[existingIndex]
    deduped[existingIndex] = {
      ...existing,
      title:
        !isWeakPresentationTitle(existing.title) || isWeakPresentationTitle(nextCitation.title)
          ? existing.title
          : nextCitation.title,
      publishedAt: existing.publishedAt ?? nextCitation.publishedAt,
      citedText: existing.citedText ?? nextCitation.citedText,
    }
  }

  return deduped
}

function createBaseSource(params: {
  id: string
  url: string | null
  title: string
  publishedAt?: number | null
  citedText?: string
  documentKind?: "html" | "pdf" | "unknown"
  routeKind?: ReferencePresentationSource["routeKind"]
  fetchMethod?: "fetch" | "tavily" | null
  failureReason?: string
}): ReferencePresentationSource {
  return {
    id: params.id,
    url: params.url,
    title: params.title,
    publishedAt: params.publishedAt ?? null,
    documentKind: params.documentKind ?? inferDocumentKindFromUrl(params.url),
    routeKind: params.routeKind,
    verificationStatus: params.url ? "unverified_link" : "unavailable",
    referenceAvailable: Boolean(params.url),
    claimable: false,
    fetchMethod: params.fetchMethod ?? null,
    failureReason: params.failureReason,
    citedText: params.citedText,
  }
}

export function inferSearchResponseMode(_params: {
  lastUserMessage: string
}): SearchResponseMode {
  return "synthesis"
}

export function buildReferencePresentationSources(params: {
  citations: CitationInput[]
  fetchedContent: FetchedContent[]
}): ReferencePresentationSource[] {
  const sources: ReferencePresentationSource[] = []
  const sourceIndexByUrl = new Map<string, number>()
  const dedupedCitations = dedupeCitationInputs(params.citations)

  const registerSource = (source: ReferencePresentationSource) => {
    const normalizedUrl = canonicalUrlKey(source.url)
    if (normalizedUrl) sourceIndexByUrl.set(normalizedUrl, sources.length)
    sources.push(source)
  }

  const upgradeSource = (
    index: number,
    fetched: FetchedContent,
    sourceUrl: string | null,
  ) => {
    const existing = sources[index]
    const fetchedTitle = selectFetchedTitle(fetched)
    const displayUrl = normalizeUrl(sourceUrl) ?? normalizeUrl(existing.url) ?? existing.url
    const fallbackUrls = [existing.url, sourceUrl, fetched.resolvedUrl, fetched.url]
    const shouldUpgradeTitle = isWeakFallbackTitle(existing.title, fallbackUrls)
    const nextTitle = shouldUpgradeTitle && fetchedTitle ? fetchedTitle : existing.title || fetchedTitle
    sources[index] = {
      ...existing,
      id: existing.id || sourceUrl || fetched.resolvedUrl,
      url: displayUrl ?? sourceUrl ?? existing.url,
      title: nextTitle || existing.url || fetched.resolvedUrl,
      publishedAt: existing.publishedAt ?? toPublishedAtMs(fetched.publishedAt),
      documentKind: fetched.documentKind ?? existing.documentKind,
      routeKind: fetched.routeKind ?? existing.routeKind,
      verificationStatus: fetched.pageContent ? "verified_content" : (sourceUrl ? "unverified_link" : "unavailable"),
      referenceAvailable: Boolean(sourceUrl),
      claimable: Boolean(fetched.pageContent),
      fetchMethod: fetched.fetchMethod ?? existing.fetchMethod ?? null,
      failureReason: fetched.failureReason ?? existing.failureReason,
      citedText: existing.citedText,
    }
  }

  for (let i = 0; i < dedupedCitations.length; i += 1) {
    const citation = dedupedCitations[i]
    const url = citation.url ?? null
    registerSource(
      createBaseSource({
        id: url ?? `citation-${i + 1}`,
        url,
        title: citation.title || url || `source-${i + 1}`,
        publishedAt: citation.publishedAt ?? null,
        citedText: citation.citedText,
        documentKind: inferDocumentKindFromUrl(url),
        routeKind: inferRouteKindFromUrl(url),
      }),
    )
  }

  for (let i = 0; i < params.fetchedContent.length; i += 1) {
    const fetched = params.fetchedContent[i]
    const sourceUrl = fetched.resolvedUrl || fetched.url || null
    const normalizedSourceUrl = canonicalUrlKey(sourceUrl)
    const matchedIndex =
      (normalizedSourceUrl ? sourceIndexByUrl.get(normalizedSourceUrl) : undefined) ??
      (canonicalUrlKey(fetched.url) ? sourceIndexByUrl.get(canonicalUrlKey(fetched.url)!) : undefined)

    if (typeof matchedIndex === "number") {
      upgradeSource(matchedIndex, fetched, sourceUrl)
      continue
    }

    const displayUrl = normalizeUrl(sourceUrl) ?? normalizeUrl(fetched.url) ?? sourceUrl ?? fetched.url ?? null
    registerSource(
      {
        id: displayUrl || `fetched-${i + 1}`,
        url: displayUrl,
        title: selectFetchedTitle(fetched) || displayUrl || `source-${i + 1}`,
        publishedAt: toPublishedAtMs(fetched.publishedAt),
        documentKind: fetched.documentKind ?? inferDocumentKindFromUrl(displayUrl),
        routeKind: fetched.routeKind,
        verificationStatus: fetched.pageContent
          ? "verified_content"
          : displayUrl
            ? "unverified_link"
            : "unavailable",
        referenceAvailable: Boolean(displayUrl),
        claimable: Boolean(fetched.pageContent),
        fetchMethod: fetched.fetchMethod ?? null,
        failureReason: fetched.failureReason,
      },
    )
  }

  return sources
}
