import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fetchPageContent } from "@/lib/ai/web-search/content-fetcher"

describe("classifyFetchRoute", () => {
  it("classifies PDF, academic-wall, and proxy-like URLs", async () => {
    const { classifyFetchRoute } = await import("@/lib/ai/web-search/content-fetcher") as any

    expect(classifyFetchRoute("https://example.com/files/paper.pdf")).toBe("pdf_or_download")
    expect(classifyFetchRoute("https://arxiv.org/pdf/2507.00181")).toBe("pdf_or_download")
    expect(classifyFetchRoute("https://onlinelibrary.wiley.com/doi/pdf/10.1111/jcal.70096")).toBe("pdf_or_download")
    expect(classifyFetchRoute("https://www.researchgate.net/publication/393260682_ChatGPT_produces_mo")).toBe("academic_wall_risk")
    expect(classifyFetchRoute("https://doi.org/10.1234/example")).toBe("proxy_or_redirect_like")
    expect(classifyFetchRoute("https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG")).toBe("proxy_or_redirect_like")
    expect(classifyFetchRoute("https://example.com/article")).toBe("html_standard")
  })
})

describe("fetchPageContent", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch")
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    vi.clearAllMocks()
    vi.unmock("@tavily/core")
    vi.useRealTimers()
  })

  it("extracts markdown content from a simple HTML page", async () => {
    const html = `
      <html>
      <head>
        <title>Test Article | Example News</title>
        <meta property="og:title" content="Test Article | Example News" />
        <meta property="og:site_name" content="Example News" />
        <meta name="author" content="Jane Doe" />
        <meta property="article:published_time" content="2026-03-23T10:00:00Z" />
      </head>
      <body>
        <nav>Navigation</nav>
        <article>
          <h1>Test Article</h1>
          <p>This is the main content of the article. It has enough text to be considered readable by the readability algorithm. The content discusses important findings about technology trends in Indonesia.</p>
          <p>A second paragraph with additional details about the research methodology and results that were found during the study period.</p>
        </article>
        <footer>Footer content</footer>
      </body></html>
    `
    fetchSpy.mockResolvedValueOnce(
      new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    )

    const results = await fetchPageContent(["https://example.com/article"])

    expect(results).toHaveLength(1)
    expect(results[0].url).toBe("https://example.com/article")
    expect(results[0].exactMetadataAvailable).toBe(true)
    expect(results[0].rawTitle).toBe("Test Article | Example News")
    expect(results[0].title).toBe("Test Article")
    expect(results[0].author).toBe("Jane Doe")
    expect(results[0].publishedAt).toBe("2026-03-23T10:00:00Z")
    expect(results[0].siteName).toBe("Example News")
    expect(results[0].documentKind).toBe("html")
    expect(results[0].documentText).toBeTruthy()
    expect(results[0].documentText).toContain("main content")
    expect(results[0].documentText).not.toContain("Author:")
    expect(results[0].paragraphs).toHaveLength(2)
    expect(results[0].paragraphs?.[0]).toEqual({
      index: 1,
      text: expect.stringContaining("main content"),
    })
    expect(results[0].paragraphs?.[1]).toEqual({
      index: 2,
      text: expect.stringContaining("second paragraph"),
    })
    expect(results[0].pageContent).toBeTruthy()
    expect(results[0].pageContent).toContain("main content")
    expect(results[0].fullContent).toBeTruthy()
    expect(results[0].fullContent).toContain("main content")
    expect(results[0].fetchMethod).toBe("fetch")
    // Should NOT contain nav/footer
    expect(results[0].pageContent).not.toContain("Navigation")
    expect(results[0].pageContent).not.toContain("Footer content")
  })

  it("keeps paragraph indexing stable for nested block structures", async () => {
    const html = `
      <html>
      <head>
        <title>Nested Article | Example News</title>
        <meta property="og:title" content="Nested Article | Example News" />
      </head>
      <body>
        <article>
          <p>Lead paragraph for the article with enough text to be readable and extracted.</p>
          <blockquote>
            <p>Quoted paragraph that should be counted once, not twice, even though it is nested.</p>
          </blockquote>
          <p>Closing paragraph that confirms the ordering remains stable.</p>
        </article>
      </body>
      </html>
    `
    fetchSpy.mockResolvedValueOnce(
      new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    )

    const results = await fetchPageContent(["https://example.com/nested"])

    expect(results[0].paragraphs).toHaveLength(3)
    expect(results[0].paragraphs?.[0]).toEqual({
      index: 1,
      text: expect.stringContaining("Lead paragraph"),
    })
    expect(results[0].paragraphs?.[1]).toEqual({
      index: 2,
      text: expect.stringContaining("Quoted paragraph"),
    })
    expect(results[0].paragraphs?.[2]).toEqual({
      index: 3,
      text: expect.stringContaining("Closing paragraph"),
    })
  })

  it("preserves granularity inside complex readable blocks", async () => {
    const html = `
      <html>
      <head>
        <title>Complex Block Article | Example News</title>
        <meta property="og:title" content="Complex Block Article | Example News" />
      </head>
      <body>
        <article>
          <p>Opening paragraph that introduces the discussion.</p>
          <blockquote>
            <p>First quoted paragraph inside the blockquote.</p>
            <p>Second quoted paragraph inside the same blockquote.</p>
          </blockquote>
          <ul>
            <li>First list item with important detail.</li>
            <li>Second list item with another detail.</li>
          </ul>
          <p>Final paragraph that closes the section.</p>
        </article>
      </body>
      </html>
    `
    fetchSpy.mockResolvedValueOnce(
      new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    )

    const results = await fetchPageContent(["https://example.com/complex-block"])

    expect(results[0].paragraphs).toHaveLength(6)
    expect(results[0].paragraphs?.map((paragraph) => paragraph.text)).toEqual([
      expect.stringContaining("Opening paragraph"),
      expect.stringContaining("First quoted paragraph"),
      expect.stringContaining("Second quoted paragraph"),
      expect.stringContaining("First list item"),
      expect.stringContaining("Second list item"),
      expect.stringContaining("Final paragraph"),
    ])
  })

  it("does not leak skipped wrapper descendants into paragraph indexing", async () => {
    const html = `
      <html>
      <head>
        <title>Wrapper Noise Article | Example News</title>
        <meta property="og:title" content="Wrapper Noise Article | Example News" />
      </head>
      <body>
        <article>
          <div class="promo">
            <nav>Skip this navigation noise</nav>
            <script>window.__noise = true</script>
            <style>.noise { display: none; }</style>
          </div>
          <p>Only readable paragraph that should survive extraction.</p>
        </article>
      </body>
      </html>
    `
    fetchSpy.mockResolvedValueOnce(
      new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    )

    const results = await fetchPageContent(["https://example.com/wrapper-noise"])

    expect(results[0].paragraphs).toHaveLength(1)
    expect(results[0].paragraphs?.[0]).toEqual({
      index: 1,
      text: expect.stringContaining("Only readable paragraph"),
    })
  })

  it("preserves inline descendant text inside generic wrappers as one block", async () => {
    const html = `
      <html>
      <head>
        <title>Inline Wrapper Article | Example News</title>
        <meta property="og:title" content="Inline Wrapper Article | Example News" />
      </head>
      <body>
        <article>
          <div class="intro">
            Intro with <a href="#">inline link</a>, <strong>strong text</strong>, <em>emphasis</em>, and <code>code</code>.
          </div>
          <p>Second readable paragraph.</p>
        </article>
      </body>
      </html>
    `
    fetchSpy.mockResolvedValueOnce(
      new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    )

    const results = await fetchPageContent(["https://example.com/inline-wrapper"])

    expect(results[0].paragraphs).toHaveLength(2)
    expect(results[0].paragraphs?.[0]).toEqual({
      index: 1,
      text: expect.stringContaining("Intro with inline link, strong text, emphasis, and code."),
    })
    expect(results[0].paragraphs?.[1]).toEqual({
      index: 2,
      text: expect.stringContaining("Second readable paragraph"),
    })
  })

  it("returns null pageContent when page has no article content (non-article page)", async () => {
    const html = `
      <html><head><title>Login Page</title></head>
      <body>
        <nav>Menu</nav>
        <form><input type="text" /><button>Login</button></form>
      </body></html>
    `
    fetchSpy.mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    )

    const results = await fetchPageContent(["https://example.com/login"])

    expect(results[0].pageContent).toBeNull()
    expect(results[0].fullContent).toBeNull()
    expect(results[0].fetchMethod).toBeNull()
    expect(results[0].documentKind).toBe("html")
  })

  it("returns null pageContent when fetch returns non-200", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("Not Found", { status: 404 }),
    )

    const results = await fetchPageContent(["https://example.com/missing"])

    expect(results).toHaveLength(1)
    expect(results[0].pageContent).toBeNull()
    expect(results[0].fullContent).toBeNull()
    expect(results[0].fetchMethod).toBeNull()
    expect(results[0].documentKind).toBe("unknown")
    expect((results[0] as any).failureReason).toBe("http_non_ok")
    expect((results[0] as any).statusCode).toBe(404)
  })

  it("logs enriched requestId and route details for primary successes and failures", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    fetchSpy.mockResolvedValueOnce(
      new Response("<html><body><article><p>Readable content with enough detail for extraction.</p></article></body></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    )

    await fetchPageContent(["https://example.com/article"], { requestId: "chat-123" })

    expect(
      consoleSpy.mock.calls.some(([message]) =>
        typeof message === "string"
        && message.includes("[chat-123] FetchWeb PRIMARY [1/1] ✓")
        && message.includes("route=html_standard"),
      ),
    ).toBe(true)

    consoleSpy.mockClear()
    fetchSpy.mockResolvedValueOnce(
      new Response("Not Found", {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    )

    await fetchPageContent(["https://example.com/missing"], { requestId: "chat-456" })

    expect(
      consoleSpy.mock.calls.some(([message]) =>
        typeof message === "string"
        && message.includes("[chat-456] FetchWeb PRIMARY [1/1] ✗")
        && message.includes("route=html_standard")
        && message.includes("reason=http_non_ok")
        && message.includes("status=404")
        && message.includes("contentType=text/html"),
      ),
    ).toBe(true)

    consoleSpy.mockRestore()
  })

  it("returns null pageContent when fetch throws (network error)", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("ECONNREFUSED"))

    const results = await fetchPageContent(["https://example.com/down"])

    expect(results).toHaveLength(1)
    expect(results[0].pageContent).toBeNull()
    expect(results[0].fullContent).toBeNull()
    expect(results[0].fetchMethod).toBeNull()
    expect(results[0].documentKind).toBe("unknown")
  })

  it("returns pdf_unsupported for PDF/download URLs", async () => {
    fetchSpy.mockImplementation(() => {
      throw new Error("fetch should not be called for pdf_or_download without Tavily")
    })
    const results = await fetchPageContent(["https://example.com/files/paper.pdf"])

    expect(results[0].pageContent).toBeNull()
    expect(results[0].fetchMethod).toBeNull()
    expect((results[0] as any).routeKind).toBe("pdf_or_download")
    expect((results[0] as any).failureReason).toBe("pdf_unsupported")
    expect((results[0] as any).contentType).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("uses the shorter academic timeout before Tavily fallback", async () => {
    vi.useFakeTimers()
    fetchSpy.mockImplementation(() => new Promise(() => {}))

    vi.doMock("@tavily/core", () => ({
      tavily: () => ({
        extract: vi.fn().mockResolvedValue({
          results: [{ url: "https://www.researchgate.net/publication/393260682_ChatGPT_produces_mo", rawContent: "# Academic Extract\n\nFrom Tavily" }],
          failedResults: [],
        }),
      }),
    }))

    const { fetchPageContent: fetchFn } = await import("@/lib/ai/web-search/content-fetcher")

    const pending = fetchFn(
      ["https://www.researchgate.net/publication/393260682_ChatGPT_produces_mo"],
      { tavilyApiKey: "tvly-test-key", timeoutMs: 5000 },
    )

    await vi.advanceTimersByTimeAsync(2100)
    const results = await pending

    expect(results[0].pageContent).toContain("Academic Extract")
    expect(results[0].fetchMethod).toBe("tavily")
    expect((results[0] as any).routeKind).toBe("academic_wall_risk")
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("fails fast for proxy-like URLs with the shorter timeout", async () => {
    vi.useFakeTimers()
    fetchSpy.mockImplementation(() => new Promise(() => {}))

    const pending = fetchPageContent(["https://doi.org/10.1234/example"], { timeoutMs: 5000 })

    await vi.advanceTimersByTimeAsync(900)
    const results = await pending

    expect(results[0].pageContent).toBeNull()
    expect(results[0].fetchMethod).toBeNull()
    expect((results[0] as any).routeKind).toBe("proxy_or_redirect_like")
    expect((results[0] as any).failureReason).toBe("timeout")
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("returns proxy_unresolved for proxy-like URLs that stay on the proxy host", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("<html><body>Proxy shell</body></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    )

    const results = await fetchPageContent(["https://doi.org/10.1234/example"])

    expect(results[0].pageContent).toBeNull()
    expect(results[0].fetchMethod).toBeNull()
    expect((results[0] as any).routeKind).toBe("proxy_or_redirect_like")
    expect((results[0] as any).failureReason).toBe("proxy_unresolved")
  })

  it("handles multiple URLs in parallel", async () => {
    const makeHtml = (title: string) => `
      <html><head><title>${title}</title></head>
      <body><article>
        <h1>${title}</h1>
        <p>Content for ${title}. This article contains enough text for readability to extract it as the main content of the page.</p>
        <p>Additional paragraph with more details about the topic discussed in this particular article.</p>
      </article></body></html>
    `
    fetchSpy
      .mockResolvedValueOnce(new Response(makeHtml("Article 1"), { status: 200, headers: { "content-type": "text/html" } }))
      .mockResolvedValueOnce(new Response(makeHtml("Article 2"), { status: 200, headers: { "content-type": "text/html" } }))
      .mockResolvedValueOnce(new Response(makeHtml("Article 3"), { status: 200, headers: { "content-type": "text/html" } }))

    const results = await fetchPageContent([
      "https://a.com/1",
      "https://b.com/2",
      "https://c.com/3",
    ])

    expect(results).toHaveLength(3)
    expect(results.filter(r => r.pageContent !== null)).toHaveLength(3)
  })

  it("truncates content that exceeds token limit", async () => {
    const longParagraph = "This is a long paragraph of text. ".repeat(2000)
    const html = `
      <html><head><title>Long Article</title></head>
      <body><article>
        <h1>Long Article</h1>
        <p>${longParagraph}</p>
      </article></body></html>
    `
    fetchSpy.mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    )

    const results = await fetchPageContent(["https://example.com/long"])

    expect(results[0].pageContent).toBeTruthy()
    expect(results[0].pageContent!.length).toBeLessThan(15000)
    // fullContent should have the full (untruncated) text
    expect(results[0].fullContent).toBeTruthy()
    expect(results[0].fullContent!.length).toBeGreaterThan(results[0].pageContent!.length)
  })

  it("returns empty array for empty URL list", async () => {
    const results = await fetchPageContent([])
    expect(results).toEqual([])
  })

  it("respects timeout — aborts slow fetches", async () => {
    fetchSpy.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(new Response("late")), 10000)),
    )

    const results = await fetchPageContent(["https://slow.com"], { timeoutMs: 100 })

    expect(results[0].pageContent).toBeNull()
    expect(results[0].fullContent).toBeNull()
    expect(results[0].fetchMethod).toBeNull()
    expect((results[0] as any).failureReason).toBe("timeout")
  })
})

describe("fetchPageContent — Tavily fallback", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.resetModules() // Clear module cache so vi.doMock takes effect on next import
    fetchSpy = vi.spyOn(global, "fetch")
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.unmock("@tavily/core")
  })

  it("falls back to Tavily when primary fetch fails", async () => {
    // Primary fetch fails
    fetchSpy.mockResolvedValueOnce(new Response("Blocked", { status: 403 }))

    // Mock Tavily SDK
    vi.doMock("@tavily/core", () => ({
      tavily: () => ({
        extract: vi.fn().mockResolvedValue({
          results: [{ url: "https://blocked.com/page", rawContent: "# Extracted Content\n\nFrom Tavily" }],
          failedResults: [],
        }),
      }),
    }))

    // Re-import to pick up mock
    const { fetchPageContent: fetchFn } = await import("@/lib/ai/web-search/content-fetcher")

    const results = await fetchFn(
      ["https://blocked.com/page"],
      { tavilyApiKey: "tvly-test-key" },
    )

    expect(results[0].exactMetadataAvailable).toBe(false)
    expect(results[0].rawTitle).toBeNull()
    expect(results[0].title).toBeNull()
    expect(results[0].author).toBeNull()
    expect(results[0].publishedAt).toBeNull()
    expect(results[0].siteName).toBeNull()
    expect(results[0].documentKind).toBe("unknown")
    expect(results[0].pageContent).toContain("Extracted Content")
    expect(results[0].fullContent).toContain("Extracted Content")
    expect(results[0].fetchMethod).toBe("tavily")
    expect(results[0].failureReason).toBeUndefined()
    expect(results[0].statusCode).toBeUndefined()
    expect(results[0].contentType).toBeUndefined()
  })

  it("uses Tavily first for PDF/download URLs when API key is available", async () => {
    fetchSpy.mockImplementation(() => {
      throw new Error("fetch should not be called for pdf_or_download with Tavily")
    })

    const extractSpy = vi.fn().mockResolvedValue({
      results: [
        { url: "https://example.com/files/paper-a.pdf", rawContent: "# PDF A\n\nFrom Tavily" },
        { url: "https://example.com/files/paper-b.pdf", rawContent: "# PDF B\n\nFrom Tavily" },
      ],
      failedResults: [],
    })

    vi.doMock("@tavily/core", () => ({
      tavily: () => ({
        extract: extractSpy,
      }),
    }))

    const { fetchPageContent: fetchFn } = await import("@/lib/ai/web-search/content-fetcher")

    const results = await fetchFn(
      [
        "https://example.com/files/paper-a.pdf",
        "https://example.com/files/paper-b.pdf",
      ],
      { tavilyApiKey: "tvly-test-key" },
    )

    expect(extractSpy).toHaveBeenCalledTimes(1)
    expect(extractSpy).toHaveBeenCalledWith([
      "https://example.com/files/paper-a.pdf",
      "https://example.com/files/paper-b.pdf",
    ], { extractDepth: "basic" })
    expect(results.map((result) => result.fetchMethod)).toEqual(["tavily", "tavily"])
    expect(results[0].pageContent).toContain("PDF A")
    expect(results[1].pageContent).toContain("PDF B")
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("batches Tavily fallback candidates into a single call", async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response("Blocked", { status: 403 }))
      .mockResolvedValueOnce(new Response("Blocked", { status: 403 }))

    const extractSpy = vi.fn().mockResolvedValue({
      results: [
        { url: "https://blocked.com/a", rawContent: "# A\n\nFrom Tavily" },
        { url: "https://blocked.com/b", rawContent: "# B\n\nFrom Tavily" },
      ],
      failedResults: [],
    })

    vi.doMock("@tavily/core", () => ({
      tavily: () => ({
        extract: extractSpy,
      }),
    }))

    const { fetchPageContent: fetchFn } = await import("@/lib/ai/web-search/content-fetcher")

    const results = await fetchFn(
      ["https://blocked.com/a", "https://blocked.com/b"],
      { tavilyApiKey: "tvly-test-key" },
    )

    expect(extractSpy).toHaveBeenCalledTimes(1)
    expect(extractSpy).toHaveBeenCalledWith([
      "https://blocked.com/a",
      "https://blocked.com/b",
    ], { extractDepth: "basic" })
    expect(results.map((result) => result.fetchMethod)).toEqual(["tavily", "tavily"])
    expect(results[0].pageContent).toContain("A")
    expect(results[1].pageContent).toContain("B")
  })

  it("logs Tavily-specific failure reasons instead of reusing primary failure details", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    fetchSpy.mockResolvedValueOnce(new Response("Blocked", { status: 403 }))

    const extractSpy = vi.fn().mockResolvedValue({
      results: [{ url: "https://blocked.com/page", rawContent: null }],
      failedResults: [],
    })

    vi.doMock("@tavily/core", () => ({
      tavily: () => ({
        extract: extractSpy,
      }),
    }))

    const { fetchPageContent: fetchFn } = await import("@/lib/ai/web-search/content-fetcher")
    await fetchFn(["https://blocked.com/page"], { tavilyApiKey: "tvly-test-key", requestId: "chat-789" })

    expect(
      consoleSpy.mock.calls.some(([message]) =>
        typeof message === "string"
        && message.includes("[chat-789] FetchWeb TAVILY [1/1] ✗")
        && message.includes("reason=tavily_no_content")
        && !message.includes("reason=http_non_ok"),
      ),
    ).toBe(true)

    consoleSpy.mockRestore()
  })

  it("skips Tavily when no API key provided", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("Blocked", { status: 403 }))

    // Need fresh import after resetModules
    const { fetchPageContent: fetchFn } = await import("@/lib/ai/web-search/content-fetcher")

    const results = await fetchFn(["https://blocked.com/page"])
    // No tavilyApiKey → no fallback → stays null
    expect(results[0].pageContent).toBeNull()
    expect(results[0].fullContent).toBeNull()
    expect(results[0].fetchMethod).toBeNull()
  })

  it("handles Tavily API failure gracefully", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("Blocked", { status: 403 }))

    vi.doMock("@tavily/core", () => ({
      tavily: () => ({
        extract: vi.fn().mockRejectedValue(new Error("Tavily API down")),
      }),
    }))

    const { fetchPageContent: fetchFn } = await import("@/lib/ai/web-search/content-fetcher")

    const results = await fetchFn(
      ["https://blocked.com/page"],
      { tavilyApiKey: "tvly-test-key" },
    )

    // Should degrade gracefully, not throw
    expect(results[0].pageContent).toBeNull()
  })
})
