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
  if (isAcademicWallHost(hostname)) return "academic_wall_risk"
  if (isPdfOrDownloadPath(pathname)) return "pdf_or_download"

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

  // Primary tier: parallel fetch + readability
  const primaryStart = Date.now()
  const urlTimers = urls.map(() => Date.now())
  const primaryResults = await Promise.allSettled(
    urls.map((url, idx) => {
      urlTimers[idx] = Date.now()
      return fetchAndParse(url, timeoutMs)
    }),
  )

  const results: FetchedContent[] = primaryResults.map((settled, i) => {
    const elapsed = Date.now() - urlTimers[i]
    if (settled.status === "fulfilled") {
      const result = settled.value
      if (result.ok) {
        const {
          content,
          resolvedUrl,
          routeKind,
          rawTitle,
          title,
          author,
          publishedAt,
          siteName,
          documentKind,
          exactMetadataAvailable,
          paragraphs,
          documentText,
          contentType,
        } = result
        console.log(`[⏱ LATENCY] ${reqTag}FetchWeb PRIMARY [${i+1}/${urls.length}] ✓ ${elapsed}ms ${resolvedUrl.slice(0, 70)} (${content.length} chars)`)
        return {
          url: urls[i],
          resolvedUrl,
          routeKind,
          rawTitle,
          title,
          author,
          publishedAt,
          siteName,
          documentKind,
          failureReason: undefined,
          statusCode: undefined,
          contentType: contentType ?? null,
          exactMetadataAvailable,
          paragraphs,
          documentText,
          pageContent: truncate(content),
          fullContent: truncateRag(content),
          fetchMethod: "fetch" as const,
        }
      }

      const failure = result
      const { failureReason, routeKind, statusCode, contentType, resolvedUrl, documentKind } = failure
      const statusBits = [
        `route=${routeKind}`,
        `reason=${failureReason}`,
        statusCode ? `status=${statusCode}` : null,
        contentType ? `contentType=${contentType}` : null,
      ].filter(Boolean).join(" ")
      console.log(`[⏱ LATENCY] ${reqTag}FetchWeb PRIMARY [${i+1}/${urls.length}] ✗ ${elapsed}ms ${statusBits} ${urls[i].slice(0, 70)}`)
      return {
        url: urls[i],
        resolvedUrl,
        routeKind,
        rawTitle: null,
        title: null,
        author: null,
        publishedAt: null,
        siteName: null,
        documentKind: documentKind ?? inferDocumentKindFromRouteKind(routeKind),
        failureReason,
        statusCode,
        contentType,
        exactMetadataAvailable: false,
        paragraphs: null,
        documentText: null,
        pageContent: null,
        fullContent: null,
        fetchMethod: null,
      }
    }

    const routeKind = classifyFetchRoute(urls[i])
    const failureReason: FetchFailureReason = "fetch_error"
    console.log(`[⏱ LATENCY] ${reqTag}FetchWeb PRIMARY [${i+1}/${urls.length}] ✗ ${elapsed}ms route=${routeKind} reason=${failureReason} ${urls[i].slice(0, 70)}`)
    return {
      url: urls[i],
      resolvedUrl: urls[i],
      routeKind,
      rawTitle: null,
      title: null,
      author: null,
      publishedAt: null,
      siteName: null,
      documentKind: inferDocumentKindFromRouteKind(routeKind),
      failureReason,
      exactMetadataAvailable: false,
      paragraphs: null,
      documentText: null,
      pageContent: null,
      fullContent: null,
      fetchMethod: null,
    }
  })
  console.log(`[⏱ LATENCY] ${reqTag}FetchWeb PRIMARY batch=${Date.now() - primaryStart}ms (parallel, slowest URL determines total)`)

  // Fallback tier: Tavily for failed URLs
  if (options?.tavilyApiKey) {
    const failedUrls = results
      .filter((r) => r.pageContent === null)
      .map((r) => r.url)

    if (failedUrls.length > 0) {
      const tavilyStart = Date.now()
      console.log(`[FetchWeb] ${reqTag}Tavily fallback for ${failedUrls.length} failed URLs...`)
      const tavilyResults = await fetchViaTavily(failedUrls, options.tavilyApiKey)
      console.log(`[⏱ LATENCY] ${reqTag}FetchWeb TAVILY batch=${Date.now() - tavilyStart}ms urls=${failedUrls.length}`)
      for (const tr of tavilyResults) {
        const idx = results.findIndex((r) => r.url === tr.url)
        if (idx !== -1 && tr.content) {
          console.log(`[FetchWeb] ${reqTag}✓ TAVILY ok: ${tr.url} (${tr.content.length} chars)`)
          results[idx].pageContent = truncate(tr.content)
          results[idx].fullContent = truncateRag(tr.content)
          results[idx].fetchMethod = "tavily"
          // Tavily returns the real URL — use it as resolvedUrl
          results[idx].resolvedUrl = tr.url
          results[idx].rawTitle = null
          results[idx].title = null
          results[idx].author = null
          results[idx].publishedAt = null
          results[idx].siteName = null
          results[idx].documentKind = "unknown"
          results[idx].exactMetadataAvailable = false
          results[idx].paragraphs = buildParagraphsFromText(tr.content)
          results[idx].documentText = normalizeDocumentText(tr.content)
        } else {
          console.log(`[FetchWeb] ${reqTag}✗ TAVILY fail: ${tr.url}`)
        }
      }
    }
  }

  const successCount = results.filter((r) => r.pageContent !== null).length
  const fetchCount = results.filter((r) => r.fetchMethod === "fetch").length
  const tavilyCount = results.filter((r) => r.fetchMethod === "tavily").length
  console.log(`[FetchWeb] ${reqTag}Done: ${successCount}/${urls.length} succeeded (fetch=${fetchCount}, tavily=${tavilyCount})`)

  return results
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

async function fetchAndParse(url: string, timeoutMs: number): Promise<FetchParseResult | FetchParseFailureResult> {
  const routeKind = classifyFetchRoute(url)
  const controller = new AbortController()

  let timerId: ReturnType<typeof setTimeout>
  const timeoutPromise = new Promise<FetchParseResult | FetchParseFailureResult>((resolve) => {
    timerId = setTimeout(() => {
      controller.abort()
      resolve(makeFetchFailure(url, routeKind, "timeout"))
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
        return makeFetchFailure(url, routeKind, "http_non_ok", {
          resolvedUrl,
          documentKind,
          statusCode: response.status,
          contentType,
        })
      }

      if (documentKind === "pdf") {
        return makeFetchFailure(url, routeKind, "pdf_unsupported", {
          resolvedUrl,
          documentKind,
          statusCode: response.status,
          contentType,
        })
      }

      if (routeKind === "proxy_or_redirect_like" && isProxyLikeUrl(resolvedUrl)) {
        return makeFetchFailure(url, routeKind, "proxy_unresolved", {
          resolvedUrl,
          documentKind,
          statusCode: response.status,
          contentType,
        })
      }

      const html = await response.text()
      const { document } = parseHTML(html)

      const reader = new Readability(document as unknown as Document)
      const article = reader.parse()

      if (!article?.content) {
        return makeFetchFailure(url, routeKind, "readability_empty", {
          resolvedUrl,
          documentKind,
          statusCode: response.status,
          contentType,
        })
      }

      const markdown = turndown.turndown(article.content)
      // Skip trivially short extractions (login forms, nav-only pages)
      if (markdown.trim().length < MIN_CONTENT_CHARS) {
        return makeFetchFailure(url, routeKind, "content_too_short", {
          resolvedUrl,
          documentKind,
          statusCode: response.status,
          contentType,
        })
      }

      const structured = extractStructuredMetadata(article, document)
      const documentText = normalizeDocumentText(markdown)
      const paragraphs = buildParagraphsFromSourceDocument(document)

      // Extract metadata that readability parses but excludes from content
      const metadataBlock = buildMetadataBlock(structured)
      const content = metadataBlock ? `${metadataBlock}\n\n${markdown}` : markdown
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
        return makeFetchFailure(url, routeKind, "timeout")
      }

      return makeFetchFailure(url, routeKind, "fetch_error", {
        documentKind: inferDocumentKindFromRouteKind(routeKind),
      })
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
): Promise<Array<{ url: string; content: string | null }>> {
  try {
    const { tavily } = await import("@tavily/core")
    const client = tavily({ apiKey })
    const response = await client.extract(urls, {
      extractDepth: "basic",
    })

    return response.results.map((r: { url: string; rawContent?: string; raw_content?: string }) => ({
      url: r.url,
      content: r.rawContent ?? r.raw_content ?? null,
    }))
  } catch {
    // Tavily failure — return all as failed
    return urls.map((url) => ({ url, content: null }))
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

function isAcademicWallHost(hostname: string): boolean {
  return [
    "onlinelibrary.wiley.com",
    "www.researchgate.net",
    "researchgate.net",
  ].some((academicHost) => hostname === academicHost || hostname.endsWith(`.${academicHost}`))
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
