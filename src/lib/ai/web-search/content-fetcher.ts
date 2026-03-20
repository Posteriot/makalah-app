import { Readability } from "@mozilla/readability"
import { parseHTML } from "linkedom"
import TurndownService from "turndown"

export interface FetchedContent {
  url: string
  pageContent: string | null      // truncated for compose context
  fullContent: string | null       // full content for RAG ingest (no truncation)
  fetchMethod: "fetch" | "tavily" | null
}

interface FetchOptions {
  tavilyApiKey?: string
  timeoutMs?: number
}

const MAX_CONTENT_CHARS = 12000 // ~3000 tokens
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
      console.log(`[⏱ LATENCY] FetchWeb PRIMARY [${i+1}/${urls.length}] ✓ ${elapsed}ms ${urls[i].slice(0, 70)} (${settled.value.length} chars)`)
      return { url: urls[i], pageContent: truncate(settled.value), fullContent: settled.value, fetchMethod: "fetch" as const }
    }
    const reason = settled.status === "rejected" ? settled.reason?.message : "empty/null content"
    console.log(`[⏱ LATENCY] FetchWeb PRIMARY [${i+1}/${urls.length}] ✗ ${elapsed}ms ${urls[i].slice(0, 70)} — ${reason}`)
    return { url: urls[i], pageContent: null, fullContent: null, fetchMethod: null }
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
          results[idx].fullContent = tr.content
          results[idx].fetchMethod = "tavily"
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

async function fetchAndParse(url: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController()

  let timerId: ReturnType<typeof setTimeout>
  const timeoutPromise = new Promise<null>((resolve) => {
    timerId = setTimeout(() => {
      controller.abort()
      resolve(null)
    }, timeoutMs)
  })

  const fetchPromise = (async (): Promise<string | null> => {
    try {
      const response = await fetch(url, {
        headers: FETCH_HEADERS,
        signal: controller.signal,
        redirect: "follow",
      })

      if (!response.ok) return null

      const html = await response.text()
      const { document } = parseHTML(html)

      const reader = new Readability(document as unknown as Document)
      const article = reader.parse()

      if (!article?.content) return null

      const markdown = turndown.turndown(article.content)
      // Skip trivially short extractions (login forms, nav-only pages)
      if (markdown.trim().length < MIN_CONTENT_CHARS) return null

      // Extract metadata that readability parses but excludes from content
      const metadataBlock = buildMetadataBlock(article, document)
      return metadataBlock ? `${metadataBlock}\n\n${markdown}` : markdown
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
function buildMetadataBlock(
  article: { byline?: string | null; publishedTime?: string | null; siteName?: string | null; excerpt?: string | null },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any,
): string {
  const lines: string[] = []

  // 1. Author — from readability byline or HTML meta tags
  let author = article.byline?.trim()
  if (!author) {
    author = extractMetaContent(document, [
      'meta[name="author"]',
      'meta[name="citation_author"]',
      'meta[property="article:author"]',
      'meta[property="og:author"]',
      'meta[name="dcterms.creator"]',
    ])
  }
  if (author) lines.push(`**Author:** ${author}`)

  // 2. Published date — from readability or meta tags
  let date = article.publishedTime?.trim()
  if (!date) {
    date = extractMetaContent(document, [
      'meta[name="citation_date"]',
      'meta[name="citation_publication_date"]',
      'meta[property="article:published_time"]',
      'meta[name="dcterms.date"]',
      'meta[name="date"]',
      'time[datetime]',
    ])
  }
  if (date) lines.push(`**Published:** ${date}`)

  // 3. Site name — from readability or meta
  let site = article.siteName?.trim()
  if (!site) {
    site = extractMetaContent(document, [
      'meta[property="og:site_name"]',
      'meta[name="application-name"]',
    ])
  }
  if (site) lines.push(`**Source:** ${site}`)

  return lines.length > 0 ? lines.join("\n") : ""
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMetaContent(document: any, selectors: string[]): string | undefined {
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector)
      if (!el) continue
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
  // Truncate at last paragraph break before limit
  const truncated = text.slice(0, MAX_CONTENT_CHARS)
  const lastBreak = truncated.lastIndexOf("\n\n")
  return lastBreak > MAX_CONTENT_CHARS * 0.5
    ? truncated.slice(0, lastBreak) + "\n\n[content truncated]"
    : truncated + "\n\n[content truncated]"
}
