import { describe, expect, it } from "vitest"
import { extractLegacySourcesFromText } from "./legacy-source-extractor"

describe("extractLegacySourcesFromText", () => {
  it("extracts bare URLs and plain domains", () => {
    const text = "Sumber: https://riset.example/artikel-x dan data.gov serta www.stat.test/news."
    const result = extractLegacySourcesFromText(text)

    expect(result.some((item) => item.url.startsWith("https://riset.example"))).toBe(true)
    expect(result.some((item) => item.url.startsWith("https://data.gov"))).toBe(true)
    expect(result.some((item) => item.url.startsWith("https://www.stat.test"))).toBe(true)
  })

  it("deduplicates repeated mentions", () => {
    const text = "riset.example lalu riset.example lagi dan https://riset.example"
    const result = extractLegacySourcesFromText(text)
    expect(result.length).toBe(1)
  })
})
