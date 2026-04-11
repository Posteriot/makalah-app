import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { NaskahSidebar } from "./NaskahSidebar"
import {
  NASKAH_TITLE_PAGE_ANCHOR_ID,
  NASKAH_TITLE_PAGE_LABEL,
  getNaskahSectionAnchorId,
} from "@/lib/naskah/anchors"
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

function makeSections(): NaskahSection[] {
  return [
    makeSection({ key: "abstrak", label: "Abstrak", content: "Abstrak body." }),
    makeSection({
      key: "pendahuluan",
      label: "Pendahuluan",
      content: "Pendahuluan body.",
    }),
    makeSection({
      key: "tinjauan_literatur",
      label: "Tinjauan Literatur",
      content: "Tinjauan body.",
    }),
    makeSection({ key: "metodologi", label: "Metodologi", content: "Metodologi body." }),
    makeSection({ key: "hasil", label: "Hasil", content: "Hasil body." }),
    makeSection({ key: "diskusi", label: "Diskusi", content: "Diskusi body." }),
    makeSection({
      key: "kesimpulan",
      label: "Kesimpulan",
      content: "Kesimpulan body.",
    }),
    makeSection({
      key: "daftar_pustaka",
      label: "Daftar Pustaka",
      content: "Daftar pustaka body.",
    }),
    makeSection({ key: "lampiran", label: "Lampiran", content: "Lampiran body." }),
  ]
}

describe("NaskahSidebar", () => {
  it("item pertama selalu Halaman Judul", () => {
    render(<NaskahSidebar sections={makeSections()} />)

    const items = within(screen.getByTestId("naskah-sidebar")).getAllByRole("link")
    expect(items[0]).toHaveTextContent(NASKAH_TITLE_PAGE_LABEL)
  })

  it("mengikuti urutan akademik canonical", () => {
    render(<NaskahSidebar sections={makeSections()} />)

    const labels = within(screen.getByTestId("naskah-sidebar"))
      .getAllByRole("link")
      .map((el) => el.textContent?.trim())

    expect(labels).toEqual([
      NASKAH_TITLE_PAGE_LABEL,
      "Abstrak",
      "Pendahuluan",
      "Tinjauan Literatur",
      "Metodologi",
      "Hasil",
      "Diskusi",
      "Kesimpulan",
      "Daftar Pustaka",
      "Lampiran",
    ])
  })

  it("tidak pernah merender gagasan, topik, atau outline sebagai section", () => {
    render(<NaskahSidebar sections={makeSections()} />)

    const labels = within(screen.getByTestId("naskah-sidebar"))
      .getAllByRole("link")
      .map((el) => el.textContent?.trim() ?? "")
      .join("|")

    expect(labels).not.toMatch(/gagasan/i)
    expect(labels).not.toMatch(/topik/i)
    expect(labels).not.toMatch(/outline/i)
  })

  it("semua item memakai anchor konvensional", () => {
    render(<NaskahSidebar sections={makeSections()} />)

    const items = within(screen.getByTestId("naskah-sidebar")).getAllByRole("link")

    expect(items[0]).toHaveAttribute("href", `#${NASKAH_TITLE_PAGE_ANCHOR_ID}`)
    expect(items[1]).toHaveAttribute(
      "href",
      `#${getNaskahSectionAnchorId("abstrak")}`,
    )
    expect(items[2]).toHaveAttribute(
      "href",
      `#${getNaskahSectionAnchorId("pendahuluan")}`,
    )
    expect(items[8]).toHaveAttribute(
      "href",
      `#${getNaskahSectionAnchorId("daftar_pustaka")}`,
    )
  })
})
