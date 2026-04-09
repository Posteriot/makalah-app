import { describe, expect, it, vi } from "vitest"
import {
  resolveExactSourceFollowup,
  type ExactSourceSummary,
} from "./exact-source-followup"

vi.mock("./classifiers/exact-source-classifier", () => ({
  classifyExactSourceIntent: vi.fn(),
}))

const mockModel = { modelId: "test-model" } as import("ai").LanguageModel

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

async function mockClassifier(output: Record<string, unknown>) {
  const mod = await import("./classifiers/exact-source-classifier")
  vi.mocked(mod.classifyExactSourceIntent).mockResolvedValueOnce({
    output,
    metadata: { classifierVersion: "1.0.0" },
  } as Awaited<ReturnType<typeof mod.classifyExactSourceIntent>>)
}

async function mockClassifierNull() {
  const mod = await import("./classifiers/exact-source-classifier")
  vi.mocked(mod.classifyExactSourceIntent).mockResolvedValueOnce(null)
}

describe("resolveExactSourceFollowup", () => {
  it("returns force-inspect when classifier detects exact_detail and title matches uniquely", async () => {
    await mockClassifier({
      mode: "force_inspect", sourceIntent: "exact_detail",
      mentionedSourceHint: "Ketergantungan Pelajar",
      needsClarification: false, confidence: 0.9, reason: "title match",
    })

    const result = await resolveExactSourceFollowup({
      lastUserMessage: "Siapa penulis artikel Ketergantungan Pelajar dan Mahasiswa terhadap ChatGPT?",
      recentMessages: [], availableExactSources, model: mockModel,
    })

    expect(result.mode).toBe("force-inspect")
    if (result.mode === "force-inspect") expect(result.matchedSource.sourceId).toBe("source-berita-magelang")
  })

  it("returns force-inspect when classifier provides domain hint", async () => {
    await mockClassifier({
      mode: "force_inspect", sourceIntent: "exact_detail",
      mentionedSourceHint: "detikEdu",
      needsClarification: false, confidence: 0.85, reason: "domain hint",
    })

    const result = await resolveExactSourceFollowup({
      lastUserMessage: "Apa judul lengkap artikel dari detikEdu itu?",
      recentMessages: [],
      availableExactSources: availableExactSources.filter((s) => s.sourceId !== "source-berita-magelang-2"),
      model: mockModel,
    })

    expect(result.mode).toBe("force-inspect")
    if (result.mode === "force-inspect") expect(result.matchedSource.sourceId).toBe("source-detik")
  })

  it("resolves from recent context for continuation intent", async () => {
    await mockClassifier({
      mode: "force_inspect", sourceIntent: "continuation",
      mentionedSourceHint: null,
      needsClarification: false, confidence: 0.8, reason: "continuation",
    })

    const result = await resolveExactSourceFollowup({
      lastUserMessage: "lengkapnya?",
      recentMessages: [
        { role: "user", content: "Apa judul artikel Ketergantungan Pelajar dan Mahasiswa terhadap ChatGPT?" },
        { role: "assistant", content: "Judulnya belum lengkap." },
      ],
      availableExactSources, model: mockModel,
    })

    expect(result.mode).toBe("force-inspect")
    if (result.mode === "force-inspect") expect(result.matchedSource.sourceId).toBe("source-berita-magelang")
  })

  it("returns clarify when multiple sources match", async () => {
    await mockClassifier({
      mode: "clarify", sourceIntent: "exact_detail",
      mentionedSourceHint: "Berita Magelang",
      needsClarification: true, confidence: 0.85, reason: "ambiguous",
    })

    const result = await resolveExactSourceFollowup({
      lastUserMessage: "Apa judul lengkap artikel Berita Magelang itu?",
      recentMessages: [], availableExactSources, model: mockModel,
    })

    expect(result.mode).toBe("clarify")
  })

  it("returns clarify when exact intent but no source matches", async () => {
    await mockClassifier({
      mode: "force_inspect", sourceIntent: "exact_detail",
      mentionedSourceHint: "ChatGPT sebagai Asisten Belajar",
      needsClarification: false, confidence: 0.85, reason: "specific article",
    })

    const result = await resolveExactSourceFollowup({
      lastUserMessage: 'Sebutkan verbatim paragraf dari artikel: "ChatGPT sebagai Asisten Belajar Siswa SD"',
      recentMessages: [], availableExactSources, model: mockModel,
    })

    expect(result.mode).toBe("clarify")
    if (result.mode === "clarify") expect(result.reason).toBe("exact-intent-without-unique-source")
  })

  it("returns none for summary intent", async () => {
    await mockClassifier({
      mode: "none", sourceIntent: "summary",
      mentionedSourceHint: null,
      needsClarification: false, confidence: 0.9, reason: "summary request",
    })

    const result = await resolveExactSourceFollowup({
      lastUserMessage: "Coba ringkas isi sumber tadi.",
      recentMessages: [], availableExactSources, model: mockModel,
    })

    expect(result.mode).toBe("none")
  })

  it("returns none when classifier fails", async () => {
    await mockClassifierNull()
    const result = await resolveExactSourceFollowup({
      lastUserMessage: "Siapa penulisnya?",
      recentMessages: [], availableExactSources, model: mockModel,
    })
    expect(result.mode).toBe("none")
    expect(result.reason).toBe("classifier-error")
  })

  it("returns none when no model provided", async () => {
    const result = await resolveExactSourceFollowup({
      lastUserMessage: "Siapa penulisnya?",
      recentMessages: [], availableExactSources,
    })
    expect(result.mode).toBe("none")
    expect(result.reason).toBe("no-model-available")
  })

  it("returns none for empty message", async () => {
    const result = await resolveExactSourceFollowup({
      lastUserMessage: "", recentMessages: [], availableExactSources, model: mockModel,
    })
    expect(result.mode).toBe("none")
    expect(result.reason).toBe("empty-user-message")
  })

  it("disambiguates by URL specificity when galley URL matches both portal root and article source", async () => {
    const ojsSources: ExactSourceSummary[] = [
      {
        sourceId: "https://journal.unpas.ac.id/",
        originalUrl: "https://journal.unpas.ac.id/",
        resolvedUrl: "https://journal.unpas.ac.id/",
        title: "Portal Jurnal UNPAS",
      },
      {
        sourceId: "https://journal.unpas.ac.id/index.php/pendas/article/view/32777",
        originalUrl: "https://journal.unpas.ac.id/index.php/pendas/article/view/32777",
        resolvedUrl: "https://journal.unpas.ac.id/index.php/pendas/article/view/32777",
        title: "Penggunaan AI dalam Pendidikan",
      },
    ]

    await mockClassifier({
      mode: "force_inspect", sourceIntent: "exact_detail",
      mentionedSourceHint: null,
      needsClarification: false, confidence: 0.9, reason: "URL match",
    })

    const result = await resolveExactSourceFollowup({
      lastUserMessage: "Siapa penulis artikel https://journal.unpas.ac.id/index.php/pendas/article/view/32777/16455?",
      recentMessages: [], availableExactSources: ojsSources, model: mockModel,
    })

    expect(result.mode).toBe("force-inspect")
    if (result.mode === "force-inspect") {
      expect(result.matchedSource.sourceId).toBe(
        "https://journal.unpas.ac.id/index.php/pendas/article/view/32777"
      )
    }
  })
})
