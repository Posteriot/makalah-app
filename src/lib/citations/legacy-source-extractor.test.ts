import { describe, expect, it } from "vitest"
import { extractLegacySourcesFromText } from "./legacy-source-extractor"

describe("extractLegacySourcesFromText", () => {
  it("extracts bare URLs and plain domains", () => {
    const text = "Sumber: https://riset.example/artikel-x dan data.gov serta www.stat.test/news."
    const result = extractLegacySourcesFromText(text)

    expect(result.some((item) => item.url.startsWith("https://riset.example"))).toBe(true)
    // bare "data.gov" (no path) is now correctly rejected as ambiguous 2-label domain
    expect(result.some((item) => item.url.startsWith("https://data.gov"))).toBe(false)
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

  it("rejects bare two-label domain without path as ambiguous", () => {
    const text = "Rujuk ke (example.com). untuk versi ringkas."
    const result = extractLegacySourcesFromText(text)

    // bare "example.com" (no path) is rejected — ambiguous during streaming fallback
    expect(result).toEqual([])
  })

  it("does not treat APA n.d token as a source domain in narrative text", () => {
    const result = extractLegacySourcesFromText("IPB University (n.d.) menyoroti isu ini.")
    expect(result).toEqual([])
  })

  it("does not extract n.d token from APA-style reference note", () => {
    const result = extractLegacySourcesFromText("Rujukan APA: (n.d.) dan bukan link web.")
    expect(result).toEqual([])
  })

  it("does not extract ambiguous bare two-label tokens like ambil.ide", () => {
    const text = "Model sering menghasilkan token seperti ambil.ide atau cari.net tanpa konteks URL."
    const result = extractLegacySourcesFromText(text)

    // bare "ambil.ide" and "cari.net" (no path, no protocol) are rejected
    expect(result).toEqual([])
  })

  it("does not extract single-label, local, or malformed hosts", () => {
    const text = "Contoh yang harus ditolak: example localhost:3000 foo_bar.com et.al"
    const result = extractLegacySourcesFromText(text)

    expect(result).toEqual([])
  })
})
