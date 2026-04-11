import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type {
  NaskahCompiledSnapshot,
  NaskahSection,
  NaskahSectionKey,
} from "@/lib/naskah/types"
import { NaskahPage } from "./NaskahPage"

function makeSection(
  key: NaskahSectionKey,
  label: string,
  content: string,
): NaskahSection {
  return {
    key,
    label: label as NaskahSection["label"],
    content,
    sourceStage: key,
  }
}

function makeSnapshot(args?: {
  revision?: number
  title?: string
  sections?: NaskahSection[]
}): NaskahCompiledSnapshot & { revision: number } {
  return {
    revision: args?.revision ?? 3,
    isAvailable: true,
    title: args?.title ?? "Judul Revisi 3",
    titleSource: "paper_title",
    sections:
      args?.sections ??
      [makeSection("abstrak", "Abstrak", "Isi abstrak revisi 3")],
    pageEstimate: 2,
    status: "growing",
    sourceArtifactRefs: [],
  }
}

describe("NaskahPage manual refresh flow", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("menampilkan banner update saat updatePending true", () => {
    render(
      <NaskahPage
        snapshot={makeSnapshot()}
        updatePending={true}
        onRefresh={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: /update/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/versi naskah terbaru tersedia/i),
    ).toBeInTheDocument()
  })

  it("masuk dari Chat tidak otomatis mengonsumsi pending state (visible tetap di viewed revision)", () => {
    // D-018 contract: route passes snapshot=viewedSnapshot (rev3) and
    // latestSnapshot=rev4 when updatePending is true. NaskahPage must
    // render the viewed revision, not the latest.
    const revision3 = makeSnapshot({
      revision: 3,
      title: "Judul Revisi 3",
      sections: [makeSection("abstrak", "Abstrak", "Isi abstrak revisi 3")],
    })
    const revision4 = makeSnapshot({
      revision: 4,
      title: "Judul Revisi 4",
      sections: [makeSection("abstrak", "Abstrak", "Isi abstrak revisi 4")],
    })

    render(
      <NaskahPage
        snapshot={revision3}
        latestSnapshot={revision4}
        updatePending={true}
        onRefresh={vi.fn()}
      />,
    )

    const header = screen.getByTestId("naskah-header")
    expect(within(header).getByText("Judul Revisi 3")).toBeInTheDocument()
    expect(screen.getByText("Isi abstrak revisi 3")).toBeInTheDocument()
    expect(within(header).queryByText("Judul Revisi 4")).not.toBeInTheDocument()
    expect(screen.queryByText("Isi abstrak revisi 4")).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /update/i }),
    ).toBeInTheDocument()
  })

  it("defensive: prop swap ke revision baru saat updatePending=true tetap ditahan", () => {
    // Regression: if upstream race ever passes a newer snapshot prop
    // while updatePending is still true, the component must NOT swap
    // visible. This covers the scenario where the route gets out of
    // sync with the hook for one render cycle.
    const revision3 = makeSnapshot({
      revision: 3,
      title: "Judul Revisi 3",
      sections: [makeSection("abstrak", "Abstrak", "Isi abstrak revisi 3")],
    })
    const revision4 = makeSnapshot({
      revision: 4,
      title: "Judul Revisi 4",
      sections: [makeSection("abstrak", "Abstrak", "Isi abstrak revisi 4")],
    })

    const { rerender } = render(
      <NaskahPage
        snapshot={revision3}
        updatePending={false}
        onRefresh={vi.fn()}
      />,
    )

    rerender(
      <NaskahPage
        snapshot={revision4}
        updatePending={true}
        onRefresh={vi.fn()}
      />,
    )

    const header = screen.getByTestId("naskah-header")
    expect(within(header).getByText("Judul Revisi 3")).toBeInTheDocument()
    expect(screen.getByText("Isi abstrak revisi 3")).toBeInTheDocument()
    expect(within(header).queryByText("Judul Revisi 4")).not.toBeInTheDocument()
  })

  it("klik Update memanggil refresh, memuat snapshot terbaru, dan menyorot section yang berubah", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    const onSidebarStateChange = vi.fn()
    const revision3 = makeSnapshot({
      revision: 3,
      title: "Judul Revisi 3",
      sections: [
        makeSection("abstrak", "Abstrak", "Isi abstrak revisi 3"),
        makeSection("pendahuluan", "Pendahuluan", "Pendahuluan revisi 3"),
      ],
    })
    const revision4 = makeSnapshot({
      revision: 4,
      title: "Judul Revisi 4",
      sections: [
        makeSection("abstrak", "Abstrak", "Isi abstrak revisi 4"),
        makeSection("pendahuluan", "Pendahuluan", "Pendahuluan revisi 3"),
      ],
    })

    render(
      <NaskahPage
        snapshot={revision3}
        latestSnapshot={revision4}
        updatePending={true}
        onRefresh={onRefresh}
        onSidebarStateChange={onSidebarStateChange}
      />,
    )

    // Sanity: still showing revision 3 before click.
    const headerBefore = screen.getByTestId("naskah-header")
    expect(within(headerBefore).getByText("Judul Revisi 3")).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /update/i }))
      await Promise.resolve()
    })

    expect(onRefresh).toHaveBeenCalledTimes(1)
    const header = screen.getByTestId("naskah-header")
    expect(within(header).getByText("Judul Revisi 4")).toBeInTheDocument()
    expect(screen.getByText("Isi abstrak revisi 4")).toBeInTheDocument()
    expect(screen.queryByText("Isi abstrak revisi 3")).not.toBeInTheDocument()
    expect(onSidebarStateChange.mock.calls.at(-1)?.[0]).toMatchObject({
      isAvailable: true,
      sections: revision4.sections,
      highlightedSectionKeys: ["abstrak"],
    })
  })

  it("highlight changed section hilang sementara setelah timeout selesai", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    const onSidebarStateChange = vi.fn()
    const revision3 = makeSnapshot({
      revision: 3,
      sections: [makeSection("abstrak", "Abstrak", "Isi abstrak revisi 3")],
    })
    const revision4 = makeSnapshot({
      revision: 4,
      sections: [makeSection("abstrak", "Abstrak", "Isi abstrak revisi 4")],
    })

    render(
      <NaskahPage
        snapshot={revision3}
        latestSnapshot={revision4}
        updatePending={true}
        onRefresh={onRefresh}
        onSidebarStateChange={onSidebarStateChange}
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /update/i }))
      await Promise.resolve()
    })

    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(onSidebarStateChange.mock.calls.at(-1)?.[0]).toMatchObject({
      highlightedSectionKeys: ["abstrak"],
    })

    await act(async () => {
      vi.advanceTimersByTime(3_000)
    })

    expect(onSidebarStateChange.mock.calls.at(-1)?.[0]).toMatchObject({
      highlightedSectionKeys: [],
    })
  })
})
