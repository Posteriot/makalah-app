export type FooterLinkItem = {
  label: string
  href: string
}

export type FooterSectionItem = {
  title: string
  links: FooterLinkItem[]
}

export type FooterSocialItem<TIconId = string> = {
  platform: string
  url: string
  isVisible: boolean
  iconId?: TIconId | null
}

export const FOOTER_SUPPORT_PATH = "/support/technical-report?source=footer-link"
export const FOOTER_SUPPORT_LABEL = "Lapor Masalah"
export const FOOTER_RESOURCE_SECTION = "Sumber Daya"

export const DEFAULT_FOOTER_SECTIONS: FooterSectionItem[] = [
  {
    title: FOOTER_RESOURCE_SECTION,
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/documentation", label: "Dokumentasi" },
      { href: "/about#kontak", label: "Kerja Sama Bisnis" },
    ],
  },
  {
    title: "Perusahaan",
    links: [
      { href: "/about#bergabung-dengan-tim", label: "Karier" },
      { href: "/about", label: "Tentang kami" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/security", label: "Security" },
      { href: "/terms", label: "Terms" },
    ],
  },
]

function normalizeLabel(value: string) {
  return value.trim().toLowerCase()
}

export function stripSystemFooterLinks(sections: FooterSectionItem[] | undefined | null) {
  return (sections ?? []).map((section) => ({
    ...section,
    links: section.links.filter((link) => normalizeLabel(link.label) !== normalizeLabel(FOOTER_SUPPORT_LABEL)),
  }))
}

export function resolveFooterSections(
  sections: FooterSectionItem[] | undefined | null,
  supportHref: string
) {
  const baseSections = stripSystemFooterLinks(
    sections && sections.length > 0 ? sections : DEFAULT_FOOTER_SECTIONS
  )

  const resourceIndex = baseSections.findIndex(
    (section) => normalizeLabel(section.title) === normalizeLabel(FOOTER_RESOURCE_SECTION)
  )

  if (resourceIndex === -1) {
    return [
      {
        title: FOOTER_RESOURCE_SECTION,
        links: [{ href: supportHref, label: FOOTER_SUPPORT_LABEL }],
      },
      ...baseSections,
    ]
  }

  return baseSections.map((section, index) => {
    if (index !== resourceIndex) return section

    const links = [...section.links]
    const kerjaSamaIndex = links.findIndex(
      (link) => normalizeLabel(link.label) === normalizeLabel("Kerja Sama Bisnis")
    )
    const insertIndex = kerjaSamaIndex >= 0 ? kerjaSamaIndex + 1 : links.length
    links.splice(insertIndex, 0, { href: supportHref, label: FOOTER_SUPPORT_LABEL })

    return {
      ...section,
      links,
    }
  })
}

export function resolveFooterSocialLinks<TIconId>(
  socialLinks: FooterSocialItem<TIconId>[] | undefined | null
) {
  return (socialLinks ?? []).filter((social) => social.isVisible && social.url.trim().length > 0)
}
