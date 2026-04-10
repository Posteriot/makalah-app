import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TopBar } from "./TopBar"

const mockSetTheme = vi.fn()

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: "light",
    setTheme: mockSetTheme,
  }),
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: { _id: "users_1", firstName: "Erik" },
    isLoading: false,
  }),
}))

vi.mock("@/components/layout/header", () => ({
  UserDropdown: () => <div data-testid="user-dropdown" />,
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

describe("TopBar naskah entry point", () => {
  beforeEach(() => {
    mockSetTheme.mockReset()
  })

  it("menampilkan tombol Naskah hanya saat availability true di route chat", () => {
    const { rerender } = render(
      <TopBar
        isSidebarCollapsed={false}
        onToggleSidebar={vi.fn()}
        artifactCount={2}
        conversationId="conversation_1"
        routeContext="chat"
        naskahAvailable={false}
        naskahUpdatePending={false}
      />,
    )

    expect(
      screen.queryByRole("link", { name: /naskah/i }),
    ).not.toBeInTheDocument()

    rerender(
      <TopBar
        isSidebarCollapsed={false}
        onToggleSidebar={vi.fn()}
        artifactCount={2}
        conversationId="conversation_1"
        routeContext="chat"
        naskahAvailable={true}
        naskahUpdatePending={false}
      />,
    )

    const link = screen.getByRole("link", { name: /naskah/i })
    expect(link).toHaveAttribute("href", "/chat/conversation_1/naskah")
  })

  it("menampilkan tombol Chat saat berada di route naskah", () => {
    render(
      <TopBar
        isSidebarCollapsed={false}
        onToggleSidebar={vi.fn()}
        artifactCount={2}
        conversationId="conversation_1"
        routeContext="naskah"
        naskahAvailable={true}
        naskahUpdatePending={false}
      />,
    )

    const link = screen.getByRole("link", { name: /chat/i })
    expect(link).toHaveAttribute("href", "/chat/conversation_1")
  })

  it("menampilkan titik update hanya saat updatePending true pada tombol Naskah", () => {
    const { rerender } = render(
      <TopBar
        isSidebarCollapsed={false}
        onToggleSidebar={vi.fn()}
        artifactCount={2}
        conversationId="conversation_1"
        routeContext="chat"
        naskahAvailable={true}
        naskahUpdatePending={false}
      />,
    )

    let link = screen.getByRole("link", { name: /naskah/i })
    expect(
      within(link).queryByTestId("naskah-update-dot"),
    ).not.toBeInTheDocument()

    rerender(
      <TopBar
        isSidebarCollapsed={false}
        onToggleSidebar={vi.fn()}
        artifactCount={2}
        conversationId="conversation_1"
        routeContext="chat"
        naskahAvailable={true}
        naskahUpdatePending={true}
      />,
    )

    link = screen.getByRole("link", { name: /naskah/i })
    expect(within(link).getByTestId("naskah-update-dot")).toBeInTheDocument()
  })
})
