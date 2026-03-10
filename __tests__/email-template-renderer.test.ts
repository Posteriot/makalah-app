import { renderEmailTemplate } from "@/lib/email/template-renderer"

const mockBrand = {
  appName: "Test App",
  primaryColor: "#2563eb",
  secondaryColor: "#16a34a",
  backgroundColor: "#f8fafc",
  contentBackgroundColor: "#ffffff",
  textColor: "#1e293b",
  mutedTextColor: "#64748b",
  fontFamily: "Arial, sans-serif",
  footerText: "© 2026 Test",
  footerLinks: [{ label: "Home", url: "https://test.com" }],
}

describe("renderEmailTemplate", () => {
  it("renders heading section", async () => {
    const html = await renderEmailTemplate(mockBrand, "Test Subject", [
      { id: "1", type: "heading", content: "Hello World" },
    ])
    expect(html).toContain("Hello World")
    expect(html).toContain('alt="Makalah"') // brand logo in header
  })

  it("renders paragraph section", async () => {
    const html = await renderEmailTemplate(mockBrand, "Test", [
      { id: "1", type: "paragraph", content: "Some paragraph text here." },
    ])
    expect(html).toContain("Some paragraph text here.")
  })

  it("renders button with brand primaryColor", async () => {
    const html = await renderEmailTemplate(mockBrand, "Test", [
      { id: "1", type: "button", label: "Click Me", url: "https://example.com" },
    ])
    expect(html).toContain("Click Me")
    expect(html).toContain("https://example.com")
    expect(html).toContain("#2563eb") // primaryColor
  })

  it("preserves {{placeholder}} text", async () => {
    const html = await renderEmailTemplate(mockBrand, "Test", [
      { id: "1", type: "paragraph", content: "Hello {{userName}}, welcome!" },
    ])
    expect(html).toContain("{{userName}}")
  })

  it("renders footer with brand text", async () => {
    const html = await renderEmailTemplate(mockBrand, "Test", [])
    expect(html).toContain("© 2026 Test")
  })

  it("renders footer links", async () => {
    const html = await renderEmailTemplate(mockBrand, "Test", [])
    expect(html).toContain("https://test.com")
    expect(html).toContain("Home")
  })

  it("renders otp_code section with monospace", async () => {
    const html = await renderEmailTemplate(mockBrand, "Test", [
      { id: "1", type: "otp_code", content: "{{otpCode}}" },
    ])
    expect(html).toContain("{{otpCode}}")
    expect(html).toContain("monospace")
  })

  it("renders divider", async () => {
    const html = await renderEmailTemplate(mockBrand, "Test", [
      { id: "1", type: "divider" },
    ])
    expect(html).toContain("<hr")
  })

  it("renders info_box section", async () => {
    const html = await renderEmailTemplate(mockBrand, "Test", [
      { id: "1", type: "info_box", content: "Important notice here" },
    ])
    expect(html).toContain("Important notice here")
  })

  it("renders detail_row section with rows", async () => {
    const html = await renderEmailTemplate(mockBrand, "Test", [
      {
        id: "1",
        type: "detail_row",
        rows: [
          { label: "Order ID", value: "ORD-123" },
          { label: "Amount", value: "Rp 100.000" },
        ],
      },
    ])
    expect(html).toContain("Order ID")
    expect(html).toContain("ORD-123")
    expect(html).toContain("Amount")
    expect(html).toContain("Rp 100.000")
  })

  it("applies section style overrides", async () => {
    const html = await renderEmailTemplate(mockBrand, "Test", [
      {
        id: "1",
        type: "heading",
        content: "Custom Heading",
        style: { textColor: "#ff0000", fontSize: "32px" },
      },
    ])
    expect(html).toContain("#ff0000")
    expect(html).toContain("32px")
  })

  it("renders multiple sections in order", async () => {
    const html = await renderEmailTemplate(mockBrand, "Test", [
      { id: "1", type: "heading", content: "Title" },
      { id: "2", type: "paragraph", content: "Body text" },
      { id: "3", type: "button", label: "Action", url: "https://example.com" },
    ])
    expect(html).toContain("Title")
    expect(html).toContain("Body text")
    expect(html).toContain("Action")
  })

  it("renders subject as preview text", async () => {
    const html = await renderEmailTemplate(mockBrand, "My Subject Line", [])
    expect(html).toContain("My Subject Line")
  })

  it("skips unknown section types", async () => {
    const html = await renderEmailTemplate(mockBrand, "Test", [
      { id: "1", type: "unknown_type", content: "ignored" },
    ])
    // Should still render without errors
    expect(html).toContain('alt="Makalah"')
    // Unknown content should not appear
    expect(html).not.toContain("ignored")
  })
})
