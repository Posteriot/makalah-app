import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { hydrateRoot } from "react-dom/client"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GlobalHeader } from "@/components/layout/header/GlobalHeader"

const mockUseTheme = vi.fn()
const mockUseSession = vi.fn()
const mockUseCurrentUser = vi.fn()
const mockUseQuery = vi.fn()
const mockUsePathname = vi.fn()
const mockUseSearchParams = vi.fn()
const mockUserDropdown = vi.fn()

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("next-themes", () => ({
  useTheme: () => mockUseTheme(),
}))

vi.mock("@/lib/auth-client", () => ({
  useSession: () => mockUseSession(),
  signOut: vi.fn(),
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}))

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
}))

vi.mock("@/components/layout/header/UserDropdown", () => ({
  UserDropdown: (props: unknown) => {
    mockUserDropdown(props)
    return <div data-testid="user-dropdown" />
  },
}))

describe("GlobalHeader auth contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseTheme.mockReturnValue({
      resolvedTheme: "light",
      setTheme: vi.fn(),
    })

    mockUseQuery.mockImplementation((_queryRef: unknown, args: unknown) => {
      if (typeof args === "object" && args !== null && "key" in args) {
        return null
      }

      return null
    })

    mockUsePathname.mockReturnValue("/documentation")
    mockUseSearchParams.mockReturnValue({
      toString: () => "section=intro",
    })

    window.history.replaceState({}, "", "/documentation?section=intro#api")
  })

  it("menampilkan CTA masuk dengan redirect_url yang mempertahankan query dan hash", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })
    mockUseCurrentUser.mockReturnValue({
      user: null,
      isLoading: false,
    })

    render(<GlobalHeader />)

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Masuk" })).toHaveAttribute(
        "href",
        "/sign-in?redirect_url=%2Fdocumentation%3Fsection%3Dintro%23api"
      )
    })
    expect(screen.getByRole("link", { name: "Chat" })).toHaveAttribute(
      "href",
      "/sign-in?redirect_url=%2Fchat"
    )
    expect(screen.queryByTestId("user-dropdown")).not.toBeInTheDocument()
  })

  it("merender dropdown user hanya saat authenticated final", async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "user-1",
          name: "Makalah Admin",
          email: "admin@example.com",
        },
      },
      isPending: false,
    })
    mockUseCurrentUser.mockReturnValue({
      user: {
        _id: "convex-user-1",
        firstName: "Makalah",
        lastName: "Admin",
        role: "user",
        subscriptionStatus: "pro",
      },
      isLoading: false,
    })

    render(<GlobalHeader />)

    expect(screen.queryByRole("link", { name: "Masuk" })).not.toBeInTheDocument()
    expect(await screen.findByTestId("user-dropdown")).toBeInTheDocument()
    expect(mockUserDropdown).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: "Makalah",
        isAdminOverride: false,
        onSignOutOverride: expect.any(Function),
      })
    )
    expect(screen.getAllByLabelText("Toggle theme")).toHaveLength(1)
  })

  it("tidak merender CTA auth final saat state masih loading", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "user-1",
          name: "Makalah Admin",
          email: "admin@example.com",
        },
      },
      isPending: true,
    })
    mockUseCurrentUser.mockReturnValue({
      user: null,
      isLoading: true,
    })

    render(<GlobalHeader />)

    expect(screen.queryByRole("link", { name: "Masuk" })).not.toBeInTheDocument()
    expect(screen.queryByTestId("user-dropdown")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Toggle theme")).not.toBeInTheDocument()
  })

  it("tetap mengarahkan menu chat ke /chat saat session sudah ada meski auth UI masih loading", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "user-1",
          name: "Makalah Admin",
          email: "admin@example.com",
        },
      },
      isPending: false,
    })
    mockUseCurrentUser.mockReturnValue({
      user: null,
      isLoading: true,
    })

    render(<GlobalHeader />)

    expect(screen.getByRole("link", { name: "Chat" })).toHaveAttribute("href", "/chat")
  })

  it("tidak merender theme toggle ketika unauthenticated", () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })
    mockUseCurrentUser.mockReturnValue({
      user: null,
      isLoading: false,
    })

    render(<GlobalHeader />)

    expect(screen.queryByLabelText("Toggle theme")).not.toBeInTheDocument()
  })

  it("merender skeleton brand dan nav saat header config masih loading", () => {
    mockUseQuery.mockImplementation((_queryRef: unknown, args: unknown) => {
      if (typeof args === "object" && args !== null && "key" in args) {
        return undefined
      }

      return null
    })
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })
    mockUseCurrentUser.mockReturnValue({
      user: null,
      isLoading: false,
    })

    render(<GlobalHeader />)

    expect(screen.getByTestId("header-brand-skeleton")).toBeInTheDocument()
    expect(screen.getByTestId("header-nav-skeleton")).toBeInTheDocument()
    expect(screen.queryByAltText("Makalah")).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Chat" })).not.toBeInTheDocument()
  })

  it("menampilkan panel akun mobile yang informatif saat menu dibuka", async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "user-1",
          name: "Makalah Admin",
          email: "admin@example.com",
        },
      },
      isPending: false,
    })
    mockUseCurrentUser.mockReturnValue({
      user: {
        _id: "convex-user-1",
        firstName: "Makalah",
        lastName: "Admin",
        role: "user",
        subscriptionStatus: "pro",
      },
      isLoading: false,
    })

    render(<GlobalHeader />)

    expect(screen.queryByRole("button", { name: "Ganti tema" })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Buka menu" }))

    expect(await screen.findByText("Makalah Admin")).toBeInTheDocument()
    expect(screen.getAllByText("PRO")).toHaveLength(2)
    expect(screen.queryByRole("button", { name: "Ganti tema" })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Makalah Admin/i }))

    expect(screen.getByRole("button", { name: "Ganti tema" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Keluar" })).toBeInTheDocument()
  })

  it("menyamakan ukuran font tombol masuk mobile dengan panel akun mobile", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })
    mockUseCurrentUser.mockReturnValue({
      user: null,
      isLoading: false,
    })

    render(<GlobalHeader />)

    fireEvent.click(screen.getByRole("button", { name: "Buka menu" }))

    const mobileMasukLabel = screen
      .getAllByText("Masuk")
      .find((node) => node.closest("a")?.className.includes("w-full"))

    expect(mobileMasukLabel).toHaveClass("text-sm", "font-medium")
  })

  it("menjaga markup auth awal tetap sama antara SSR dan hydration client", async () => {
    mockUseSession.mockReturnValueOnce({
      data: null,
      isPending: true,
    })
    mockUseCurrentUser.mockReturnValueOnce({
      user: null,
      isLoading: true,
    })

    const html = renderToString(<GlobalHeader />)
    const container = document.createElement("div")
    container.innerHTML = html
    document.body.appendChild(container)

    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })
    mockUseCurrentUser.mockReturnValue({
      user: null,
      isLoading: false,
    })

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    await act(async () => {
      hydrateRoot(container, <GlobalHeader />)
      await Promise.resolve()
    })

    expect(consoleErrorSpy).not.toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
    container.remove()
  })
})
