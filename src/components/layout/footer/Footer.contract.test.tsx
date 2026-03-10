import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Footer } from "./Footer"

const mockUseSession = vi.fn()
const mockUseQuery = vi.fn()

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("@/lib/auth-client", () => ({
  useSession: () => mockUseSession(),
}))

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

vi.mock("@/components/marketing/SectionBackground", () => ({
  GridPattern: () => <div data-testid="grid-pattern" />,
  DottedPattern: () => <div data-testid="dotted-pattern" />,
  DiagonalStripes: () => <div data-testid="diagonal-stripes" />,
}))

describe("Footer contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })

    mockUseQuery.mockImplementation((_queryRef: unknown, args: unknown) => {
      if (args === "skip") return null
      if (typeof args === "object" && args !== null && "key" in args) return null
      return null
    })
  })

  it("menyisipkan Lapor Masalah dengan redirect ke sign-in untuk signed-out user", () => {
    render(<Footer />)

    expect(screen.getByRole("link", { name: "Lapor Masalah" })).toHaveAttribute(
      "href",
      "/sign-in?redirect_url=%2Fsupport%2Ftechnical-report%3Fsource%3Dfooter-link"
    )
  })

  it("tidak merender social placeholder bila config footer belum memiliki URL final", () => {
    render(<Footer />)

    expect(screen.queryByLabelText("X")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("LinkedIn")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Instagram")).not.toBeInTheDocument()
  })

  it("merender skeleton footer saat config CMS masih loading", () => {
    mockUseQuery.mockImplementation((_queryRef: unknown, args: unknown) => {
      if (args === "skip") return null
      if (typeof args === "object" && args !== null && "key" in args) return undefined
      return null
    })

    render(<Footer />)

    expect(screen.getByTestId("footer-skeleton")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Lapor Masalah" })).not.toBeInTheDocument()
  })

  it("merender skeleton footer saat asset logo CMS belum selesai resolve", () => {
    mockUseQuery.mockImplementation((_queryRef: unknown, args: unknown) => {
      if (args === "skip") return null
      if (typeof args === "object" && args !== null && "key" in args) {
        return {
          logoDarkId: "storage-dark",
          logoLightId: "storage-light",
          footerSections: [],
          socialLinks: [],
          showGridPattern: false,
          showDottedPattern: false,
          showDiagonalStripes: false,
        }
      }

      if (typeof args === "object" && args !== null && "storageId" in args) {
        return undefined
      }

      return null
    })

    render(<Footer />)

    expect(screen.getByTestId("footer-skeleton")).toBeInTheDocument()
  })

  it("merender skeleton icon saat asset social custom masih loading", () => {
    mockUseQuery.mockImplementation((_queryRef: unknown, args: unknown) => {
      if (args === "skip") return null
      if (typeof args === "object" && args !== null && "key" in args) {
        return {
          footerSections: [{ title: "Sumber Daya", links: [] }],
          socialLinks: [
            {
              platform: "linkedin",
              url: "https://linkedin.com/company/makalah",
              isVisible: true,
              iconId: "storage-linkedin",
            },
          ],
          showGridPattern: false,
          showDottedPattern: false,
          showDiagonalStripes: false,
        }
      }

      if (typeof args === "object" && args !== null && "storageId" in args) {
        return undefined
      }

      return null
    })

    render(<Footer />)

    expect(screen.getByTestId("footer-social-icon-skeleton")).toBeInTheDocument()
    expect(screen.queryByLabelText("linkedin")).toBeInTheDocument()
  })
})
