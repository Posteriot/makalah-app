import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import DashboardLayout from "@/app/(dashboard)/layout"
import MarketingLayout from "@/app/(marketing)/layout"

vi.mock("@/components/layout/header", () => ({
  GlobalHeader: () => <div data-testid="global-header" />,
}))

vi.mock("@/components/layout/footer", () => ({
  Footer: () => <div data-testid="global-footer" />,
}))

describe("footer layout contract", () => {
  it("marketing layout memakai shell core untuk footer non-chat", async () => {
    const view = await MarketingLayout({ children: <div>Marketing Body</div> })
    render(view)

    expect(screen.getByText("Marketing Body").closest("[data-ui-scope='core']")).toBeInTheDocument()
    expect(screen.getByTestId("global-footer")).toBeInTheDocument()
  })

  it("dashboard layout memakai shell core untuk footer non-chat", () => {
    render(<DashboardLayout><div>Dashboard Body</div></DashboardLayout>)

    expect(screen.getByText("Dashboard Body").closest("[data-ui-scope='core']")).toBeInTheDocument()
    expect(screen.getByTestId("global-footer")).toBeInTheDocument()
  })
})
