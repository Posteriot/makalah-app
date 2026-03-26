import { describe, expect, it } from "vitest"
import { deriveSiteNameFromUrl, getApaWebReferenceParts, normalizeWebSearchUrl } from "./apaWeb"

describe("apaWeb display guards", () => {
  it("returns a safe fallback for n.d token instead of fake domain label", () => {
    const site = deriveSiteNameFromUrl("n.d")
    expect(site).toBe("Situs web")
    expect(site).not.toBe("N.d")
  })

  it("keeps valid domain labels for real URLs", () => {
    const site = deriveSiteNameFromUrl("https://example.com/path")
    expect(site).toBe("Example")
  })

  it("does not output fake domain-like author/site values for n.d sources", () => {
    const parts = getApaWebReferenceParts({ url: "n.d", title: "n.d" })
    expect(parts.author).toBe("Situs web")
    expect(parts.author).not.toMatch(/^[a-z]\.[a-z]$/i)
    expect(parts.siteName ?? "").not.toMatch(/^[a-z]\.[a-z]$/i)
  })

  it("normalizes valid URL with trailing punctuation", () => {
    const normalized = normalizeWebSearchUrl("https://example.com/article).")
    expect(normalized).toBe("https://example.com/article")
  })
})
