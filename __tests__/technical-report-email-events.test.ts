import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  sendTechnicalReportDeveloperNotification,
  sendTechnicalReportUserNotification,
} from "../convex/authEmails"

describe("technical report email notifications", () => {
  const originalApiKey = process.env.RESEND_API_KEY
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    process.env.RESEND_API_KEY = "test_resend_key"
    fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: "email_test" }), { status: 200 }))
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    process.env.RESEND_API_KEY = originalApiKey
    vi.clearAllMocks()
  })

  it("sends developer email for status updates", async () => {
    await sendTechnicalReportDeveloperNotification({
      to: "dukungan@makalah.ai",
      reportId: "rpt_12345",
      source: "chat-inline",
      statusLabel: "Proses",
      fromStatusLabel: "Pending",
      summary: "Tool gagal dipanggil setelah user klik kirim.",
      timestampLabel: "5 Mar 2026, 21.55",
      dashboardUrl: "https://makalah.ai/dashboard?tab=technical-report",
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const request = fetchSpy.mock.calls[0]?.[1]
    const body = JSON.parse(String((request as RequestInit).body))

    expect(body.to).toBe("dukungan@makalah.ai")
    expect(body.subject).toContain("[Technical Report]")
    expect(body.subject).toContain("Pending")
    expect(body.subject).toContain("Proses")
    expect(body.subject).toContain("rpt_12345")
  })

  it("sends user email for created or changed status", async () => {
    await sendTechnicalReportUserNotification({
      email: "user@example.com",
      reportId: "rpt_99999",
      statusLabel: "Selesai",
      fromStatusLabel: "Proses",
      summary: "Model error sudah dianalisis dan ditandai selesai.",
      timestampLabel: "5 Mar 2026, 22.05",
      supportUrl: "https://makalah.ai/support/technical-report",
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const request = fetchSpy.mock.calls[0]?.[1]
    const body = JSON.parse(String((request as RequestInit).body))

    expect(body.to).toBe("user@example.com")
    expect(body.subject).toContain("[Technical Report]")
    expect(body.subject).toContain("Proses")
    expect(body.subject).toContain("Selesai")
    expect(body.html).toContain("rpt_99999")
  })
})
