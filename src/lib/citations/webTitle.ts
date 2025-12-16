import { deriveSiteNameFromUrl, normalizeWebSearchUrl } from "@/lib/citations/apaWeb"

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
}

function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim()
}

function extractMetaContent(html: string, attrName: string, attrValue: string): string | null {
  const re1 = new RegExp(
    `<meta[^>]*\\b${attrName}\\s*=\\s*["']${attrValue}["'][^>]*\\bcontent\\s*=\\s*["']([^"']+)["'][^>]*>`,
    "i"
  )
  const re2 = new RegExp(
    `<meta[^>]*\\bcontent\\s*=\\s*["']([^"']+)["'][^>]*\\b${attrName}\\s*=\\s*["']${attrValue}["'][^>]*>`,
    "i"
  )
  const m1 = html.match(re1)
  if (m1?.[1]) return m1[1]
  const m2 = html.match(re2)
  if (m2?.[1]) return m2[1]
  return null
}

function extractTitleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m?.[1] ?? null
}

function extractLinkHref(html: string, relValue: string): string | null {
  const rel = relValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re1 = new RegExp(
    `<link[^>]*\\brel\\s*=\\s*["']${rel}["'][^>]*\\bhref\\s*=\\s*["']([^"']+)["'][^>]*>`,
    "i"
  )
  const re2 = new RegExp(
    `<link[^>]*\\bhref\\s*=\\s*["']([^"']+)["'][^>]*\\brel\\s*=\\s*["']${rel}["'][^>]*>`,
    "i"
  )
  const m1 = html.match(re1)
  if (m1?.[1]) return m1[1]
  const m2 = html.match(re2)
  if (m2?.[1]) return m2[1]
  return null
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
    const parts = cleanedTitle.split(sep).map((p) => p.trim()).filter(Boolean)
    if (parts.length < 2) continue
    const first = parts[0]
    const last = parts[parts.length - 1]
    if (!first || !last) continue

    if (matchesSite(last)) return parts.slice(0, -1).join(sep).trim()
    if (matchesSite(first)) return parts.slice(1).join(sep).trim()
  }

  return cleanedTitle
}

function isIpAddress(hostname: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true
  return hostname.includes(":")
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((p) => Number.parseInt(p, 10))
  if (parts.length !== 4 || parts.some((p) => !Number.isFinite(p) || p < 0 || p > 255)) return false
  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  return false
}

function isDisallowedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  if (lower === "localhost" || lower.endsWith(".localhost")) return true
  if (lower === "0.0.0.0" || lower === "127.0.0.1" || lower === "::1") return true
  if (lower.endsWith(".local")) return true
  if (isIpAddress(lower) && /^\d/.test(lower) && isPrivateIpv4(lower)) return true
  return false
}

function isGoogleGroundingRedirectHost(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  return lower === "vertexaisearch.cloud.google.com" || lower.startsWith("vertexaisearch.cloud.google.")
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (nextIndex < items.length) {
      const idx = nextIndex
      nextIndex += 1
      results[idx] = await mapper(items[idx], idx)
    }
  })

  await Promise.all(workers)
  return results
}

export interface WebPageMetadata {
  title: string | null
  finalUrl: string | null
}

export async function fetchWebPageMetadata(
  url: string,
  options?: { timeoutMs?: number }
): Promise<WebPageMetadata> {
  const normalized = normalizeWebSearchUrl(url)
  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    return { title: null, finalUrl: null }
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return { title: null, finalUrl: null }
  if (isDisallowedHost(parsed.hostname)) return { title: null, finalUrl: null }

  const controller = new AbortController()
  const timeoutMs = options?.timeoutMs ?? 2500
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const requestWasProxyHost = isGoogleGroundingRedirectHost(parsed.hostname)
    const res = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "user-agent": "makalahapp/1.0",
      },
    })

    if (!res.ok) return { title: null, finalUrl: null }

    const finalUrlCandidate = normalizeWebSearchUrl(res.url || parsed.toString())
    const finalUrlParsed = (() => {
      try {
        return new URL(finalUrlCandidate)
      } catch {
        return null
      }
    })()

    let finalUrlSafe =
      finalUrlParsed &&
      ["http:", "https:"].includes(finalUrlParsed.protocol) &&
      !isDisallowedHost(finalUrlParsed.hostname) &&
      !isGoogleGroundingRedirectHost(finalUrlParsed.hostname)
        ? finalUrlParsed.toString()
        : null

    const contentType = res.headers.get("content-type") ?? ""
    if (!contentType.toLowerCase().includes("text/html")) {
      return { title: null, finalUrl: finalUrlSafe }
    }

    const html = (await res.text()).slice(0, 250_000)

    // Kalau URL masih proxy, coba ambil URL asli dari canonical / og:url di HTML halaman.
    if (!finalUrlSafe && requestWasProxyHost) {
      const canonicalHref = extractLinkHref(html, "canonical")
      const ogUrl = extractMetaContent(html, "property", "og:url")
      const twitterUrl = extractMetaContent(html, "name", "twitter:url")

      const candidate = canonicalHref ?? ogUrl ?? twitterUrl
      if (candidate) {
        const decodedCandidate = collapseWhitespace(decodeHtmlEntities(candidate))
        const normalizedCandidate = normalizeWebSearchUrl(decodedCandidate)
        const parsedCandidate = (() => {
          try {
            return new URL(normalizedCandidate)
          } catch {
            return null
          }
        })()

        if (
          parsedCandidate &&
          ["http:", "https:"].includes(parsedCandidate.protocol) &&
          !isDisallowedHost(parsedCandidate.hostname) &&
          !isGoogleGroundingRedirectHost(parsedCandidate.hostname)
        ) {
          finalUrlSafe = parsedCandidate.toString()
        }
      }
    }

    const ogTitle = extractMetaContent(html, "property", "og:title")
    const twitterTitle = extractMetaContent(html, "name", "twitter:title")
    const titleTag = extractTitleTag(html)

    const raw = ogTitle ?? twitterTitle ?? titleTag
    if (!raw) return { title: null, finalUrl: finalUrlSafe }

    const siteName = deriveSiteNameFromUrl(finalUrlSafe ?? normalized)
    const decoded = collapseWhitespace(decodeHtmlEntities(raw))
    const stripped = stripSiteSuffix(decoded, siteName)
    const final = collapseWhitespace(stripped)

    if (!final) return { title: null, finalUrl: finalUrlSafe }
    const title = final.length > 200 ? final.slice(0, 200).trim() : final
    return { title, finalUrl: finalUrlSafe }
  } catch {
    return { title: null, finalUrl: null }
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchWebPageTitle(url: string, options?: { timeoutMs?: number }): Promise<string | null> {
  const meta = await fetchWebPageMetadata(url, options)
  return meta.title
}

export async function enrichSourcesWithFetchedTitles<T extends { url: string; title?: string | null }>(
  sources: T[],
  options?: { concurrency?: number; timeoutMs?: number }
): Promise<T[]> {
  const concurrency = options?.concurrency ?? 4
  const timeoutMs = options?.timeoutMs ?? 2500

  return await mapWithConcurrency(sources, concurrency, async (src) => {
    const meta = await fetchWebPageMetadata(src.url, { timeoutMs })
    if (!meta.title && !meta.finalUrl) return src
    return {
      ...src,
      ...(meta.title ? { title: meta.title } : {}),
      ...(meta.finalUrl ? { url: meta.finalUrl } : {}),
    }
  })
}
