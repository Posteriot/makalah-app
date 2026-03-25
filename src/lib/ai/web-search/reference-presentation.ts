import type { NormalizedCitation } from "@/lib/citations/types"
import type { FetchedContent, FetchRouteKind } from "./content-fetcher"

export type SearchResponseMode = "synthesis" | "reference_inventory" | "mixed"

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

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url)
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (/^utm_/i.test(key)) parsed.searchParams.delete(key)
    }
    parsed.hash = ""
    const normalized = parsed.toString()
    return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized
  } catch {
    return url.endsWith("/") ? url.slice(0, -1) : url
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

export function inferSearchResponseMode(params: {
  lastUserMessage: string
}): SearchResponseMode {
  const text = params.lastUserMessage.toLowerCase()
  const wantsReferences =
    text.includes("pdf") ||
    text.includes("link") ||
    text.includes("tautan") ||
    text.includes("daftar sumber") ||
    text.includes("referensi")
  const wantsSynthesis =
    text.includes("analisis") ||
    text.includes("jelaskan") ||
    text.includes("bandingkan") ||
    text.includes("ringkas")

  if (wantsReferences && wantsSynthesis) return "mixed"
  if (wantsReferences) return "reference_inventory"
  return "synthesis"
}

export function buildReferencePresentationSources(params: {
  citations: CitationInput[]
  fetchedContent: FetchedContent[]
}): ReferencePresentationSource[] {
  const sources: ReferencePresentationSource[] = []
  const sourceIndexByUrl = new Map<string, number>()

  const registerSource = (source: ReferencePresentationSource) => {
    const normalizedUrl = normalizeUrl(source.url)
    if (normalizedUrl) sourceIndexByUrl.set(normalizedUrl, sources.length)
    sources.push(source)
  }

  const upgradeSource = (
    index: number,
    fetched: FetchedContent,
    sourceUrl: string | null,
  ) => {
    const existing = sources[index]
    sources[index] = {
      ...existing,
      id: existing.id || sourceUrl || fetched.resolvedUrl,
      url: sourceUrl ?? existing.url,
      title: existing.title || fetched.title || fetched.rawTitle || existing.url || fetched.resolvedUrl,
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

  for (let i = 0; i < params.citations.length; i += 1) {
    const citation = params.citations[i]
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
    const normalizedSourceUrl = normalizeUrl(sourceUrl)
    const matchedIndex =
      (normalizedSourceUrl ? sourceIndexByUrl.get(normalizedSourceUrl) : undefined) ??
      (normalizeUrl(fetched.url) ? sourceIndexByUrl.get(normalizeUrl(fetched.url)!) : undefined)

    if (typeof matchedIndex === "number") {
      upgradeSource(matchedIndex, fetched, sourceUrl)
      continue
    }

    registerSource(
      {
        id: sourceUrl || fetched.url || `fetched-${i + 1}`,
        url: sourceUrl || fetched.url || null,
        title: fetched.title || fetched.rawTitle || sourceUrl || fetched.url || `source-${i + 1}`,
        publishedAt: toPublishedAtMs(fetched.publishedAt),
        documentKind: fetched.documentKind ?? inferDocumentKindFromUrl(sourceUrl || fetched.url || null),
        routeKind: fetched.routeKind,
        verificationStatus: fetched.pageContent
          ? "verified_content"
          : sourceUrl || fetched.url
            ? "unverified_link"
            : "unavailable",
        referenceAvailable: Boolean(sourceUrl || fetched.url),
        claimable: Boolean(fetched.pageContent),
        fetchMethod: fetched.fetchMethod ?? null,
        failureReason: fetched.failureReason,
      },
    )
  }

  return sources
}
