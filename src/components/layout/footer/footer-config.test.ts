import { describe, expect, it } from "vitest"
import {
  FOOTER_SUPPORT_LABEL,
  resolveFooterSections,
  resolveFooterSocialLinks,
  stripSystemFooterLinks,
} from "./footer-config"

describe("footer config helpers", () => {
  it("menyuntikkan link sistem Lapor Masalah tepat satu kali ke section Sumber Daya", () => {
    const sections = resolveFooterSections(
      [
        {
          title: "Sumber Daya",
          links: [
            { label: "Blog", href: "/blog" },
            { label: FOOTER_SUPPORT_LABEL, href: "/legacy" },
            { label: "Kerja Sama Bisnis", href: "/about#kontak" },
          ],
        },
      ],
      "/support/technical-report?source=footer-link"
    )

    expect(sections).toHaveLength(1)
    expect(
      sections[0].links.filter((link) => link.label === FOOTER_SUPPORT_LABEL)
    ).toHaveLength(1)
    expect(sections[0].links[2]).toEqual({
      label: FOOTER_SUPPORT_LABEL,
      href: "/support/technical-report?source=footer-link",
    })
  })

  it("menghapus link sistem dari data editable CMS", () => {
    const sections = stripSystemFooterLinks([
      {
        title: "Sumber Daya",
        links: [
          { label: "Blog", href: "/blog" },
          { label: FOOTER_SUPPORT_LABEL, href: "/legacy" },
        ],
      },
    ])

    expect(sections[0].links).toEqual([{ label: "Blog", href: "/blog" }])
  })

  it("hanya mereturn social link yang visible dan punya URL final", () => {
    const socials = resolveFooterSocialLinks([
      { platform: "x", url: "", isVisible: true },
      { platform: "linkedin", url: "https://linkedin.com/company/makalah", isVisible: true },
      { platform: "instagram", url: "https://instagram.com/makalah", isVisible: false },
    ])

    expect(socials).toEqual([
      {
        platform: "linkedin",
        url: "https://linkedin.com/company/makalah",
        isVisible: true,
      },
    ])
  })
})
