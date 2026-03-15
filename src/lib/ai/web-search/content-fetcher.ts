import { Readability } from "@mozilla/readability"
import { parseHTML } from "linkedom"
import TurndownService from "turndown"

export interface FetchedContent {
  url: string
  pageContent: string | null
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
  const primaryResults = await Promise.allSettled(
    urls.map((url) => fetchAndParse(url, timeoutMs)),
  )

  const results: FetchedContent[] = primaryResults.map((settled, i) => {
    if (settled.status === "fulfilled" && settled.value) {
      console.log(`[FetchWeb] ✓ PRIMARY ok: ${urls[i]} (${settled.value.length} chars)`)
      return { url: urls[i], pageContent: settled.value, fetchMethod: "fetch" as const }
    }
    const reason = settled.status === "rejected" ? settled.reason?.message : "empty/null content"
    console.log(`[FetchWeb] ✗ PRIMARY fail: ${urls[i]} — ${reason}`)
    return { url: urls[i], pageContent: null, fetchMethod: null }
  })

  // Fallback tier: Tavily for failed URLs
  if (options?.tavilyApiKey) {
    const failedUrls = results
      .filter((r) => r.pageContent === null)
      .map((r) => r.url)

    if (failedUrls.length > 0) {
      console.log(`[FetchWeb] Tavily fallback for ${failedUrls.length} failed URLs...`)
      const tavilyResults = await fetchViaTavily(failedUrls, options.tavilyApiKey)
      for (const tr of tavilyResults) {
        const idx = results.findIndex((r) => r.url === tr.url)
        if (idx !== -1 && tr.content) {
          console.log(`[FetchWeb] ✓ TAVILY ok: ${tr.url} (${tr.content.length} chars)`)
          results[idx].pageContent = truncate(tr.content)
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
      return truncate(markdown)
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

function truncate(text: string): string {
  if (text.length <= MAX_CONTENT_CHARS) return text
  // Truncate at last paragraph break before limit
  const truncated = text.slice(0, MAX_CONTENT_CHARS)
  const lastBreak = truncated.lastIndexOf("\n\n")
  return lastBreak > MAX_CONTENT_CHARS * 0.5
    ? truncated.slice(0, lastBreak) + "\n\n[content truncated]"
    : truncated + "\n\n[content truncated]"
}
