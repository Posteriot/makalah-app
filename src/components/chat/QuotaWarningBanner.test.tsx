import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { QuotaWarningBanner } from "./QuotaWarningBanner"

let mockUser: {
  _id: string
  role: string
  subscriptionStatus: string
} | null = null

let mockQueryPayload: {
  percentUsed?: number
  remainingCredits?: number
} = {}

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: mockUser,
    isLoading: false,
  }),
}))

vi.mock("convex/react", () => ({
  useQuery: (_queryRef: unknown, args: unknown) => {
    if (args === "skip") return undefined
    return mockQueryPayload
  },
}))

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe("QuotaWarningBanner", () => {
  beforeEach(() => {
    mockUser = null
    mockQueryPayload = {}
  })

  it("gratis depleted menampilkan dua CTA: beli kredit + upgrade pro", () => {
    mockUser = {
      _id: "user-1",
      role: "user",
      subscriptionStatus: "free",
    }
    mockQueryPayload = {
      percentUsed: 100,
      remainingCredits: 0,
    }

    render(<QuotaWarningBanner />)

    expect(screen.getByRole("link", { name: "Beli Kredit" })).toHaveAttribute("href", "/checkout/bpp")
    expect(screen.getByRole("link", { name: "Upgrade ke Pro" })).toHaveAttribute("href", "/checkout/pro")
  })

  it("bpp warning menampilkan satu CTA beli kredit ke checkout bpp", () => {
    mockUser = {
      _id: "user-2",
      role: "user",
      subscriptionStatus: "bpp",
    }
    mockQueryPayload = {
      percentUsed: 0,
      remainingCredits: 80,
    }

    render(<QuotaWarningBanner />)

    expect(screen.getByRole("link", { name: "Beli Kredit" })).toHaveAttribute("href", "/checkout/bpp")
    expect(screen.queryByRole("link", { name: "Upgrade ke Pro" })).not.toBeInTheDocument()
  })
})
