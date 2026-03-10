import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { AccordionAbout } from "@/components/about/AccordionAbout"

// Mock window.location.hash for anchor scroll handling
Object.defineProperty(window, "location", {
  value: {
    hash: "",
  },
  writable: true,
})

const mockItems = [
  { id: "item-1", title: "Item 1", content: "Content 1" },
  { id: "item-2", title: "Item 2", content: "Content 2" },
  { id: "item-3", title: "Item 3", content: "Content 3" },
]

describe("AccordionAbout", () => {
  it("render semua accordion items", () => {
    render(<AccordionAbout items={mockItems} />)

    expect(screen.getByText("Item 1")).toBeInTheDocument()
    expect(screen.getByText("Item 2")).toBeInTheDocument()
    expect(screen.getByText("Item 3")).toBeInTheDocument()
  })

  it("expand accordion item saat diklik", () => {
    render(<AccordionAbout items={mockItems} />)

    const trigger = screen.getByRole("button", { name: /Item 1/i })
    fireEvent.click(trigger)

    // Content harus visible setelah di-expand
    expect(screen.getByText("Content 1")).toBeVisible()
  })

  it("implementasi one-at-a-time behavior", () => {
    render(<AccordionAbout items={mockItems} />)

    // Klik item pertama
    const trigger1 = screen.getByRole("button", { name: /Item 1/i })
    fireEvent.click(trigger1)
    expect(screen.getByText("Content 1")).toBeVisible()

    // Klik item kedua - item pertama harus tertutup
    const trigger2 = screen.getByRole("button", { name: /Item 2/i })
    fireEvent.click(trigger2)
    expect(screen.getByText("Content 2")).toBeVisible()

    // Verifikasi aria-expanded: item 1 tertutup, item 2 terbuka
    expect(trigger1).toHaveAttribute("aria-expanded", "false")
    expect(trigger2).toHaveAttribute("aria-expanded", "true")
  })

  it("toggle aria-expanded attribute dengan benar", () => {
    render(<AccordionAbout items={mockItems} />)

    const trigger = screen.getByRole("button", { name: /Item 1/i })

    // Initial state: collapsed
    expect(trigger).toHaveAttribute("aria-expanded", "false")

    // Setelah klik: expanded
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")

    // Klik lagi: collapsed
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "false")
  })
})
