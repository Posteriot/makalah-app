import { render, screen, waitFor } from "@testing-library/react"
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
        role: "admin",
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
        isAdminOverride: true,
        onSignOutOverride: expect.any(Function),
      })
    )
    expect(screen.getAllByLabelText("Toggle theme")).toHaveLength(2)
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
})
