import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { TechnicalReportForm } from "@/components/technical-report/TechnicalReportForm"

vi.mock("@/lib/hooks/useTechnicalReport", () => ({
  useTechnicalReport: () => ({
    submitReport: vi.fn(),
    contexts: [],
    isSubmitting: false,
  }),
}))

describe("TechnicalReportForm", () => {
  it("requires description before submit", async () => {
    const user = userEvent.setup()
    render(<TechnicalReportForm source="support-page" />)

    await user.click(screen.getByRole("button", { name: /kirim laporan/i }))

    expect(screen.getByText(/deskripsi laporan wajib diisi/i)).toBeInTheDocument()
  })
})
