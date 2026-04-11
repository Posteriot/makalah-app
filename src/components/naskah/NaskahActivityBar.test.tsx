import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { NaskahActivityBar } from "./NaskahActivityBar"

// next/image needs a browser-friendly stub in vitest jsdom environment
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))

describe("NaskahActivityBar", () => {
  it("merender nav dengan testid naskah-activity-bar", () => {
    render(<NaskahActivityBar />)

    const nav = screen.getByTestId("naskah-activity-bar")
    expect(nav).toBeInTheDocument()
    expect(nav.tagName).toBe("NAV")
    expect(nav).toHaveAttribute("role", "navigation")
    expect(nav).toHaveAttribute("aria-label", "Sidebar navigation")
  })

  it("merender logo link ke root /", () => {
    render(<NaskahActivityBar />)

    const home = screen.getByRole("link", { name: "Home" })
    expect(home).toBeInTheDocument()
    expect(home).toHaveAttribute("href", "/")
  })

  it("merender dua varian logo untuk light dan dark mode", () => {
    render(<NaskahActivityBar />)

    // Two <img> elements: one with .hidden.dark:block (visible in dark),
    // one with .block.dark:hidden (visible in light). Both present in DOM
    // so the swap is pure CSS.
    const images = screen.getAllByAltText("Makalah")
    expect(images).toHaveLength(2)
    expect(images[0]).toHaveClass("hidden", "dark:block")
    expect(images[1]).toHaveClass("block", "dark:hidden")
  })

  it("tidak merender panel buttons, tablist, atau tooltip trigger", () => {
    render(<NaskahActivityBar />)

    // Chat's ActivityBar has a tablist of panel buttons. Naskah has none.
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /riwayat percakapan/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /linimasa progres/i }),
    ).not.toBeInTheDocument()
  })

  it("memakai kelas wrapper yang sejajar dengan ActivityBar chat", () => {
    render(<NaskahActivityBar />)

    const nav = screen.getByTestId("naskah-activity-bar")
    // These classes MUST stay in sync with src/components/chat/shell/ActivityBar.tsx
    // wrapper <nav>. If chat changes, re-sync manually.
    expect(nav).toHaveClass(
      "flex",
      "flex-col",
      "items-center",
      "w-[var(--activity-bar-width)]",
      "min-w-[48px]",
      "border-r",
      "border-[color:var(--chat-sidebar-border)]",
      "bg-[var(--chat-sidebar)]",
    )
  })
})
