import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { vi } from "vitest"

const mockUseCurrentUser = vi.fn()
const mockUseOnboardingStatus = vi.fn()
const mockUseQuery = vi.fn()
const mockRouterReplace = vi.fn()

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}))

vi.mock("@/lib/hooks/useOnboardingStatus", () => ({
  useOnboardingStatus: () => mockUseOnboardingStatus(),
}))

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockRouterReplace,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "from" ? "plans" : null),
  }),
  usePathname: () => "/subscription/plans",
}))

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img alt="" {...props} />,
}))

vi.mock("qrcode.react", () => ({
  QRCodeSVG: () => <svg data-testid="qr-code" />,
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const MOCK_FREE_USER = {
  _id: "user123",
  role: "user",
  subscriptionStatus: "free",
  firstName: "Test",
  lastName: "User",
  email: "test@example.com",
}

type CheckoutQueryMockOptions = {
  remainingCredits?: number
  subscriptionStatusResponse?: Record<string, unknown>
}

function setupCheckoutQueryMock(options?: CheckoutQueryMockOptions) {
  let userScopedQueryCount = 0
  const remainingCredits = options?.remainingCredits ?? 0
  const subscriptionStatusResponse = options?.subscriptionStatusResponse ?? {
    hasSubscription: false,
    status: null,
  }

  mockUseQuery.mockImplementation((_queryRef: unknown, args: unknown) => {
    if (args === "skip") return undefined

    if (typeof args === "object" && args !== null && "slug" in args) {
      return {
        _id: "plan-pro",
        slug: "pro",
        isDisabled: false,
      }
    }

    if (args === undefined) {
      return {
        priceIDR: 200_000,
        label: "Pro Bulanan",
      }
    }

    if (typeof args === "object" && args !== null && "userId" in args) {
      if (userScopedQueryCount === 0) {
        userScopedQueryCount += 1
        return { remainingCredits }
      }
      return subscriptionStatusResponse
    }

    if (typeof args === "object" && args !== null && "paymentId" in args) {
      return undefined
    }

    return undefined
  })
}

describe("Billing - PRO checkout flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseCurrentUser.mockReturnValue({
      user: MOCK_FREE_USER,
      isLoading: false,
    })

    mockUseOnboardingStatus.mockReturnValue({
      hasCompletedOnboarding: true,
      isLoading: false,
      isAuthenticated: true,
      completeOnboarding: vi.fn().mockResolvedValue(undefined),
    })

    setupCheckoutQueryMock()
  })

  it("menampilkan informasi paket dan metode pembayaran di checkout PRO", async () => {
    const { default: CheckoutPROPage } = await import("@/app/(onboarding)/checkout/pro/page")

    render(<CheckoutPROPage />)

    expect(screen.getByText("Checkout Pro")).toBeInTheDocument()
    expect(screen.getByText("Paket Langganan")).toBeInTheDocument()
    expect(screen.getByText("Pro Bulanan")).toBeInTheDocument()
    expect(screen.getByText("Metode Pembayaran")).toBeInTheDocument()

    expect(screen.getByText("QRIS")).toBeInTheDocument()
    expect(screen.getByText("Virtual Account")).toBeInTheDocument()
    expect(screen.getByText("E-Wallet")).toBeInTheDocument()
  })

  it("POST ke /api/payments/subscribe dengan payload default saat klik Bayar", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          paymentId: "pay_123",
          convexPaymentId: "conv_123",
          xenditId: "xnd_123",
          status: "PENDING",
          amount: 200_000,
          expiresAt: Date.now() + 30 * 60 * 1000,
          qrString: "mock-qr-string",
        }),
    })

    global.fetch = mockFetch

    const { default: CheckoutPROPage } = await import("@/app/(onboarding)/checkout/pro/page")

    render(<CheckoutPROPage />)

    const payButton = screen.getByRole("button", { name: /^Bayar$/i })
    fireEvent.click(payButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/payments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: "pro_monthly",
          paymentMethod: "qris",
          vaChannel: undefined,
          ewalletChannel: undefined,
          mobileNumber: undefined,
        }),
      })
    })
  })

  it("tidak memanggil completeOnboarding saat auth onboarding belum siap", async () => {
    const completeOnboarding = vi.fn().mockResolvedValue(undefined)
    mockUseOnboardingStatus.mockReturnValue({
      hasCompletedOnboarding: false,
      isLoading: true,
      isAuthenticated: false,
      completeOnboarding,
    })

    const { default: CheckoutPROPage } = await import("@/app/(onboarding)/checkout/pro/page")
    render(<CheckoutPROPage />)

    await waitFor(() => {
      expect(screen.getByText("Checkout Pro")).toBeInTheDocument()
    })
    expect(completeOnboarding).not.toHaveBeenCalled()
  })

  it("memanggil completeOnboarding sekali saat auth onboarding siap", async () => {
    const completeOnboarding = vi.fn().mockResolvedValue(undefined)
    mockUseOnboardingStatus.mockReturnValue({
      hasCompletedOnboarding: false,
      isLoading: false,
      isAuthenticated: true,
      completeOnboarding,
    })

    const { default: CheckoutPROPage } = await import("@/app/(onboarding)/checkout/pro/page")
    render(<CheckoutPROPage />)

    await waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalledTimes(1)
    })
  })

  it("user pro dengan subscription aktif melihat state informasional tanpa tombol bayar", async () => {
    mockUseCurrentUser.mockReturnValue({
      user: {
        ...MOCK_FREE_USER,
        subscriptionStatus: "pro",
      },
      isLoading: false,
    })

    setupCheckoutQueryMock({
      remainingCredits: 120,
      subscriptionStatusResponse: {
        hasSubscription: true,
        status: "active",
        isExpired: false,
        currentPeriodEnd: Date.now() + 7 * 24 * 60 * 60 * 1000,
        isPendingCancel: false,
      },
    })

    const { default: CheckoutPROPage } = await import("@/app/(onboarding)/checkout/pro/page")
    render(<CheckoutPROPage />)

    expect(screen.getByText("Langganan Pro lo masih aktif.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Top Up Kredit" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Bayar$/i })).not.toBeInTheDocument()
  })

  it("source of truth status aktif tetap dari query subscription meskipun tier user belum sinkron", async () => {
    mockUseCurrentUser.mockReturnValue({
      user: {
        ...MOCK_FREE_USER,
        subscriptionStatus: "free",
      },
      isLoading: false,
    })

    setupCheckoutQueryMock({
      remainingCredits: 80,
      subscriptionStatusResponse: {
        hasSubscription: true,
        status: "active",
        isExpired: false,
        currentPeriodEnd: Date.now() + 14 * 24 * 60 * 60 * 1000,
        isPendingCancel: false,
      },
    })

    const { default: CheckoutPROPage } = await import("@/app/(onboarding)/checkout/pro/page")
    render(<CheckoutPROPage />)

    expect(screen.getByText("Langganan Pro lo masih aktif.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Bayar$/i })).not.toBeInTheDocument()
  })

  it("user unlimited tidak bisa lanjut checkout pro", async () => {
    mockUseCurrentUser.mockReturnValue({
      user: {
        ...MOCK_FREE_USER,
        role: "admin",
        subscriptionStatus: "unlimited",
      },
      isLoading: false,
    })

    setupCheckoutQueryMock()

    const { default: CheckoutPROPage } = await import("@/app/(onboarding)/checkout/pro/page")
    render(<CheckoutPROPage />)

    expect(screen.getByText("Akun lo sudah berada di tier Unlimited, checkout Pro tidak diperlukan.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Bayar$/i })).not.toBeInTheDocument()
  })
})
