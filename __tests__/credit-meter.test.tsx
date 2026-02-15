import { render, screen, fireEvent } from "@testing-library/react"
import { vi } from "vitest"

// Mock the hooks that CreditMeter depends on
const mockUseCreditMeter = vi.fn()
const mockUseCurrentUser = vi.fn()
const mockRouterPush = vi.fn()

vi.mock("@/lib/hooks/useCreditMeter", () => ({
  useCreditMeter: () => mockUseCreditMeter(),
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/chat",
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock convex/react since SegmentBadge might need it indirectly
vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => undefined),
}))

// ---------- Test data helpers ----------

function gratisData(overrides = {}) {
  return {
    tier: "gratis" as const,
    used: 50,
    total: 100,
    remaining: 50,
    percentage: 50,
    level: "normal" as const,
    isLoading: false,
    isAdmin: false,
    ...overrides,
  }
}

function bppData(overrides = {}) {
  return {
    tier: "bpp" as const,
    used: 0,
    total: Infinity,
    remaining: 150,
    percentage: NaN,
    level: "normal" as const,
    isLoading: false,
    isAdmin: false,
    ...overrides,
  }
}

function proData(overrides = {}) {
  return {
    tier: "pro" as const,
    used: 2500,
    total: 5000,
    remaining: 2500,
    percentage: 50,
    level: "normal" as const,
    isLoading: false,
    isAdmin: false,
    ...overrides,
  }
}

function mockUser(role = "user", subscriptionStatus = "free") {
  return {
    user: {
      _id: "user123",
      role,
      subscriptionStatus,
      firstName: "Test",
      lastName: "User",
      email: "test@test.com",
    },
    isLoading: false,
  }
}

// ---------- Tests ----------

describe("CreditMeter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCurrentUser.mockReturnValue(mockUser())
  })

  it("renders progress bar with kredit values for Gratis tier", async () => {
    mockUseCreditMeter.mockReturnValue(gratisData())
    const { default: CreditMeter } = await import(
      "@/components/billing/CreditMeter"
    )
    // Note: compact variant shows single-line text only; standard has progressbar
    render(<CreditMeter variant="standard" />)

    expect(screen.getByRole("progressbar")).toBeInTheDocument()
    expect(screen.getByText("50")).toBeInTheDocument()
    expect(screen.getByText(/\/100/)).toBeInTheDocument()
  })

  it("renders remaining credits without progress bar for BPP tier", async () => {
    mockUseCreditMeter.mockReturnValue(bppData())
    mockUseCurrentUser.mockReturnValue(mockUser("user", "bpp"))
    const { default: CreditMeter } = await import(
      "@/components/billing/CreditMeter"
    )
    render(<CreditMeter variant="compact" />)

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
    // BPP compact shows used/total format (0/Infinity displayed via formatNumber)
    expect(screen.getByText("0")).toBeInTheDocument()
  })

  it("renders overage badge for Pro tier when over quota", async () => {
    mockUseCreditMeter.mockReturnValue(
      proData({
        used: 5200,
        percentage: 104,
        level: "depleted",
        overage: 200,
        overageCost: 10,
      })
    )
    mockUseCurrentUser.mockReturnValue(mockUser("user", "pro"))
    const { default: CreditMeter } = await import(
      "@/components/billing/CreditMeter"
    )
    render(<CreditMeter variant="standard" />)

    expect(screen.getByText(/\+200 overage/)).toBeInTheDocument()
    expect(screen.getByText(/Rp 10/)).toBeInTheDocument()
  })

  it("renders Unlimited label for admin users", async () => {
    mockUseCreditMeter.mockReturnValue({ ...gratisData(), isAdmin: true, total: Infinity, remaining: Infinity })
    mockUseCurrentUser.mockReturnValue(mockUser("admin", "free"))
    const { default: CreditMeter } = await import(
      "@/components/billing/CreditMeter"
    )
    render(<CreditMeter variant="compact" />)

    expect(screen.getByText("Unlimited")).toBeInTheDocument()
    // SegmentBadge for admin renders "UNLIMITED" tier badge (not "Admin" text)
    expect(screen.getByText("UNLIMITED")).toBeInTheDocument()
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
  })

  it("shows amber bar color at warning level", async () => {
    mockUseCreditMeter.mockReturnValue(
      gratisData({ percentage: 75, level: "warning" })
    )
    const { default: CreditMeter } = await import(
      "@/components/billing/CreditMeter"
    )
    render(<CreditMeter variant="standard" />)

    const progressbar = screen.getByRole("progressbar")
    const bar = progressbar.firstChild as HTMLElement
    expect(bar.className).toContain("bg-amber-500")
  })

  it("shows rose bar color at critical level", async () => {
    mockUseCreditMeter.mockReturnValue(
      gratisData({ percentage: 95, level: "critical" })
    )
    const { default: CreditMeter } = await import(
      "@/components/billing/CreditMeter"
    )
    render(<CreditMeter variant="standard" />)

    const progressbar = screen.getByRole("progressbar")
    const bar = progressbar.firstChild as HTMLElement
    expect(bar.className).toContain("bg-rose-500")
  })

  it("renders skeleton during loading", async () => {
    mockUseCreditMeter.mockReturnValue({ ...gratisData(), isLoading: true })
    const { default: CreditMeter } = await import(
      "@/components/billing/CreditMeter"
    )
    render(<CreditMeter variant="compact" />)

    expect(screen.getByTestId("credit-meter-skeleton")).toBeInTheDocument()
    expect(screen.getByText("\u2014 kredit")).toBeInTheDocument()
  })

  it("calls onClick handler when clicked", async () => {
    mockUseCreditMeter.mockReturnValue(gratisData())
    const handleClick = vi.fn()
    const { default: CreditMeter } = await import(
      "@/components/billing/CreditMeter"
    )
    render(<CreditMeter variant="compact" onClick={handleClick} />)

    const button = screen.getByRole("button")
    fireEvent.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
