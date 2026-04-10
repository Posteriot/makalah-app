import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { NaskahPage } from "./NaskahPage"
import {
  NASKAH_TITLE_PAGE_ANCHOR_ID,
  NASKAH_TITLE_PAGE_LABEL,
  getNaskahSectionAnchorId,
} from "@/lib/naskah/anchors"
import type {
  NaskahCompiledSnapshot,
  NaskahSection,
} from "@/lib/naskah/types"

// ────────────────────────────────────────────────────────────────────────────
// Fixture builders
// ────────────────────────────────────────────────────────────────────────────

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

function makeAvailableSnapshot(
  overrides: Partial<NaskahCompiledSnapshot> = {},
): NaskahCompiledSnapshot {
  return {
    isAvailable: true,
    title: "Sample Paper",
    titleSource: "topik_definitif",
    sections: [
      makeSection({
        key: "abstrak",
        label: "Abstrak",
        content: "Isi abstrak singkat.",
      }),
    ],
    pageEstimate: 2,
    status: "growing",
    sourceArtifactRefs: [],
    ...overrides,
  }
}

function makeUnavailableSnapshot(
  overrides: Partial<NaskahCompiledSnapshot> = {},
): NaskahCompiledSnapshot {
  return {
    isAvailable: false,
    reasonIfUnavailable: "no_validated_abstrak",
    title: "Paper Tanpa Judul",
    titleSource: "fallback",
    sections: [],
    pageEstimate: 1,
    status: "growing",
    sourceArtifactRefs: [],
    ...overrides,
  }
}

function makeFullSnapshot(): NaskahCompiledSnapshot {
  return makeAvailableSnapshot({
    sections: [
      makeSection({
        key: "abstrak",
        label: "Abstrak",
        content: "Abstrak body.",
      }),
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
      makeSection({
        key: "metodologi",
        label: "Metodologi",
        content: "Metodologi body.",
      }),
      makeSection({
        key: "hasil",
        label: "Hasil",
        content: "Hasil body.",
      }),
      makeSection({
        key: "diskusi",
        label: "Diskusi",
        content: "Diskusi body.",
      }),
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
      makeSection({
        key: "lampiran",
        label: "Lampiran",
        content: "Lampiran body.",
      }),
    ],
  })
}

// ────────────────────────────────────────────────────────────────────────────
// GROUP A — Unavailable state
// Per D-012: Naskah opens normally even when growing. The page is a
// workspace, NOT an error/empty-state app screen. Header stays visible;
// only the sidebar+preview area swaps to a "belum ada section" message.
// ────────────────────────────────────────────────────────────────────────────

describe("NaskahPage — unavailable state", () => {
  it("A1: renders a workspace 'belum ada section' message when no sections are eligible", () => {
    render(
      <NaskahPage
        snapshot={makeUnavailableSnapshot()}
        updatePending={false}
      />,
    )

    expect(
      screen.getByText(/belum ada section/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "Abstrak" }),
    ).not.toBeInTheDocument()
  })

  it("A2: does not render any export controls in the unavailable state", () => {
    render(
      <NaskahPage
        snapshot={makeUnavailableSnapshot()}
        updatePending={false}
      />,
    )

    expect(
      screen.queryByRole("button", { name: /export/i }),
    ).not.toBeInTheDocument()
  })
})

// ────────────────────────────────────────────────────────────────────────────
// GROUP B — Header
// Two-row layout per D-058. Identity label + title on row 1, badge +
// info text + page estimate on row 2. Update banner appears when
// updatePending is true with the "Update" CTA per D-029.
// ────────────────────────────────────────────────────────────────────────────

describe("NaskahPage — header", () => {
  it("B1: header contains both the 'Naskah' identity label and the resolved title", () => {
    render(
      <NaskahPage
        snapshot={makeAvailableSnapshot({ title: "Judul Paper Saya" })}
        updatePending={false}
      />,
    )

    // Scoped to the header so we don't collide with the title page,
    // which also contains the resolved title (per D-024 and D-043 both
    // surfaces show the title).
    const header = screen.getByTestId("naskah-header")
    expect(within(header).getByText(/^naskah$/i)).toBeInTheDocument()
    expect(within(header).getByText("Judul Paper Saya")).toBeInTheDocument()
  })

  it("B2: header contains Bertumbuh badge and progressive info text when status is growing", () => {
    render(
      <NaskahPage
        snapshot={makeAvailableSnapshot({ status: "growing" })}
        updatePending={false}
      />,
    )

    const header = screen.getByTestId("naskah-header")
    expect(within(header).getByText("Bertumbuh")).toBeInTheDocument()
    expect(
      within(header).getByText(
        /naskah sedang bertumbuh seiring section tervalidasi/i,
      ),
    ).toBeInTheDocument()
  })

  it("B3: header renders the page estimate as 'Estimasi N halaman'", () => {
    render(
      <NaskahPage
        snapshot={makeAvailableSnapshot({ pageEstimate: 7 })}
        updatePending={false}
      />,
    )

    const header = screen.getByTestId("naskah-header")
    expect(within(header).getByText(/estimasi 7 halaman/i)).toBeInTheDocument()
  })

  it("B4: header renders an Update button when updatePending is true", () => {
    render(
      <NaskahPage
        snapshot={makeAvailableSnapshot()}
        updatePending={true}
      />,
    )

    const header = screen.getByTestId("naskah-header")
    expect(
      within(header).getByRole("button", { name: /update/i }),
    ).toBeInTheDocument()
  })

  it("B5: clicking the Update button calls onRefresh; absent button when updatePending is false", async () => {
    const onRefresh = vi.fn()

    const { rerender } = render(
      <NaskahPage
        snapshot={makeAvailableSnapshot()}
        updatePending={false}
        onRefresh={onRefresh}
      />,
    )

    expect(
      screen.queryByRole("button", { name: /update/i }),
    ).not.toBeInTheDocument()

    rerender(
      <NaskahPage
        snapshot={makeAvailableSnapshot()}
        updatePending={true}
        onRefresh={onRefresh}
      />,
    )

    const header = screen.getByTestId("naskah-header")
    await act(async () => {
      fireEvent.click(within(header).getByRole("button", { name: /update/i }))
      await Promise.resolve()
    })
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// GROUP C — Sidebar
// First item is "Halaman Judul" per D-052. Then sections in canonical
// academic order. Uses native anchors with href="#section-{key}" so the
// browser handles scroll-to natively. No JS click handler.
// ────────────────────────────────────────────────────────────────────────────

describe("NaskahPage — sidebar", () => {
  it("C1: the first sidebar item is 'Halaman Judul'", () => {
    render(
      <NaskahPage
        snapshot={makeFullSnapshot()}
        updatePending={false}
      />,
    )

    const sidebar = screen.getByTestId("naskah-sidebar")
    const items = within(sidebar).getAllByRole("link")
    expect(items[0]).toHaveTextContent(NASKAH_TITLE_PAGE_LABEL)
  })

  it("C2: sidebar items follow the canonical academic order with academic labels", () => {
    render(
      <NaskahPage
        snapshot={makeFullSnapshot()}
        updatePending={false}
      />,
    )

    const sidebar = screen.getByTestId("naskah-sidebar")
    const labels = within(sidebar)
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

  it("C3: sidebar never renders gagasan / topik / outline (D-051)", () => {
    render(
      <NaskahPage
        snapshot={makeFullSnapshot()}
        updatePending={false}
      />,
    )

    const sidebar = screen.getByTestId("naskah-sidebar")
    const labels = within(sidebar)
      .getAllByRole("link")
      .map((el) => el.textContent?.trim() ?? "")
      .join("|")

    expect(labels).not.toMatch(/gagasan/i)
    expect(labels).not.toMatch(/topik/i)
    expect(labels).not.toMatch(/outline/i)
  })

  it("C4: each sidebar item is an anchor with the conventional href", () => {
    render(
      <NaskahPage
        snapshot={makeFullSnapshot()}
        updatePending={false}
      />,
    )

    const sidebar = screen.getByTestId("naskah-sidebar")
    const items = within(sidebar).getAllByRole("link")

    expect(items[0]).toHaveAttribute(
      "href",
      `#${NASKAH_TITLE_PAGE_ANCHOR_ID}`,
    )
    expect(items[1]).toHaveAttribute(
      "href",
      `#${getNaskahSectionAnchorId("abstrak")}`,
    )
    expect(items[2]).toHaveAttribute(
      "href",
      `#${getNaskahSectionAnchorId("pendahuluan")}`,
    )
    // Spot-check a non-adjacent one to prove the rest follow the convention
    expect(items[8]).toHaveAttribute(
      "href",
      `#${getNaskahSectionAnchorId("daftar_pustaka")}`,
    )
  })
})

// ────────────────────────────────────────────────────────────────────────────
// GROUP D — Preview
// Title page first (D-046, D-052). Each section starts on a new page
// container per D-047/D-048. Section content renders as plain text — NO
// markdown / HTML parsing in phase 1.
// ────────────────────────────────────────────────────────────────────────────

describe("NaskahPage — preview", () => {
  it("D1: the title page appears in DOM order before the Abstrak section heading", () => {
    render(
      <NaskahPage
        snapshot={makeAvailableSnapshot()}
        updatePending={false}
      />,
    )

    const titlePage = screen.getByTestId("naskah-title-page")
    const abstrakHeading = screen.getByRole("heading", { name: "Abstrak" })

    const position = titlePage.compareDocumentPosition(abstrakHeading)
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("D2: every eligible section's heading is rendered with the academic label", () => {
    render(
      <NaskahPage
        snapshot={makeFullSnapshot()}
        updatePending={false}
      />,
    )

    const expectedHeadings = [
      "Abstrak",
      "Pendahuluan",
      "Tinjauan Literatur",
      "Metodologi",
      "Hasil",
      "Diskusi",
      "Kesimpulan",
      "Daftar Pustaka",
      "Lampiran",
    ]

    for (const label of expectedHeadings) {
      expect(
        screen.getByRole("heading", { name: label }),
      ).toBeInTheDocument()
    }
  })

  it("D3: the title page contains the resolved title in a heading-level element", () => {
    render(
      <NaskahPage
        snapshot={makeAvailableSnapshot({ title: "Judul Aktif" })}
        updatePending={false}
      />,
    )

    const titlePage = screen.getByTestId("naskah-title-page")
    expect(
      within(titlePage).getByRole("heading", { name: "Judul Aktif" }),
    ).toBeInTheDocument()
  })
})

// ────────────────────────────────────────────────────────────────────────────
// GROUP E — Export deferral (D-015, plan verification checklist)
// Phase 1 ships with NO active export affordance anywhere on the page.
// ────────────────────────────────────────────────────────────────────────────

describe("NaskahPage — export deferral", () => {
  it("E1: zero export buttons in the available state", () => {
    render(
      <NaskahPage
        snapshot={makeFullSnapshot()}
        updatePending={false}
      />,
    )

    expect(
      screen.queryByRole("button", { name: /export/i }),
    ).not.toBeInTheDocument()
  })
})
