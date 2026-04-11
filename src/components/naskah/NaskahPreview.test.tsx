import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { NaskahPreview, stripLeadingDuplicateHeading } from "./NaskahPreview"
import type { NaskahSection } from "@/lib/naskah/types"

function makeSection(
  overrides: Partial<NaskahSection> & { key: NaskahSection["key"] },
): NaskahSection {
  return {
    label: "Abstrak" as NaskahSection["label"],
    content: "Lorem ipsum.",
    sourceStage: overrides.key,
    sourceArtifactId: undefined,
    ...overrides,
  } as NaskahSection
}

// ────────────────────────────────────────────────────────────────────────────
// Unit tests for stripLeadingDuplicateHeading
// Pure function — no React. Each case exercises one branching condition.
// ────────────────────────────────────────────────────────────────────────────

describe("stripLeadingDuplicateHeading", () => {
  it("strips a leading # heading that matches the section label", () => {
    const input = "# Pendahuluan\n\n## Latar Belakang\nBody."
    const result = stripLeadingDuplicateHeading(input, "Pendahuluan")
    expect(result).toBe("## Latar Belakang\nBody.")
  })

  it("is case-insensitive on the label match", () => {
    const input = "# PENDAHULUAN\nBody."
    const result = stripLeadingDuplicateHeading(input, "Pendahuluan")
    expect(result).toBe("Body.")
  })

  it("preserves content when the first line is not a level-1 heading", () => {
    const input = "## Latar Belakang\nBody."
    const result = stripLeadingDuplicateHeading(input, "Pendahuluan")
    expect(result).toBe(input)
  })

  it("preserves content when the first heading does not match the label", () => {
    const input = "# Lain\nBody."
    const result = stripLeadingDuplicateHeading(input, "Pendahuluan")
    expect(result).toBe(input)
  })

  it("preserves content when there is no leading heading at all", () => {
    const input = "Penelitian ini bertujuan..."
    const result = stripLeadingDuplicateHeading(input, "Abstrak")
    expect(result).toBe(input)
  })

  it("skips leading blank lines before checking the first heading", () => {
    const input = "\n\n# Pendahuluan\nBody."
    const result = stripLeadingDuplicateHeading(input, "Pendahuluan")
    expect(result).toBe("Body.")
  })

  it("strips blank lines immediately after the removed heading", () => {
    const input = "# Pendahuluan\n\n\nBody paragraph."
    const result = stripLeadingDuplicateHeading(input, "Pendahuluan")
    expect(result).toBe("Body paragraph.")
  })

  it("handles empty content defensively", () => {
    const result = stripLeadingDuplicateHeading("", "Pendahuluan")
    expect(result).toBe("")
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Integration tests — real MarkdownRenderer mounted inside NaskahPreview.
// These prove the end-to-end contract:
//   - markdown syntax is parsed, not rendered as raw text
//   - inline formatting (bold, italic) produces strong/em elements
//   - subsection h2 headings render
//   - duplicate leading heading is stripped
// ────────────────────────────────────────────────────────────────────────────

describe("NaskahPreview — markdown rendering", () => {
  it("renders inline bold and italic from markdown", () => {
    render(
      <NaskahPreview
        title="Paper Test"
        sections={[
          makeSection({
            key: "abstrak",
            label: "Abstrak",
            content:
              "Penelitian ini mengeksplorasi *chatbot* dan **Kata Kunci** sebagai topik utama.",
          }),
        ]}
      />,
    )

    // Italic *chatbot* → <em>
    const emEl = screen.getByText("chatbot")
    expect(emEl.tagName).toBe("EM")

    // Bold **Kata Kunci** → <strong>
    const strongEl = screen.getByText("Kata Kunci")
    expect(strongEl.tagName).toBe("STRONG")
  })

  it("renders subsection h2 headings from markdown without raw ## syntax", () => {
    render(
      <NaskahPreview
        title="Paper Test"
        sections={[
          makeSection({
            key: "pendahuluan",
            label: "Pendahuluan",
            content: "## Latar Belakang\n\nBody of the latar belakang.",
          }),
        ]}
      />,
    )

    // The `## Latar Belakang` raw syntax must NOT appear in the DOM text
    expect(screen.queryByText(/^## Latar Belakang$/)).not.toBeInTheDocument()

    // And a real <h2> with that name must exist
    const heading = screen.getByRole("heading", { name: "Latar Belakang" })
    expect(heading.tagName).toBe("H2")
  })

  it("renders ordered lists as <ol>", () => {
    render(
      <NaskahPreview
        title="Paper Test"
        sections={[
          makeSection({
            key: "pendahuluan",
            label: "Pendahuluan",
            content:
              "1. Pertanyaan pertama tentang desain.\n2. Pertanyaan kedua tentang faktor kunci.",
          }),
        ]}
      />,
    )

    const list = screen.getByRole("list")
    expect(list.tagName).toBe("OL")
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent("Pertanyaan pertama tentang desain.")
    expect(items[1]).toHaveTextContent("Pertanyaan kedua tentang faktor kunci.")
  })

  it("strips a duplicate leading heading that matches the section label", () => {
    render(
      <NaskahPreview
        title="Paper Test"
        sections={[
          makeSection({
            key: "pendahuluan",
            label: "Pendahuluan",
            content:
              "# Pendahuluan\n\n## Latar Belakang\n\nBody.",
          }),
        ]}
      />,
    )

    // Only one heading named "Pendahuluan" should exist: the section
    // label rendered by NaskahPreview's own <h2>. The markdown's redundant
    // `# Pendahuluan` must have been stripped before render.
    const pendahuluanHeadings = screen.getAllByRole("heading", {
      name: "Pendahuluan",
    })
    expect(pendahuluanHeadings).toHaveLength(1)
    expect(pendahuluanHeadings[0].tagName).toBe("H2")
  })

  it("renders plain-text content as a paragraph without markdown artifacts", () => {
    render(
      <NaskahPreview
        title="Paper Test"
        sections={[
          makeSection({
            key: "abstrak",
            label: "Abstrak",
            content: "Penelitian ini bertujuan untuk mengeksplorasi.",
          }),
        ]}
      />,
    )

    expect(
      screen.getByText("Penelitian ini bertujuan untuk mengeksplorasi."),
    ).toBeInTheDocument()
  })
})
