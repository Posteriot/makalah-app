import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CheckoutErrorBanner } from "./CheckoutErrorBanner"

describe("CheckoutErrorBanner", () => {
  it("renders the chat-style destructive banner content", () => {
    render(
      <CheckoutErrorBanner
        title="Gagal memproses pembayaran"
        message="QRIS belum tersedia."
      />
    )

    const alert = screen.getByRole("alert")
    const inlineStyle = alert.getAttribute("style") ?? ""

    expect(alert).toBeInTheDocument()
    expect(screen.getByText("Gagal memproses pembayaran")).toBeInTheDocument()
    expect(screen.getByText("QRIS belum tersedia.")).toBeInTheDocument()
    expect(alert).toHaveClass("rounded-action", "border", "p-3")
    expect(inlineStyle).toContain("background-color: var(--chat-destructive, oklch(0.586 0.253 17.585));")
    expect(inlineStyle).toContain("border-color: var(--chat-destructive, oklch(0.586 0.253 17.585));")
    expect(inlineStyle).toContain("color: var(--chat-destructive-foreground, oklch(1 0 0));")
  })
})
