import { render, screen } from "@testing-library/react"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { HeroCTA } from "@/components/marketing/hero/HeroCTA"

const mockUseSession = vi.fn()
const mockUseWaitlistMode = vi.fn()

vi.mock("@/lib/auth-client", () => ({
  useSession: () => mockUseSession(),
}))

vi.mock("@/lib/hooks/useWaitlistMode", () => ({
  useWaitlistMode: () => mockUseWaitlistMode(),
}))

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe("HeroCTA routing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    })
    mockUseWaitlistMode.mockReturnValue({
      isWaitlistMode: false,
      subtitle: "",
      ctaText: "IKUT DAFTAR TUNGGU",
    })
  })

  it("mengarah ke sign-up dengan redirect_url=/chat saat user belum login", () => {
    render(<HeroCTA ctaText="MULAI" />)

    const cta = screen.getByRole("link", { name: "MULAI" })
    expect(cta).toHaveAttribute("href", "/sign-up?redirect_url=%2Fchat")
    expect(cta).toHaveAttribute("target", "_blank")
    expect(cta).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("mengarah ke /chat saat user sudah login", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "user-1",
          email: "test@example.com",
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      isPending: false,
    })
    render(<HeroCTA />)

    const cta = screen.getByRole("link", { name: "AYO MULAI" })
    expect(cta).toHaveAttribute("href", "/chat")
    expect(cta).toHaveAttribute("target", "_blank")
    expect(cta).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("mengarah ke /waitinglist saat waitlist mode aktif", () => {
    mockUseWaitlistMode.mockReturnValue({
      isWaitlistMode: true,
      subtitle: "waitlist aktif",
      ctaText: "IKUT DAFTAR TUNGGU",
    })

    render(<HeroCTA />)

    const cta = screen.getByRole("link", { name: "IKUT DAFTAR TUNGGU" })
    expect(cta).toHaveAttribute("href", "/waitinglist")
  })
})
