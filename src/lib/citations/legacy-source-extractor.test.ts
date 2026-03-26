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

  it("keeps multi-level subdomains and query strings from bare domains", () => {
    const text = "Bandingkan sub.domain.co.id/path?q=1&lang=id untuk detailnya."
    const result = extractLegacySourcesFromText(text)

    expect(result).toEqual([
      {
        url: "https://sub.domain.co.id/path?q=1&lang=id",
        title: "sub.domain.co.id",
      },
    ])
  })

  it("keeps common research host paths like arxiv and doi", () => {
    const text = "Lihat arxiv.org/abs/2301.12345 dan doi.org/10.1000/182."
    const result = extractLegacySourcesFromText(text)

    expect(result).toEqual([
      {
        url: "https://arxiv.org/abs/2301.12345",
        title: "arxiv.org",
      },
      {
        url: "https://doi.org/10.1000/182",
        title: "doi.org",
      },
    ])
  })

  it("strips surrounding punctuation while keeping a valid bare domain", () => {
    const text = "Rujuk ke (example.com). untuk versi ringkas."
    const result = extractLegacySourcesFromText(text)

    expect(result).toEqual([
      {
        url: "https://example.com/",
        title: "example.com",
      },
    ])
  })

  it("does not treat APA n.d token as a source domain in narrative text", () => {
    const result = extractLegacySourcesFromText("IPB University (n.d.) menyoroti isu ini.")
    expect(result).toEqual([])
  })

  it("does not extract n.d token from APA-style reference note", () => {
    const result = extractLegacySourcesFromText("Rujukan APA: (n.d.) dan bukan link web.")
    expect(result).toEqual([])
  })

  it("does not extract single-label, local, or malformed hosts", () => {
    const text = "Contoh yang harus ditolak: example localhost:3000 foo_bar.com et.al"
    const result = extractLegacySourcesFromText(text)

    expect(result).toEqual([])
  })
})
