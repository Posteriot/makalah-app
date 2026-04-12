import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NaskahSidebarContainer } from "./NaskahSidebarContainer"
import type { NaskahSection } from "@/lib/naskah/types"

const mockPush = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock("@/components/billing/CreditMeter", () => ({
  CreditMeter: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" data-testid="credit-meter" onClick={onClick}>
      credit-meter
    </button>
  ),
}))

vi.mock("@/components/layout/header/UserDropdown", () => ({
  UserDropdown: () => <div data-testid="user-dropdown" />,
}))

function makeSections(): NaskahSection[] {
  return [
    {
      key: "abstrak",
      label: "Abstrak",
      content: "Isi abstrak.",
      sourceStage: "abstrak",
    },
    {
      key: "pendahuluan",
      label: "Pendahuluan",
      content: "Isi pendahuluan.",
      sourceStage: "pendahuluan",
    },
  ]
}

describe("NaskahSidebarContainer", () => {
  beforeEach(() => {
    mockPush.mockReset()
  })

  it("merender wrapper aside dengan kelas sejajar ChatSidebar", () => {
    render(<NaskahSidebarContainer sections={makeSections()} />)

    const container = screen.getByTestId("naskah-sidebar-container")
    expect(container).toBeInTheDocument()
    expect(container.tagName).toBe("ASIDE")
    expect(container).toHaveClass(
      "flex",
      "h-full",
      "min-h-0",
      "w-full",
      "flex-col",
      "border-r",
      "border-[color:var(--chat-sidebar-border)]",
      "bg-[var(--chat-accent)]",
    )
  })

  it("merender tombol collapse hanya saat onCollapseSidebar diberikan", () => {
    const { rerender } = render(
      <NaskahSidebarContainer sections={makeSections()} />,
    )

    expect(
      screen.queryByRole("button", { name: /collapse sidebar/i }),
    ).not.toBeInTheDocument()

    const onCollapseSidebar = vi.fn()
    rerender(
      <NaskahSidebarContainer
        sections={makeSections()}
        onCollapseSidebar={onCollapseSidebar}
      />,
    )

    const collapseButton = screen.getByRole("button", {
      name: /collapse sidebar/i,
    })
    expect(collapseButton).toBeInTheDocument()

    fireEvent.click(collapseButton)
    expect(onCollapseSidebar).toHaveBeenCalledTimes(1)
  })

  it("merender NaskahSidebar dengan sections dan highlights yang diberikan", () => {
    render(
      <NaskahSidebarContainer
        sections={makeSections()}
        highlightedSectionKeys={["abstrak"]}
      />,
    )

    const sidebar = screen.getByTestId("naskah-sidebar")
    const abstrakLink = within(sidebar).getByRole("link", { name: "Abstrak" })
    const pendahuluanLink = within(sidebar).getByRole("link", {
      name: "Pendahuluan",
    })

    expect(abstrakLink).toHaveAttribute("data-changed", "true")
    expect(pendahuluanLink).toHaveAttribute("data-changed", "false")
  })

  it("merender footer dengan CreditMeter yang navigate ke subscription overview saat diklik", () => {
    render(<NaskahSidebarContainer sections={makeSections()} />)

    const footer = screen.getByTestId("naskah-sidebar-footer")
    expect(footer).toBeInTheDocument()

    const creditMeter = within(footer).getByTestId("credit-meter")
    fireEvent.click(creditMeter)
    expect(mockPush).toHaveBeenCalledWith("/subscription/overview")
  })

  it("merender UserDropdown di footer untuk mobile", () => {
    render(<NaskahSidebarContainer sections={makeSections()} />)

    const footer = screen.getByTestId("naskah-sidebar-footer")
    expect(within(footer).getByTestId("user-dropdown")).toBeInTheDocument()
  })

  it("tidak merender tombol 'Percakapan Baru' atau analog (Q1 A = omit new slot)", () => {
    render(<NaskahSidebarContainer sections={makeSections()} />)

    // Chat sidebar has a "+ Percakapan Baru" button in the slot above
    // content. Naskah intentionally omits that slot — no equivalent
    // "new" action exists for naskah.
    expect(
      screen.queryByRole("button", { name: /percakapan baru/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /naskah baru/i }),
    ).not.toBeInTheDocument()
  })
})
