import { describe, expect, it } from "vitest"
import {
  resolveExactSourceFollowup,
  type ExactSourceSummary,
} from "./exact-source-followup"

const availableExactSources: ExactSourceSummary[] = [
  {
    sourceId: "source-berita-magelang",
    originalUrl: "https://www.beritamagelang.id/kolom/ketergantungan-pelajar",
    resolvedUrl: "https://www.beritamagelang.id/kolom/ketergantungan-pelajar",
    title: "Ketergantungan Pelajar dan Mahasiswa terhadap ChatGPT",
    siteName: "Berita Magelang",
    author: "Penulis A",
    publishedAt: "2026-03-20",
  },
  {
    sourceId: "source-detik",
    originalUrl: "https://www.detik.com/edu/detikpedia/d-8202129/pakar-ipb-ingatkan-risiko",
    resolvedUrl: "https://www.detik.com/edu/detikpedia/d-8202129/pakar-ipb-ingatkan-risiko",
    title: "Pakar IPB Ingatkan Risiko ChatGPT bagi Pelajar",
    siteName: "detikEdu",
    author: "Penulis B",
    publishedAt: "2026-03-21",
  },
  {
    sourceId: "source-berita-magelang-2",
    originalUrl: "https://www.beritamagelang.id/kolom/lainnya",
    resolvedUrl: "https://www.beritamagelang.id/kolom/lainnya",
    title: "Artikel Lain Berita Magelang",
    siteName: "Berita Magelang",
    author: "Penulis C",
    publishedAt: "2026-03-22",
  },
]

describe("resolveExactSourceFollowup", () => {
  it("returns force-inspect when exact title mention matches one source uniquely", () => {
    const result = resolveExactSourceFollowup({
      lastUserMessage: "Siapa penulis artikel Ketergantungan Pelajar dan Mahasiswa terhadap ChatGPT?",
      recentMessages: [],
      availableExactSources,
    })

    expect(result.mode).toBe("force-inspect")
    if (result.mode !== "force-inspect") {
      throw new Error(`expected force-inspect, got ${result.mode}`)
    }
    expect(result.matchedSource.sourceId).toBe("source-berita-magelang")
  })

  it("returns force-inspect when site/domain mention matches one source uniquely", () => {
    const result = resolveExactSourceFollowup({
      lastUserMessage: "Apa judul lengkap artikel dari detikEdu itu?",
      recentMessages: [],
      availableExactSources: availableExactSources.filter(
        (source) => source.sourceId !== "source-berita-magelang-2"
      ),
    })

    expect(result.mode).toBe("force-inspect")
    if (result.mode !== "force-inspect") {
      throw new Error(`expected force-inspect, got ${result.mode}`)
    }
    expect(result.matchedSource.sourceId).toBe("source-detik")
  })

  it("uses prior exact-source context for short continuation prompts", () => {
    const result = resolveExactSourceFollowup({
      lastUserMessage: "lengkapnya?",
      recentMessages: [
        {
          role: "user",
          content: "Apa judul artikel Ketergantungan Pelajar dan Mahasiswa terhadap ChatGPT?",
        },
        {
          role: "assistant",
          content: "Judulnya belum lengkap.",
        },
      ],
      availableExactSources,
    })

    expect(result.mode).toBe("force-inspect")
    if (result.mode !== "force-inspect") {
      throw new Error(`expected force-inspect, got ${result.mode}`)
    }
    expect(result.matchedSource.sourceId).toBe("source-berita-magelang")
  })

  it("uses prior exact-source context for natural continuation phrasing", () => {
    const result = resolveExactSourceFollowup({
      lastUserMessage: "Itu tidak lengkap. Lengkapnya?",
      recentMessages: [
        {
          role: "user",
          content: "Apa judul artikel Ketergantungan Pelajar dan Mahasiswa terhadap ChatGPT?",
        },
        {
          role: "assistant",
          content: "Judulnya belum lengkap.",
        },
      ],
      availableExactSources,
    })

    expect(result.mode).toBe("force-inspect")
    if (result.mode !== "force-inspect") {
      throw new Error(`expected force-inspect, got ${result.mode}`)
    }
    expect(result.matchedSource.sourceId).toBe("source-berita-magelang")
  })

  it("returns clarify when exact intent is present but source match is ambiguous", () => {
    const result = resolveExactSourceFollowup({
      lastUserMessage: "Apa judul lengkap artikel Berita Magelang itu?",
      recentMessages: [],
      availableExactSources,
    })

    expect(result.mode).toBe("clarify")
    if (result.mode !== "clarify") {
      throw new Error(`expected clarify, got ${result.mode}`)
    }
  })

  it("returns none for non exact follow-up prompts", () => {
    const result = resolveExactSourceFollowup({
      lastUserMessage: "Coba ringkas isi sumber tadi.",
      recentMessages: [],
      availableExactSources,
    })

    expect(result).toEqual({
      mode: "none",
      reason: "not-an-exact-source-request",
    })
  })
})
