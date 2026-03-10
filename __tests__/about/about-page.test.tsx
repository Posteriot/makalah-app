import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import AboutPage from "@/app/(marketing)/about/page"

// Mock semua section components untuk isolasi test
vi.mock("@/components/about", () => ({
  ManifestoSection: () => (
    <section data-testid="manifesto-section">
      <h1>AI Yang Menumbuhkan Pikiran</h1>
    </section>
  ),
  ProblemsSection: () => (
    <section data-testid="problems-section">
      <h2>Apa Saja Persoalan Yang Dijawab?</h2>
    </section>
  ),
  AgentsSection: () => (
    <section data-testid="agents-section">
      <h2>Fitur &amp; Pengembangan</h2>
    </section>
  ),
  CareerContactSection: () => (
    <section data-testid="career-contact-section">
      <h2>Bergabung atau Hubungi Kami</h2>
    </section>
  ),
}))

describe("AboutPage", () => {
  it("render semua sections dengan urutan yang benar", () => {
    render(<AboutPage />)

    // Verifikasi semua sections ter-render (no more HeroSection)
    expect(screen.getByTestId("manifesto-section")).toBeInTheDocument()
    expect(screen.getByTestId("problems-section")).toBeInTheDocument()
    expect(screen.getByTestId("agents-section")).toBeInTheDocument()
    expect(screen.getByTestId("career-contact-section")).toBeInTheDocument()
  })

  it("render section headings dengan benar", () => {
    render(<AboutPage />)

    // Verifikasi headings sesuai spesifikasi baru
    expect(screen.getByText("AI Yang Menumbuhkan Pikiran")).toBeInTheDocument()
    expect(
      screen.getByText("Apa Saja Persoalan Yang Dijawab?")
    ).toBeInTheDocument()
    expect(screen.getByText(/Fitur & Pengembangan/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Bergabung atau Hubungi Kami/i)
    ).toBeInTheDocument()
  })

  it("sections ada dalam wrapper main", () => {
    const { container } = render(<AboutPage />)

    // Cari main element (no more global-main class)
    const mainWrapper = container.querySelector("main")
    expect(mainWrapper).toBeInTheDocument()

    // All sections should be inside main wrapper
    expect(mainWrapper).toContainElement(
      screen.getByTestId("manifesto-section")
    )
    expect(mainWrapper).toContainElement(screen.getByTestId("problems-section"))
    expect(mainWrapper).toContainElement(screen.getByTestId("agents-section"))
    expect(mainWrapper).toContainElement(
      screen.getByTestId("career-contact-section")
    )
  })
})
