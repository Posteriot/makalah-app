import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { vi } from "vitest"

// ════════════════════════════════════════════════════════════════
// Mocks
// ════════════════════════════════════════════════════════════════

const mockUseCurrentUser = vi.fn()
const mockUseQuery = vi.fn()

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}))

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard/subscription/plans",
}))

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
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

// ════════════════════════════════════════════════════════════════
// Test Data
// ════════════════════════════════════════════════════════════════

const MOCK_PLANS = [
  {
    _id: "plan1",
    slug: "gratis",
    name: "Gratis",
    price: "Rp 0",
    unit: "/bulan",
    tagline: "Mulai gratis",
    features: ["100K tokens/bulan"],
    ctaText: "Mulai Gratis",
    isHighlighted: false,
  },
  {
    _id: "plan2",
    slug: "bpp",
    name: "Bayar Per Paper",
    price: "Rp 80.000",
    unit: "/paper",
    tagline: "Bayar sesuai pemakaian",
    features: ["300 kredit per paper"],
    ctaText: "Beli Paket",
    isHighlighted: true,
  },
  {
    _id: "plan3",
    slug: "pro",
    name: "Pro",
    price: "Rp 200.000",
    unit: "/bulan",
    tagline: "Untuk produktivitas maksimal",
    features: ["5M tokens/bulan"],
    ctaText: "Mulai Berlangganan",
    isHighlighted: false,
  },
]

const MOCK_FREE_USER = {
  _id: "user123",
  role: "user",
  subscriptionStatus: "free",
  firstName: "Test",
  lastName: "User",
  email: "test@example.com",
}

// ════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════

/**
 * Setup useQuery mock to return plans data for the plans page.
 *
 * The component calls useQuery multiple times:
 *   1. api.pricingPlans.getActivePlans -> plans
 *   2. api.pricingPlans.getCreditPackagesForPlan -> credit packages (BPP)
 *   3. api.billing.credits.getCreditBalance -> skip (free user)
 *   4. api.paperSessions.getByUserWithFilter -> skip
 *   5-6. api.billing.payments.watchPaymentStatus -> skip (no payment results)
 *
 * If the second arg is "skip", return undefined (Convex convention).
 */
function setupQueryMock() {
  mockUseQuery.mockImplementation((_queryRef: unknown, args: unknown) => {
    if (args === "skip") return undefined

    // getActivePlans has no args object
    if (args === undefined) return MOCK_PLANS

    // getCreditPackagesForPlan is called with { slug: "bpp" }
    if (typeof args === "object" && args !== null && "slug" in args) {
      return { creditPackages: [] }
    }

    return undefined
  })
}

async function renderAndExpandProCard() {
  const { default: PlansHubPage } = await import(
    "@/app/(dashboard)/subscription/plans/page"
  )

  const result = render(<PlansHubPage />)

  // Find the Pro card CTA button and click to expand
  const proButton = screen.getByRole("button", { name: /Mulai Berlangganan/i })
  fireEvent.click(proButton)

  return result
}

// ════════════════════════════════════════════════════════════════
// Tests
// ════════════════════════════════════════════════════════════════

describe("PlansHubPage - Pro Card UI", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseCurrentUser.mockReturnValue({
      user: MOCK_FREE_USER,
      isLoading: false,
    })

    setupQueryMock()
  })

  it("renders plan selection (monthly/yearly) when Pro card CTA is clicked", async () => {
    await renderAndExpandProCard()

    // Verify the plan selection section appears
    expect(screen.getByText("Pilih Paket Langganan")).toBeInTheDocument()

    // Verify monthly and yearly radio-style options exist
    expect(screen.getByText("Pro Bulanan")).toBeInTheDocument()
    expect(screen.getByText(/Pro Tahunan/i)).toBeInTheDocument()
  })

  it("shows correct prices for monthly (Rp 200.000) and yearly (Rp 2.000.000)", async () => {
    await renderAndExpandProCard()

    // Monthly price: "Rp 200.000" appears in the card header AND inside the
    // expanded checkout. Use getAllByText and verify at least 2 occurrences
    // (card header price + checkout plan selection price).
    // The info section at the bottom also mentions "Rp 200.000/bulan".
    const monthlyPriceElements = screen.getAllByText(/200\.000/, { exact: false })
    expect(monthlyPriceElements.length).toBeGreaterThanOrEqual(2)

    // Yearly price: "Rp 2.000.000" only appears in the expanded checkout
    const yearlyPriceElements = screen.getAllByText(/2\.000\.000/, { exact: false })
    expect(yearlyPriceElements.length).toBeGreaterThanOrEqual(1)

    // Yearly savings note
    expect(screen.getByText("Hemat 2 bulan")).toBeInTheDocument()
  })

  it("renders QRIS, Virtual Account, and E-Wallet payment method options", async () => {
    await renderAndExpandProCard()

    // Payment method section header
    expect(screen.getByText("Metode Pembayaran")).toBeInTheDocument()

    // Three payment methods
    expect(screen.getByText("QRIS")).toBeInTheDocument()
    expect(screen.getByText("Virtual Account")).toBeInTheDocument()
    expect(screen.getByText("E-Wallet")).toBeInTheDocument()
  })

  it("POSTs to /api/payments/subscribe with correct payload when pay button is clicked", async () => {
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

    await renderAndExpandProCard()

    // Default selection is pro_monthly and QRIS
    // Click the pay button
    const payButton = screen.getByRole("button", { name: /Bayar Pro Bulanan/i })
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
})
