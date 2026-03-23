import { Readability } from "@mozilla/readability"
import { parseHTML } from "linkedom"
import TurndownService from "turndown"

export interface FetchedParagraph {
  index: number
  text: string
}

export interface FetchedContent {
  url: string                      // input URL (may be proxy)
  resolvedUrl: string              // final URL after redirect:follow
  rawTitle: string | null
  title: string | null
  author: string | null
  publishedAt: string | null
  siteName: string | null
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
    if (settled.status === "fulfilled" && settled.value) {
      const { content, resolvedUrl, rawTitle, title, author, publishedAt, siteName, exactMetadataAvailable, paragraphs, documentText } = settled.value
      console.log(`[⏱ LATENCY] FetchWeb PRIMARY [${i+1}/${urls.length}] ✓ ${elapsed}ms ${resolvedUrl.slice(0, 70)} (${content.length} chars)`)
      return {
        url: urls[i],
        resolvedUrl,
        rawTitle,
        title,
        author,
        publishedAt,
        siteName,
        exactMetadataAvailable,
        paragraphs,
        documentText,
        pageContent: truncate(content),
        fullContent: truncateRag(content),
        fetchMethod: "fetch" as const,
      }
    }
    const reason = settled.status === "rejected" ? settled.reason?.message : "empty/null content"
    console.log(`[⏱ LATENCY] FetchWeb PRIMARY [${i+1}/${urls.length}] ✗ ${elapsed}ms ${urls[i].slice(0, 70)} — ${reason}`)
    return {
      url: urls[i],
      resolvedUrl: urls[i],
      rawTitle: null,
      title: null,
      author: null,
      publishedAt: null,
      siteName: null,
      exactMetadataAvailable: false,
      paragraphs: null,
      documentText: null,
      pageContent: null,
      fullContent: null,
      fetchMethod: null,
    }
  })
  console.log(`[⏱ LATENCY] FetchWeb PRIMARY batch=${Date.now() - primaryStart}ms (parallel, slowest URL determines total)`)

  // Fallback tier: Tavily for failed URLs
  if (options?.tavilyApiKey) {
    const failedUrls = results
      .filter((r) => r.pageContent === null)
      .map((r) => r.url)

    if (failedUrls.length > 0) {
      const tavilyStart = Date.now()
      console.log(`[FetchWeb] Tavily fallback for ${failedUrls.length} failed URLs...`)
      const tavilyResults = await fetchViaTavily(failedUrls, options.tavilyApiKey)
      console.log(`[⏱ LATENCY] FetchWeb TAVILY batch=${Date.now() - tavilyStart}ms urls=${failedUrls.length}`)
      for (const tr of tavilyResults) {
        const idx = results.findIndex((r) => r.url === tr.url)
        if (idx !== -1 && tr.content) {
          console.log(`[FetchWeb] ✓ TAVILY ok: ${tr.url} (${tr.content.length} chars)`)
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
          results[idx].exactMetadataAvailable = false
          results[idx].paragraphs = buildParagraphsFromText(tr.content)
          results[idx].documentText = normalizeDocumentText(tr.content)
        } else {
          console.log(`[FetchWeb] ✗ TAVILY fail: ${tr.url}`)
        }
      }
    }
  }

  const successCount = results.filter((r) => r.pageContent !== null).length
  const fetchCount = results.filter((r) => r.fetchMethod === "fetch").length
  const tavilyCount = results.filter((r) => r.fetchMethod === "tavily").length
  console.log(`[FetchWeb] Done: ${successCount}/${urls.length} succeeded (fetch=${fetchCount}, tavily=${tavilyCount})`)

  return results
}

interface FetchParseResult {
  content: string
  resolvedUrl: string
  rawTitle: string | null
  title: string | null
  author: string | null
  publishedAt: string | null
  siteName: string | null
  exactMetadataAvailable: boolean
  paragraphs: FetchedParagraph[] | null
  documentText: string | null
}

async function fetchAndParse(url: string, timeoutMs: number): Promise<FetchParseResult | null> {
  const controller = new AbortController()

  let timerId: ReturnType<typeof setTimeout>
  const timeoutPromise = new Promise<null>((resolve) => {
    timerId = setTimeout(() => {
      controller.abort()
      resolve(null)
    }, timeoutMs)
  })

  const fetchPromise = (async (): Promise<FetchParseResult | null> => {
    try {
      const response = await fetch(url, {
        headers: FETCH_HEADERS,
        signal: controller.signal,
        redirect: "follow",
      })

      if (!response.ok) return null

      // response.url is the final URL after following all redirects
      const resolvedUrl = response.url || url

      const html = await response.text()
      const { document } = parseHTML(html)

      const reader = new Readability(document as unknown as Document)
      const article = reader.parse()

      if (!article?.content) return null

      const markdown = turndown.turndown(article.content)
      // Skip trivially short extractions (login forms, nav-only pages)
      if (markdown.trim().length < MIN_CONTENT_CHARS) return null

      const structured = extractStructuredMetadata(article, document)
      const documentText = normalizeDocumentText(markdown)
      const paragraphs = buildParagraphsFromArticleContent(article.content)

      // Extract metadata that readability parses but excludes from content
      const metadataBlock = buildMetadataBlock(structured)
      const content = metadataBlock ? `${metadataBlock}\n\n${markdown}` : markdown
      return {
        content,
        resolvedUrl,
        rawTitle: structured.rawTitle,
        title: structured.title,
        author: structured.author,
        publishedAt: structured.publishedAt,
        siteName: structured.siteName,
        exactMetadataAvailable: true,
        paragraphs,
        documentText,
      }
    } catch {
      return null
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

function buildParagraphsFromArticleContent(articleContent: string | null | undefined): FetchedParagraph[] | null {
  if (!articleContent) return null
  const { document } = parseHTML(`<body>${articleContent}</body>`)
  const blocks = document.querySelectorAll("p, li, blockquote, pre, figcaption")
  const paragraphs = Array.from(blocks)
    .map((el) => normalizeParagraphText(el.textContent ?? ""))
    .filter((text) => text.length > 0)
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
