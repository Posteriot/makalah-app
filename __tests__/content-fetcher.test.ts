import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fetchPageContent } from "@/lib/ai/web-search/content-fetcher"

describe("fetchPageContent", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch")
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    vi.clearAllMocks()
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
    expect(results[0].title).toBe("Test Article")
    expect(results[0].author).toBe("Jane Doe")
    expect(results[0].publishedAt).toBe("2026-03-23T10:00:00Z")
    expect(results[0].siteName).toBe("Example News")
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
  })

  it("returns null pageContent when fetch throws (network error)", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("ECONNREFUSED"))

    const results = await fetchPageContent(["https://example.com/down"])

    expect(results).toHaveLength(1)
    expect(results[0].pageContent).toBeNull()
    expect(results[0].fullContent).toBeNull()
    expect(results[0].fetchMethod).toBeNull()
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

    expect(results[0].pageContent).toContain("Extracted Content")
    expect(results[0].fullContent).toContain("Extracted Content")
    expect(results[0].fetchMethod).toBe("tavily")
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
