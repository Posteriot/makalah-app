import { describe, expect, it } from "vitest"
import { formatParagraphEndCitations } from "./paragraph-citation-formatter"

describe("formatParagraphEndCitations", () => {
  it("moves citation markers to paragraph end and strips raw URL/domain noise", () => {
    const text = "AI dipakai di sekolah Indonesia menurut laporan terbaru tirto.id https://tirto.id/laporan-123"
    const output = formatParagraphEndCitations({
      text,
      sources: [{ url: "https://tirto.id/laporan-123" }],
      anchors: [{ position: text.length - 1, sourceNumbers: [1] }],
    })

    expect(output).toContain("[1]")
    expect(output).not.toContain("https://tirto.id")
    expect(output).not.toContain("tirto.id ")
  })

  it("groups citations by paragraph so each paragraph gets its own marker set", () => {
    const text = "Paragraf satu tentang kebijakan AI.\n\nParagraf dua tentang tantangan adopsi AI."
    const paraOnePos = text.indexOf("kebijakan")
    const paraTwoPos = text.indexOf("tantangan")

    const output = formatParagraphEndCitations({
      text,
      sources: [
        { url: "https://a.com/1" },
        { url: "https://b.com/2" },
        { url: "https://c.com/3" },
      ],
      anchors: [
        { position: paraOnePos, sourceNumbers: [1] },
        { position: paraTwoPos, sourceNumbers: [2, 3] },
      ],
    })

    const [paragraphOne, paragraphTwo] = output.split("\n\n")
    expect(paragraphOne).toContain("[1]")
    expect(paragraphTwo).toContain("[2,3]")
  })

  it("falls back to last non-empty paragraph when anchor positions are unavailable", () => {
    const text = "Ringkasan dampak AI di sekolah.\n\n"
    const output = formatParagraphEndCitations({
      text,
      sources: [{ url: "https://example.com/a" }, { url: "https://example.com/b" }],
      anchors: [
        { position: null, sourceNumbers: [1] },
        { position: undefined, sourceNumbers: [2] },
      ],
    })

    expect(output).toContain("[1,2]")
  })

  it("distributes citations across bullet points when no anchor positions exist", () => {
    const text = [
      "Manfaat:",
      "- Poin pertama tentang personalisasi belajar.",
      "- Poin kedua tentang efisiensi administrasi.",
      "- Poin ketiga tentang literasi digital.",
    ].join("\n")

    const output = formatParagraphEndCitations({
      text,
      sources: [
        { url: "https://a.com/1" },
        { url: "https://b.com/2" },
        { url: "https://c.com/3" },
      ],
      anchors: [],
    })

    const lines = output.split("\n")
    expect(lines[1]).toContain("[1]")
    expect(lines[2]).toContain("[2]")
    expect(lines[3]).toContain("[3]")
    expect(lines[3]).not.toContain("[1,2,3]")
  })

  it("repositions legacy inline citation markers to line tails", () => {
    const text = [
      "- Tren adopsi AI [1] meningkat stabil di sekolah.",
      "- Implementasi kurikulum AI [2, 3] mulai diuji di kota besar.",
    ].join("\n")

    const output = formatParagraphEndCitations({
      text,
      sources: [
        { url: "https://a.com/1" },
        { url: "https://b.com/2" },
        { url: "https://c.com/3" },
      ],
      anchors: [],
    })

    const lines = output.split("\n")
    expect(lines[0]).toBe("- Tren adopsi AI meningkat stabil di sekolah. [1]")
    expect(lines[1]).toBe("- Implementasi kurikulum AI mulai diuji di kota besar. [2,3]")
  })

  it("preserves domain names inside markdown table cells", () => {
    const text = [
      "| REFERENSI | DOMAIN/SUMBER | FOKUS UTAMA |",
      "| --- | --- | --- |",
      "| {journal.limudata.co.id} | Jurnal Indonesia | Positif: Personalisasi |",
      "| {itb.ac.id} | Universitas ITB | Positif: Aksesibilitas |",
    ].join("\n")

    const output = formatParagraphEndCitations({
      text,
      sources: [
        { url: "https://journal.limudata.co.id/article/123" },
        { url: "https://itb.ac.id/research/456" },
      ],
      anchors: [],
    })

    expect(output).toContain("journal.limudata.co.id")
    expect(output).toContain("itb.ac.id")
  })

  it("removes empty parenthetical artifacts left after hostname stripping", () => {
    const text =
      "Adopsi AI di sekolah meningkat pesat (schoolai.com,) menurut laporan terbaru."
    const output = formatParagraphEndCitations({
      text,
      sources: [{ url: "https://schoolai.com/report/2025" }],
      anchors: [{ position: text.indexOf("meningkat"), sourceNumbers: [1] }],
    })

    expect(output).not.toContain("(,)")
    expect(output).not.toContain("()")
    expect(output).toContain("meningkat pesat")
    expect(output).toContain("[1]")
  })

  it("moves heading-line citations to the nearest content line", () => {
    const text = [
      "Aspek-aspek Penting: [1]",
      "Adopsi AI meningkat di kelas menengah pertama.",
      "",
      "**Tren Adopsi AI di Pendidikan Indonesia 2024-2026** [2]",
      "Pertumbuhan AI di sekolah diproyeksikan naik sampai 2026.",
    ].join("\n")

    const output = formatParagraphEndCitations({
      text,
      sources: [
        { url: "https://a.com/1" },
        { url: "https://b.com/2" },
      ],
      anchors: [],
    })

    const lines = output.split("\n")
    expect(lines[0]).toBe("Aspek-aspek Penting:")
    expect(lines[1]).toBe("Adopsi AI meningkat di kelas menengah pertama. [1]")
    expect(lines[3]).toBe("**Tren Adopsi AI di Pendidikan Indonesia 2024-2026**")
    expect(lines[4]).toBe("Pertumbuhan AI di sekolah diproyeksikan naik sampai 2026. [2]")
  })
})
