import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockUseCurrentUser = vi.fn()
const mockUseOnboardingStatus = vi.fn()
const mockUseQuery = vi.fn()
const mockRouterReplace = vi.fn()
const mockSearchParamGet = vi.fn()

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}))

vi.mock("@/lib/hooks/useOnboardingStatus", () => ({
  useOnboardingStatus: () => mockUseOnboardingStatus(),
}))

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
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
    get: mockSearchParamGet,
  }),
}))

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
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

describe("Checkout BPP payment settings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParamGet.mockImplementation((key: string) => (key === "from" ? "plans" : null))

    mockUseCurrentUser.mockReturnValue({
      user: {
        _id: "user123",
        role: "user",
        subscriptionStatus: "free",
      },
      isLoading: false,
    })

    mockUseOnboardingStatus.mockReturnValue({
      hasCompletedOnboarding: true,
      isLoading: false,
      isAuthenticated: true,
      completeOnboarding: vi.fn().mockResolvedValue(undefined),
    })

    mockUseQuery.mockImplementation((_queryRef: unknown, args: unknown) => {
      if (args === "skip") return undefined

      if (typeof args === "object" && args !== null && "slug" in args) {
        return {
          _id: "plan-bpp",
          slug: "bpp",
          isDisabled: false,
        }
      }

      if (typeof args === "object" && args !== null && "packageType" in args) {
        return {
          credits: 300,
          priceIDR: 80_000,
          label: "Paket Paper",
          description: "1 paper lengkap (~15 halaman)",
        }
      }

      if (args === undefined) {
        return {
          enabledMethods: ["QRIS"],
          webhookUrl: "/api/webhooks/payment",
        }
      }

      if (typeof args === "object" && args !== null && "userId" in args) {
        return { remainingCredits: 0 }
      }

      return undefined
    })
  })

  it("shows only enabled payment methods and xendit copy", async () => {
    const { default: CheckoutBPPPage } = await import("@/app/(onboarding)/checkout/bpp/page")

    render(<CheckoutBPPPage />)

    expect(screen.getByText("QRIS")).toBeInTheDocument()
    expect(screen.queryByText("Virtual Account")).not.toBeInTheDocument()
    expect(screen.queryByText("E-Wallet")).not.toBeInTheDocument()
    expect(screen.getByText(/pembayaran diproses oleh xendit/i)).toBeInTheDocument()
  })
})
