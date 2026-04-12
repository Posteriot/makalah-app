import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NaskahShell } from "./NaskahShell"

const mockUseQuery = vi.fn()
const mockUseCurrentUser = vi.fn()
const mockUsePaperSession = vi.fn()
const mockUseNaskah = vi.fn()
const mockPush = vi.fn()

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: "light",
    setTheme: vi.fn(),
  }),
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}))

vi.mock("@/lib/hooks/usePaperSession", () => ({
  usePaperSession: (...args: unknown[]) => mockUsePaperSession(...args),
}))

vi.mock("@/lib/hooks/useNaskah", () => ({
  useNaskah: (...args: unknown[]) => mockUseNaskah(...args),
}))

vi.mock("@/components/layout/header", () => ({
  UserDropdown: () => <div data-testid="user-dropdown" />,
}))

vi.mock("@/components/layout/header/UserDropdown", () => ({
  UserDropdown: () => <div data-testid="user-dropdown-sidebar" />,
}))

vi.mock("@/components/billing/CreditMeter", () => ({
  CreditMeter: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" data-testid="credit-meter" onClick={onClick}>
      credit-meter
    </button>
  ),
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

vi.mock("@/components/chat/ChatSidebar", () => ({
  ChatSidebar: () => <div data-testid="chat-sidebar" />,
}))

vi.mock("@/components/chat/shell/ActivityBar", () => ({
  ActivityBar: () => <div data-testid="activity-bar" />,
}))

describe("NaskahShell", () => {
  const setDesktopViewport = (isDesktop: boolean) => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: isDesktop,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
  }

  beforeEach(() => {
    setDesktopViewport(true)
    mockUseQuery.mockReset()
    mockUseCurrentUser.mockReset()
    mockUsePaperSession.mockReset()
    mockUseNaskah.mockReset()

    mockUseCurrentUser.mockReturnValue({
      user: { _id: "users_1", firstName: "Erik" },
      isLoading: false,
    })
    mockUsePaperSession.mockReturnValue({
      session: { _id: "paperSessions_1" },
    })
    mockUseNaskah.mockReturnValue({
      availability: { isAvailable: false },
      updatePending: false,
    })
    mockUseQuery.mockReturnValue([])
  })

  it("merender TopBar, rail naskah, sidebar container, dan body children di desktop", () => {
    render(
      <NaskahShell
        conversationId="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        isSidebarAvailable={true}
        sidebarSections={[
          {
            key: "abstrak",
            label: "Abstrak",
            content: "Isi abstrak",
            sourceStage: "abstrak",
          },
        ]}
      >
        <div>body-content</div>
      </NaskahShell>,
    )

    expect(screen.getByRole("link", { name: /percakapan/i })).toBeInTheDocument()
    expect(screen.getByTestId("naskah-activity-bar")).toBeInTheDocument()
    expect(screen.getByTestId("naskah-sidebar-container")).toBeInTheDocument()
    expect(screen.getByTestId("naskah-sidebar")).toBeInTheDocument()
    expect(screen.getByText("body-content")).toBeInTheDocument()
  })

  it("tidak merender chat sidebar atau activity bar", () => {
    render(
      <NaskahShell conversationId="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">
        <div>body</div>
      </NaskahShell>,
    )

    expect(screen.queryByTestId("chat-sidebar")).not.toBeInTheDocument()
    expect(screen.queryByTestId("activity-bar")).not.toBeInTheDocument()
  })

  it("tidak merender link Pratinjau pada route naskah", () => {
    render(
      <NaskahShell conversationId="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">
        <div>body</div>
      </NaskahShell>,
    )

    expect(
      screen.queryByRole("link", { name: /pratinjau/i }),
    ).not.toBeInTheDocument()
  })

  it("tidak merender tombol expand sidebar di TopBar saat sidebar tidak tersedia", () => {
    // Fixes v1 inert expand button bug — when shouldShowSidebar is false
    // (loading / unavailable state), TopBar should NOT render the
    // expand-sidebar chevron because clicking it does nothing.
    render(
      <NaskahShell
        conversationId="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        isSidebarAvailable={false}
        sidebarSections={[]}
      >
        <div>body</div>
      </NaskahShell>,
    )

    expect(
      screen.queryByRole("button", { name: /expand sidebar/i }),
    ).not.toBeInTheDocument()
  })

  it("meneruskan availability dan updatePending ke TopBar tanpa crash", () => {
    mockUseNaskah.mockReturnValue({
      availability: { isAvailable: true },
      updatePending: true,
    })

    render(
      <NaskahShell conversationId="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">
        <div>body</div>
      </NaskahShell>,
    )

    expect(screen.getByRole("link", { name: /percakapan/i })).toBeInTheDocument()
  })

  it("bisa collapse sidebar di desktop, TopBar kemudian merender tombol expand", () => {
    render(
      <NaskahShell
        conversationId="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        isSidebarAvailable={true}
        sidebarSections={[
          {
            key: "abstrak",
            label: "Abstrak",
            content: "Isi abstrak",
            sourceStage: "abstrak",
          },
        ]}
      >
        <div>body</div>
      </NaskahShell>,
    )

    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }))

    expect(screen.queryByTestId("naskah-sidebar-container")).not.toBeInTheDocument()
    expect(screen.queryByTestId("naskah-sidebar")).not.toBeInTheDocument()
    expect(screen.getByTestId("naskah-activity-bar")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /expand sidebar/i }),
    ).toBeInTheDocument()
  })

  it("memuat jumlah artefak dan mengaktifkan indikator TopBar", () => {
    mockUseQuery.mockReturnValue([{ _id: "a" }, { _id: "b" }, { _id: "c" }])

    render(
      <NaskahShell conversationId="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">
        <div>body</div>
      </NaskahShell>,
    )

    expect(
      screen.getByText("3 artifak pada sesi ini"),
    ).toBeInTheDocument()
    expect(
      within(screen.getByLabelText("3 artifak tersedia")).getByText("3"),
    ).toBeInTheDocument()
  })

  it("menerima null conversationId tanpa crash", () => {
    render(
      <NaskahShell conversationId={null}>
        <div>body</div>
      </NaskahShell>,
    )

    expect(
      screen.queryByRole("link", { name: /percakapan/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByText("body")).toBeInTheDocument()
  })

  it("membuka drawer sidebar di mobile lewat toggle TopBar", async () => {
    setDesktopViewport(false)

    render(
      <NaskahShell
        conversationId="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        isSidebarAvailable={true}
        sidebarSections={[
          {
            key: "abstrak",
            label: "Abstrak",
            content: "Isi abstrak",
            sourceStage: "abstrak",
          },
        ]}
      >
        <div>body</div>
      </NaskahShell>,
    )

    fireEvent.click(screen.getByRole("button", { name: /expand sidebar/i }))

    expect(await screen.findByTestId("naskah-mobile-sidebar-header")).toBeInTheDocument()
    expect(screen.getByTestId("naskah-sidebar")).toBeInTheDocument()
  })
})
