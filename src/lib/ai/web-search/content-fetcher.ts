import { Readability } from "@mozilla/readability"
import { parseHTML } from "linkedom"
import TurndownService from "turndown"

export interface FetchedParagraph {
  index: number
  text: string
}

export type FetchRouteKind =
  | "html_standard"
  | "pdf_or_download"
  | "academic_wall_risk"
  | "proxy_or_redirect_like"

export type FetchFailureReason =
  | "timeout"
  | "fetch_error"
  | "http_non_ok"
  | "pdf_unsupported"
  | "readability_empty"
  | "content_too_short"
  | "proxy_unresolved"

type TavilyFailureReason = "tavily_no_content"

export interface FetchedContent {
  url: string                      // input URL (may be proxy)
  resolvedUrl: string              // final URL after redirect:follow
  routeKind?: FetchRouteKind
  rawTitle: string | null
  title: string | null
  author: string | null
  publishedAt: string | null
  siteName: string | null
  documentKind: "html" | "pdf" | "unknown"
  failureReason?: FetchFailureReason
  statusCode?: number
  contentType?: string | null
  exactMetadataAvailable: boolean
  paragraphs: FetchedParagraph[] | null
  documentText: string | null
  pageContent: string | null       // truncated for compose context
  fullContent: string | null       // full content for RAG ingest (no truncation)
  fetchMethod: "fetch" | "tavily" | null
}

interface FetchOptions {
  tavilyApiKey?: string
  timeoutMs?: number
  requestId?: string
}

const MAX_CONTENT_CHARS = 12000 // ~3000 tokens for compose context
const MAX_RAG_CONTENT_CHARS = 80000 // ~20K tokens — cap for RAG ingest (prevents 500K+ PDF dumps)
const MIN_CONTENT_CHARS = 50 // Skip trivially short extractions (nav-only, login forms)
const DEFAULT_TIMEOUT_MS = 5000
const HTML_STANDARD_TIMEOUT_MS = DEFAULT_TIMEOUT_MS
const ACADEMIC_WALL_TIMEOUT_MS = 2000
const PROXY_OR_REDIRECT_TIMEOUT_MS = 800

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
}

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
})

export function classifyFetchRoute(url: string): FetchRouteKind {
  const parsed = safeParseUrl(url)
  const hostname = parsed?.hostname.toLowerCase() ?? ""
  const pathname = parsed?.pathname.toLowerCase() ?? url.toLowerCase()

  if (isProxyLikeHost(hostname)) return "proxy_or_redirect_like"
  if (isPdfOrDownloadPath(pathname)) return "pdf_or_download"
  if (isAcademicWallHost(hostname, pathname)) return "academic_wall_risk"

  return "html_standard"
}

/**
 * Fetch actual page content from URLs. Two-tier: fetch+readability primary,
 * Tavily fallback for failures. Returns markdown content per URL.
 *
 * No scoring, filtering, or quality judgment — just fetch, parse, return.
 */
export async function fetchPageContent(
  urls: string[],
  options?: FetchOptions,
): Promise<FetchedContent[]> {
  if (urls.length === 0) return []

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const reqTag = options?.requestId ? `[${options.requestId}] ` : ""
  const hasTavily = Boolean(options?.tavilyApiKey)

  const results: FetchedContent[] = Array.from({ length: urls.length }, (_, index) => ({
    url: urls[index],
    resolvedUrl: urls[index],
    routeKind: classifyFetchRoute(urls[index]),
    rawTitle: null,
    title: null,
    author: null,
    publishedAt: null,
    siteName: null,
    documentKind: inferDocumentKindFromRouteKind(classifyFetchRoute(urls[index])),
    exactMetadataAvailable: false,
    paragraphs: null,
    documentText: null,
    pageContent: null,
    fullContent: null,
    fetchMethod: null,
  }))

  const primaryCandidates: Array<{ url: string; index: number; routeKind: FetchRouteKind }> = []
  const pdfCandidates: Array<{ url: string; index: number; routeKind: FetchRouteKind }> = []

  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index]
    const routeKind = classifyFetchRoute(url)

    if (routeKind === "pdf_or_download") {
      if (!hasTavily) {
        const startedAt = Date.now()
        logRouteOutcome(reqTag, "ROUTE", index + 1, urls.length, {
          kind: "failure",
          url,
          routeKind,
          failureReason: "pdf_unsupported",
          elapsedMs: Date.now() - startedAt,
        })
        results[index] = buildPdfUnsupportedResult(url, routeKind)
        continue
      }

      pdfCandidates.push({ url, index, routeKind })
      continue
    }

    primaryCandidates.push({ url, index, routeKind })
  }

  const primaryResultsPromise = Promise.all(
    primaryCandidates.map(async (candidate) => {
      const routeTimeoutMs = getRouteTimeoutMs(candidate.routeKind, timeoutMs)
      const primaryResult = await fetchAndParse(
        candidate.url,
        routeTimeoutMs,
        reqTag,
        candidate.index + 1,
        urls.length,
      )
      return { candidate, primaryResult }
    }),
  )

  const pdfBatchPromise = pdfCandidates.length > 0
    ? (async () => {
        const pdfUrls = pdfCandidates.map((candidate) => candidate.url)
        const pdfStart = Date.now()
        const tavilyResults = await fetchViaTavily(pdfUrls, options!.tavilyApiKey!)
        return {
          tavilyResults,
          elapsedMs: Date.now() - pdfStart,
        }
      })()
    : null

  const [primaryResults, pdfBatch] = await Promise.all([
    primaryResultsPromise,
    pdfBatchPromise ?? Promise.resolve(null),
  ])

  const fallbackCandidates: Array<{ url: string; index: number; routeKind: FetchRouteKind; failure: FetchParseFailureResult }> = []

  for (const { candidate, primaryResult } of primaryResults) {
    if (primaryResult.ok) {
      results[candidate.index] = buildFetchSuccessResult(candidate.url, primaryResult)
      continue
    }

    const shouldTavilyFallback =
      hasTavily
      && (
        candidate.routeKind !== "proxy_or_redirect_like"
        || primaryResult.failureReason === "pdf_unsupported"
      )

    if (shouldTavilyFallback) {
      fallbackCandidates.push({
        url: candidate.url,
        index: candidate.index,
        routeKind: candidate.routeKind,
        failure: primaryResult,
      })
      continue
    }

    results[candidate.index] = buildFetchFailureResult(candidate.url, primaryResult)
  }

  if (pdfBatch) {
    for (let i = 0; i < pdfCandidates.length; i += 1) {
      const candidate = pdfCandidates[i]
      const tavilyResult = pdfBatch.tavilyResults.get(candidate.url)
      if (tavilyResult?.content) {
        logTavilyOutcome(reqTag, i + 1, pdfCandidates.length, {
          kind: "success",
          url: candidate.url,
          routeKind: candidate.routeKind,
          elapsedMs: pdfBatch.elapsedMs,
        })
        results[candidate.index] = buildTavilySuccessResult(candidate.url, candidate.routeKind, tavilyResult.url, tavilyResult.content, "pdf")
        continue
      }

      logTavilyOutcome(reqTag, i + 1, pdfCandidates.length, {
        kind: "failure",
        url: candidate.url,
        routeKind: candidate.routeKind,
        failureReason: "tavily_no_content",
        elapsedMs: pdfBatch.elapsedMs,
      })
      results[candidate.index] = buildPdfUnsupportedResult(candidate.url, candidate.routeKind)
    }
  }

  if (fallbackCandidates.length > 0) {
    const fallbackUrls = fallbackCandidates.map((candidate) => candidate.url)
    const tavilyStart = Date.now()
    const tavilyResults = await fetchViaTavily(fallbackUrls, options!.tavilyApiKey!)
    const elapsedMs = Date.now() - tavilyStart

    for (let i = 0; i < fallbackCandidates.length; i += 1) {
      const candidate = fallbackCandidates[i]
      const tavilyResult = tavilyResults.get(candidate.url)
      if (tavilyResult?.content) {
        logTavilyOutcome(reqTag, i + 1, fallbackCandidates.length, {
          kind: "success",
          url: candidate.url,
          routeKind: candidate.routeKind,
          elapsedMs,
        })
        results[candidate.index] = buildTavilySuccessResult(
          candidate.url,
          candidate.routeKind,
          tavilyResult.url,
          tavilyResult.content,
          candidate.failure.documentKind,
        )
        continue
      }

      logTavilyOutcome(reqTag, i + 1, fallbackCandidates.length, {
        kind: "failure",
        url: candidate.url,
        routeKind: candidate.routeKind,
        failureReason: "tavily_no_content",
        elapsedMs,
      })
      results[candidate.index] = buildFetchFailureResult(candidate.url, candidate.failure)
    }
  }

  const successCount = results.filter((r) => r.pageContent !== null).length
  const fetchCount = results.filter((r) => r.fetchMethod === "fetch").length
  const tavilyCount = results.filter((r) => r.fetchMethod === "tavily").length
  console.log(`[FetchWeb] ${reqTag}Done: ${successCount}/${urls.length} succeeded (fetch=${fetchCount}, tavily=${tavilyCount})`)

  return results
}

function logTavilyOutcome(
  reqTag: string,
  index: number,
  total: number,
  details: {
    kind: "success" | "failure"
    url: string
    routeKind: FetchRouteKind
    elapsedMs: number
    failureReason?: TavilyFailureReason
  },
): void {
  const statusBits = [
    `route=${details.routeKind}`,
    details.kind === "failure" && details.failureReason ? `reason=${details.failureReason}` : null,
  ].filter(Boolean).join(" ")

  const resultMark = details.kind === "success" ? "✓" : "✗"
  console.log(
    `[⏱ LATENCY] ${reqTag}FetchWeb TAVILY [${index}/${total}] ${resultMark} ${details.elapsedMs}ms ${statusBits} ${details.url.slice(0, 70)}`,
  )
}

function logRouteOutcome(
  reqTag: string,
  phase: "PRIMARY" | "TAVILY" | "ROUTE",
  index: number,
  total: number,
  details: {
    kind: "success" | "failure"
    url: string
    routeKind: FetchRouteKind
    elapsedMs: number
    failureReason?: FetchFailureReason
    statusCode?: number
    contentType?: string | null
  },
): void {
  const statusBits = [
    `route=${details.routeKind}`,
    details.kind === "failure" && details.failureReason ? `reason=${details.failureReason}` : null,
    details.statusCode ? `status=${details.statusCode}` : null,
    details.contentType ? `contentType=${details.contentType}` : null,
  ].filter(Boolean).join(" ")

  const resultMark = details.kind === "success" ? "✓" : "✗"
  const elapsedBits = `${details.elapsedMs}ms`

  console.log(
    `[⏱ LATENCY] ${reqTag}FetchWeb ${phase} [${index}/${total}] ${resultMark} ${elapsedBits} ${statusBits} ${details.url.slice(0, 70)}`,
  )
}

function getRouteTimeoutMs(routeKind: FetchRouteKind, baseTimeoutMs: number): number {
  switch (routeKind) {
    case "academic_wall_risk":
      return Math.min(baseTimeoutMs, ACADEMIC_WALL_TIMEOUT_MS)
    case "proxy_or_redirect_like":
      return Math.min(baseTimeoutMs, PROXY_OR_REDIRECT_TIMEOUT_MS)
    case "html_standard":
      return Math.min(baseTimeoutMs, HTML_STANDARD_TIMEOUT_MS)
    case "pdf_or_download":
      return baseTimeoutMs
  }
}

function buildFetchSuccessResult(url: string, result: FetchParseResult): FetchedContent {
  return {
    url,
    resolvedUrl: result.resolvedUrl,
    routeKind: result.routeKind,
    rawTitle: result.rawTitle,
    title: result.title,
    author: result.author,
    publishedAt: result.publishedAt,
    siteName: result.siteName,
    documentKind: result.documentKind,
    failureReason: undefined,
    statusCode: undefined,
    contentType: result.contentType ?? null,
    exactMetadataAvailable: result.exactMetadataAvailable,
    paragraphs: result.paragraphs,
    documentText: result.documentText,
    pageContent: truncate(result.content),
    fullContent: truncateRag(result.content),
    fetchMethod: "fetch",
  }
}

function buildFetchFailureResult(url: string, failure: FetchParseFailureResult): FetchedContent {
  return {
    url,
    resolvedUrl: failure.resolvedUrl,
    routeKind: failure.routeKind,
    rawTitle: null,
    title: null,
    author: null,
    publishedAt: null,
    siteName: null,
    documentKind: failure.documentKind ?? inferDocumentKindFromRouteKind(failure.routeKind),
    failureReason: failure.failureReason,
    statusCode: failure.statusCode,
    contentType: failure.contentType,
    exactMetadataAvailable: false,
    paragraphs: null,
    documentText: null,
    pageContent: null,
    fullContent: null,
    fetchMethod: null,
  }
}

function buildTavilySuccessResult(
  url: string,
  routeKind: FetchRouteKind,
  resolvedUrl: string,
  content: string,
  documentKind: "html" | "pdf" | "unknown" = "unknown",
): FetchedContent {
  return {
    url,
    resolvedUrl,
    routeKind,
    rawTitle: null,
    title: null,
    author: null,
    publishedAt: null,
    siteName: null,
    documentKind,
    failureReason: undefined,
    statusCode: undefined,
    contentType: undefined,
    exactMetadataAvailable: false,
    paragraphs: buildParagraphsFromText(content),
    documentText: normalizeDocumentText(content),
    pageContent: truncate(content),
    fullContent: truncateRag(content),
    fetchMethod: "tavily",
  }
}

function buildPdfUnsupportedResult(url: string, routeKind: FetchRouteKind): FetchedContent {
  return buildFetchFailureResult(url, makeFetchFailure(url, routeKind, "pdf_unsupported", {
    documentKind: "pdf",
  }))
}

interface FetchParseResult {
  ok: true
  content: string
  resolvedUrl: string
  routeKind: FetchRouteKind
  rawTitle: string | null
  title: string | null
  author: string | null
  publishedAt: string | null
  siteName: string | null
  documentKind: "html" | "pdf" | "unknown"
  contentType: string | null
  exactMetadataAvailable: boolean
  paragraphs: FetchedParagraph[] | null
  documentText: string | null
}

interface FetchParseFailureResult {
  ok: false
  resolvedUrl: string
  routeKind: FetchRouteKind
  documentKind: "html" | "pdf" | "unknown"
  failureReason: FetchFailureReason
  statusCode?: number
  contentType?: string | null
}

function makeFetchFailure(
  url: string,
  routeKind: FetchRouteKind,
  failureReason: FetchFailureReason,
  overrides: {
    resolvedUrl?: string
    documentKind?: "html" | "pdf" | "unknown"
    statusCode?: number
    contentType?: string | null
  } = {},
): FetchParseFailureResult {
  return {
    ok: false,
    resolvedUrl: overrides.resolvedUrl ?? url,
    routeKind,
    documentKind: overrides.documentKind ?? inferDocumentKindFromRouteKind(routeKind),
    failureReason,
    statusCode: overrides.statusCode,
    contentType: overrides.contentType ?? null,
  }
}

async function fetchAndParse(
  url: string,
  timeoutMs: number,
  reqTag: string,
  index: number,
  total: number,
): Promise<FetchParseResult | FetchParseFailureResult> {
  const routeKind = classifyFetchRoute(url)
  const controller = new AbortController()
  const startedAt = Date.now()
  let didLogOutcome = false

  const logPrimaryOutcome = (details: {
    kind: "success" | "failure"
    failureReason?: FetchFailureReason
    statusCode?: number
    contentType?: string | null
  }) => {
    if (didLogOutcome) return
    didLogOutcome = true
    logRouteOutcome(reqTag, "PRIMARY", index, total, {
      kind: details.kind,
      url,
      routeKind,
      failureReason: details.failureReason,
      statusCode: details.statusCode,
      contentType: details.contentType,
      elapsedMs: Date.now() - startedAt,
    })
  }

  let timerId: ReturnType<typeof setTimeout>
  const timeoutPromise = new Promise<FetchParseResult | FetchParseFailureResult>((resolve) => {
    timerId = setTimeout(() => {
      controller.abort()
      const failure = makeFetchFailure(url, routeKind, "timeout")
      logPrimaryOutcome({
        kind: "failure",
        failureReason: failure.failureReason,
      })
      resolve(failure)
    }, timeoutMs)
  })

  const fetchPromise = (async (): Promise<FetchParseResult | FetchParseFailureResult> => {
    try {
      const response = await fetch(url, {
        headers: FETCH_HEADERS,
        signal: controller.signal,
        redirect: "follow",
      })

      // response.url is the final URL after following all redirects
      const resolvedUrl = response.url || url
      const contentType = response.headers.get("content-type")
      const documentKind = detectDocumentKind(contentType)

      if (!response.ok) {
        const failure = makeFetchFailure(url, routeKind, "http_non_ok", {
          resolvedUrl,
          documentKind,
          statusCode: response.status,
          contentType,
        })
        logPrimaryOutcome({
          kind: "failure",
          failureReason: failure.failureReason,
          statusCode: failure.statusCode,
          contentType: failure.contentType,
        })
        return failure
      }

      if (documentKind === "pdf") {
        const failure = makeFetchFailure(url, routeKind, "pdf_unsupported", {
          resolvedUrl,
          documentKind,
          statusCode: response.status,
          contentType,
        })
        logPrimaryOutcome({
          kind: "failure",
          failureReason: failure.failureReason,
          statusCode: failure.statusCode,
          contentType: failure.contentType,
        })
        return failure
      }

      if (routeKind === "proxy_or_redirect_like" && isProxyLikeUrl(resolvedUrl)) {
        const failure = makeFetchFailure(url, routeKind, "proxy_unresolved", {
          resolvedUrl,
          documentKind,
          statusCode: response.status,
          contentType,
        })
        logPrimaryOutcome({
          kind: "failure",
          failureReason: failure.failureReason,
          statusCode: failure.statusCode,
          contentType: failure.contentType,
        })
        return failure
      }

      const html = await response.text()
      const { document } = parseHTML(html)

      const reader = new Readability(document as unknown as Document)
      const article = reader.parse()

      if (!article?.content) {
        const failure = makeFetchFailure(url, routeKind, "readability_empty", {
          resolvedUrl,
          documentKind,
          statusCode: response.status,
          contentType,
        })
        logPrimaryOutcome({
          kind: "failure",
          failureReason: failure.failureReason,
          statusCode: failure.statusCode,
          contentType: failure.contentType,
        })
        return failure
      }

      const markdown = turndown.turndown(article.content)
      // Skip trivially short extractions (login forms, nav-only pages)
      if (markdown.trim().length < MIN_CONTENT_CHARS) {
        const failure = makeFetchFailure(url, routeKind, "content_too_short", {
          resolvedUrl,
          documentKind,
          statusCode: response.status,
          contentType,
        })
        logPrimaryOutcome({
          kind: "failure",
          failureReason: failure.failureReason,
          statusCode: failure.statusCode,
          contentType: failure.contentType,
        })
        return failure
      }

      const structured = extractStructuredMetadata(article, document)
      const documentText = normalizeDocumentText(markdown)
      const paragraphs = buildParagraphsFromSourceDocument(document)

      // Extract metadata that readability parses but excludes from content
      const metadataBlock = buildMetadataBlock(structured)
      const content = metadataBlock ? `${metadataBlock}\n\n${markdown}` : markdown
      logPrimaryOutcome({ kind: "success" })
      return {
        ok: true,
        content,
        resolvedUrl,
        routeKind,
        rawTitle: structured.rawTitle,
        title: structured.title,
        author: structured.author,
        publishedAt: structured.publishedAt,
        siteName: structured.siteName,
        documentKind,
        contentType,
        exactMetadataAvailable: true,
        paragraphs,
        documentText,
      }
    } catch (error) {
      if (controller.signal.aborted) {
        const failure = makeFetchFailure(url, routeKind, "timeout")
        logPrimaryOutcome({
          kind: "failure",
          failureReason: failure.failureReason,
        })
        return failure
      }

      const failure = makeFetchFailure(url, routeKind, "fetch_error", {
        documentKind: inferDocumentKindFromRouteKind(routeKind),
      })
      logPrimaryOutcome({
        kind: "failure",
        failureReason: failure.failureReason,
      })
      return failure
    }
  })()

  try {
    return await Promise.race([fetchPromise, timeoutPromise])
  } finally {
    clearTimeout(timerId!)
  }
}

async function fetchViaTavily(
  urls: string[],
  apiKey: string,
): Promise<Map<string, { url: string; content: string | null }>> {
  try {
    const { tavily } = await import("@tavily/core")
    const client = tavily({ apiKey })
    const response = await client.extract(urls, {
      extractDepth: "basic",
    })

    return new Map(
      response.results.map((r: { url: string; rawContent?: string; raw_content?: string }) => [
        r.url,
        {
          url: r.url,
          content: r.rawContent ?? r.raw_content ?? null,
        },
      ]),
    )
  } catch {
    // Tavily failure — return all as failed
    return new Map(urls.map((url) => [url, { url, content: null }]))
  }
}

/**
 * Extract author, date, and site metadata from readability article and HTML meta tags.
 * Returns a markdown metadata block to prepend to content, or empty string if no metadata found.
 */
function extractStructuredMetadata(
  article: { title?: string | null; byline?: string | null; publishedTime?: string | null; siteName?: string | null; excerpt?: string | null },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any,
): {
  title: string | null
  rawTitle: string | null
  author: string | null
  publishedAt: string | null
  siteName: string | null
} {
  const rawTitle = (() => {
    const articleTitle = normalizeMetadataValue(article.title)
    if (articleTitle) return articleTitle
    return normalizeMetadataValue(extractMetaContent(document, [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      "title",
    ]))
  })()

  let author = normalizeMetadataValue(article.byline)
  if (!author) {
    author = normalizeMetadataValue(extractMetaContent(document, [
      'meta[name="author"]',
      'meta[name="citation_author"]',
      'meta[property="article:author"]',
      'meta[property="og:author"]',
      'meta[name="dcterms.creator"]',
    ]))
  }

  let publishedAt = normalizeMetadataValue(article.publishedTime)
  if (!publishedAt) {
    publishedAt = normalizeMetadataValue(extractMetaContent(document, [
      'meta[name="citation_date"]',
      'meta[name="citation_publication_date"]',
      'meta[property="article:published_time"]',
      'meta[name="dcterms.date"]',
      'meta[name="date"]',
      'time[datetime]',
    ]))
  }

  let siteName = normalizeMetadataValue(article.siteName)
  if (!siteName) {
    siteName = normalizeMetadataValue(extractMetaContent(document, [
      'meta[property="og:site_name"]',
      'meta[name="application-name"]',
    ]))
  }

  const title = rawTitle ? stripSiteSuffix(rawTitle, siteName ?? "") : null

  return { rawTitle, title, author, publishedAt, siteName }
}

function buildMetadataBlock(
  metadata: { author: string | null; publishedAt: string | null; siteName: string | null },
): string {
  const lines: string[] = []

  // 1. Author — from readability byline or HTML meta tags
  if (metadata.author) lines.push(`**Author:** ${metadata.author}`)

  // 2. Published date — from readability or meta tags
  if (metadata.publishedAt) lines.push(`**Published:** ${metadata.publishedAt}`)

  // 3. Site name — from readability or meta
  if (metadata.siteName) lines.push(`**Source:** ${metadata.siteName}`)

  return lines.length > 0 ? lines.join("\n") : ""
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMetaContent(document: any, selectors: string[]): string | undefined {
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector)
      if (!el) continue
      if (selector === "title") {
        const text = el.textContent?.trim()
        if (text) return text
        continue
      }
      // For <time datetime="...">
      const value = el.getAttribute("content") ?? el.getAttribute("datetime")
      if (value?.trim()) return value.trim()
    } catch {
      continue
    }
  }
  return undefined
}

function truncate(text: string): string {
  if (text.length <= MAX_CONTENT_CHARS) return text
  const truncated = text.slice(0, MAX_CONTENT_CHARS)
  const lastBreak = truncated.lastIndexOf("\n\n")
  return lastBreak > MAX_CONTENT_CHARS * 0.5
    ? truncated.slice(0, lastBreak) + "\n\n[content truncated]"
    : truncated + "\n\n[content truncated]"
}

function truncateRag(text: string): string {
  if (text.length <= MAX_RAG_CONTENT_CHARS) return text
  const truncated = text.slice(0, MAX_RAG_CONTENT_CHARS)
  const lastBreak = truncated.lastIndexOf("\n\n")
  return lastBreak > MAX_RAG_CONTENT_CHARS * 0.5
    ? truncated.slice(0, lastBreak)
    : truncated
}

function normalizeMetadataValue(value: string | null | undefined): string | null {
  const normalized = collapseWhitespace(decodeHtmlEntities(value ?? ""))
  return normalized.length > 0 ? normalized : null
}

function stripSiteSuffix(title: string, siteName: string): string {
  const cleanedTitle = title.trim()
  const cleanedSite = siteName.trim()
  if (!cleanedTitle || !cleanedSite) return cleanedTitle
  if (cleanedSite.toLowerCase() === "situs web") return cleanedTitle

  const normalizeKey = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "")

  const siteKey = normalizeKey(cleanedSite)
  const matchesSite = (value: string) => {
    const key = normalizeKey(value)
    if (!key) return false
    if (siteKey && key === siteKey) return true
    return false
  }

  const separators = [" | ", " - ", " — ", " – ", " • "]
  for (const sep of separators) {
    const parts = cleanedTitle.split(sep).map((part) => part.trim()).filter(Boolean)
    if (parts.length < 2) continue
    const first = parts[0]
    const last = parts[parts.length - 1]
    if (!first || !last) continue

    if (matchesSite(last)) return parts.slice(0, -1).join(sep).trim()
    if (matchesSite(first)) return parts.slice(1).join(sep).trim()
  }

  return cleanedTitle
}

function normalizeDocumentText(text: string): string {
  return text.replace(/\r\n/g, "\n").trim()
}

function detectDocumentKind(contentType: string | null): "html" | "pdf" | "unknown" {
  const normalized = (contentType ?? "").toLowerCase()

  if (normalized.includes("application/pdf")) return "pdf"
  if (
    normalized.includes("text/html")
    || normalized.includes("application/xhtml+xml")
  ) {
    return "html"
  }

  return "unknown"
}

function inferDocumentKindFromRouteKind(routeKind: FetchRouteKind): "html" | "pdf" | "unknown" {
  if (routeKind === "pdf_or_download") return "pdf"
  return "unknown"
}

function isProxyLikeUrl(url: string): boolean {
  const hostname = safeParseUrl(url)?.hostname.toLowerCase() ?? url.toLowerCase()
  return isProxyLikeHost(hostname)
}

function isProxyLikeHost(hostname: string): boolean {
  return [
    "doi.org",
    "dx.doi.org",
    "vertexaisearch.cloud.google.com",
  ].some((proxyHost) => hostname === proxyHost || hostname.endsWith(`.${proxyHost}`))
}

function isAcademicWallHost(hostname: string, pathname: string): boolean {
  if (matchesHostOrSubdomain(hostname, "onlinelibrary.wiley.com")
    || matchesHostOrSubdomain(hostname, "www.researchgate.net")
    || matchesHostOrSubdomain(hostname, "researchgate.net")
  ) {
    return true
  }

  if (matchesHostOrSubdomain(hostname, "arxiv.org")) {
    return pathname.startsWith("/abs/")
      || pathname.startsWith("/html/")
  }

  if (matchesHostOrSubdomain(hostname, "link.springer.com")) {
    return pathname.startsWith("/article/")
      || pathname.startsWith("/chapter/")
  }

  if (matchesHostOrSubdomain(hostname, "www.sciencedirect.com")) {
    return pathname.startsWith("/science/article/pii/")
  }

  if (matchesHostOrSubdomain(hostname, "dl.acm.org")) {
    return pathname.startsWith("/doi/")
  }

  if (matchesHostOrSubdomain(hostname, "ieeexplore.ieee.org")) {
    return pathname.startsWith("/document/")
      || pathname.startsWith("/abstract/")
  }

  return false
}

function matchesHostOrSubdomain(hostname: string, candidateHost: string): boolean {
  return hostname === candidateHost || hostname.endsWith(`.${candidateHost}`)
}

function isPdfOrDownloadPath(pathname: string): boolean {
  return pathname.endsWith(".pdf")
    || pathname.includes("/pdf/")
    || pathname.includes("/article/download/")
    || pathname.includes("/download/")
}

function safeParseUrl(url: string): URL | null {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

function buildParagraphsFromSourceDocument(
  document: Document,
): FetchedParagraph[] | null {
  const root =
    document.querySelector("article")
    ?? document.querySelector("main")
    ?? document.body
    ?? document.documentElement

  if (!root) return null

  const paragraphs = collectReadableBlocks(root)
  if (paragraphs.length === 0) return null
  return paragraphs.map((text, index) => ({ index: index + 1, text }))
}

function buildParagraphsFromText(text: string | null): FetchedParagraph[] | null {
  if (!text) return null
  const normalized = normalizeDocumentText(text)
  if (!normalized) return null

  const segments = normalized
    .replace(/\n{3,}/g, "\n\n")
    .split(/\n{2,}/)
    .map((segment) => segment.replace(/[ \t]+\n/g, "\n").trim())
    .filter((segment) => segment.length > 0)

  if (segments.length === 0) return null

  return segments.map((segment, index) => ({
    index: index + 1,
    text: segment,
  }))
}

function normalizeParagraphText(text: string): string {
  return collapseWhitespace(decodeHtmlEntities(text))
}

const READABLE_BLOCK_TAGS = new Set([
  "p",
  "pre",
  "figcaption",
])

const WRAPPER_TAGS = new Set([
  "article",
  "aside",
  "div",
  "blockquote",
  "figure",
  "main",
  "section",
  "span",
  "tbody",
  "thead",
  "tfoot",
  "tr",
  "td",
  "th",
  "table",
  "ul",
  "ol",
  "li",
])

const SKIP_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "nav",
  "footer",
  "header",
  "form",
  "script",
  "style",
  "noscript",
  "template",
])

function collectReadableBlocks(root: ParentNode): string[] {
  const blocks: string[] = []
  const inlineParts: string[] = []

  const flushInlineParts = () => {
    if (inlineParts.length === 0) return
    const text = normalizeParagraphText(inlineParts.join(""))
    inlineParts.length = 0
    if (text) blocks.push(text)
  }

  const visit = (node: ChildNode) => {
    if (node.nodeType === 3) {
      const text = node.textContent ?? ""
      if (text) inlineParts.push(text)
      return
    }

    if (node.nodeType !== 1) return

    const element = node as Element
    const tagName = element.tagName.toLowerCase()

    if (SKIP_TAGS.has(tagName)) return

    if (READABLE_BLOCK_TAGS.has(tagName)) {
      flushInlineParts()
      const text = normalizeParagraphText(element.textContent ?? "")
      if (text) blocks.push(text)
      return
    }

    if (!WRAPPER_TAGS.has(tagName)) {
      const childBlocks = collectReadableBlocks(element)
      if (childBlocks.length === 1) {
        inlineParts.push(childBlocks[0])
      } else if (childBlocks.length > 1) {
        flushInlineParts()
        blocks.push(...childBlocks)
      }
      return
    }

    const childBlocks = collectReadableBlocks(element)
    if (childBlocks.length > 0) {
      flushInlineParts()
      blocks.push(...childBlocks)
    }
  }

  for (const child of Array.from(root.childNodes)) {
    visit(child)
  }

  flushInlineParts()

  return blocks
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&raquo;/gi, "»")
    .replace(/&laquo;/gi, "«")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
}

function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim()
}
