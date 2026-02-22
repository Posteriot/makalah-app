"use client"

import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import type { ComponentType, SVGProps } from "react"
import { X as XIcon, Linkedin, Instagram } from "iconoir-react"
import { GridPattern, DottedPattern, DiagonalStripes } from "@/components/marketing/SectionBackground"

const RESOURCE_LINKS = [
  { href: "/blog", label: "Blog" },
  { href: "/documentation", label: "Dokumentasi" },
  { href: "/about#kontak", label: "Kerja Sama Bisnis" },
]

const COMPANY_LINKS = [
  { href: "/about#bergabung-dengan-tim", label: "Karier" },
  { href: "/about", label: "Tentang kami" },
]

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/security", label: "Security" },
  { href: "/terms", label: "Terms" },
]

// Map CMS platform names to iconoir icons
const PLATFORM_ICON_MAP: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  x: XIcon,
  twitter: XIcon,
  linkedin: Linkedin,
  instagram: Instagram,
}

const DEFAULT_SOCIAL_LINKS = [
  { href: "#", label: "X", icon: XIcon },
  { href: "#", label: "LinkedIn", icon: Linkedin },
  { href: "#", label: "Instagram", icon: Instagram },
]


function SocialIcon({ iconId, icon: IconComponent, label }: {
  iconId?: Id<"_storage"> | null
  icon: ComponentType<SVGProps<SVGSVGElement>> | null
  label: string
}) {
  const iconUrl = useQuery(
    api.pageContent.getImageUrl,
    iconId ? { storageId: iconId } : "skip"
  )

  if (iconUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={iconUrl} alt={label} className="h-4 w-4" />
  }

  if (IconComponent) {
    return <IconComponent className="icon-interface" />
  }

  return null
}

export function Footer() {
  const footerConfig = useQuery(api.siteConfig.getConfig, { key: "footer" })

  // CMS logo URLs (resolve storage IDs, fallback to static)
  const cmsLogoDarkUrl = useQuery(
    api.pageContent.getImageUrl,
    footerConfig?.logoDarkId ? { storageId: footerConfig.logoDarkId as Id<"_storage"> } : "skip"
  )
  const cmsLogoLightUrl = useQuery(
    api.pageContent.getImageUrl,
    footerConfig?.logoLightId ? { storageId: footerConfig.logoLightId as Id<"_storage"> } : "skip"
  )

  const logoDark = cmsLogoDarkUrl ?? "/logo/makalah_logo_light.svg"
  const logoLight = cmsLogoLightUrl ?? "/logo/makalah_logo_dark.svg"

  // CMS footer sections with hardcoded fallback
  const footerSections = footerConfig?.footerSections
    ? (footerConfig.footerSections as Array<{ title: string; links: Array<{ label: string; href: string }> }>)
    : [
        { title: "Sumber Daya", links: RESOURCE_LINKS },
        { title: "Perusahaan", links: COMPANY_LINKS },
        { title: "Legal", links: LEGAL_LINKS },
      ]

  // CMS company description (no fallback — empty if not set)
  const companyDescription = (footerConfig?.companyDescription as string | undefined) || ""

  // CMS copyright (no fallback — empty if not set)
  const copyrightText = footerConfig?.copyrightText
    ? (footerConfig.copyrightText as string).replace("{year}", String(new Date().getFullYear()))
    : ""

  // CMS social links with fallback
  type CmsSocialLink = { platform: string; url: string; isVisible: boolean; iconId?: Id<"_storage"> }
  const cmsSocials = footerConfig?.socialLinks as CmsSocialLink[] | undefined
  const socialLinks = cmsSocials
    ? cmsSocials
        .filter((s) => s.isVisible && s.url)
        .map((s) => ({
          href: s.url,
          label: s.platform,
          icon: PLATFORM_ICON_MAP[s.platform.toLowerCase()] ?? null,
          iconId: s.iconId ?? null,
        }))
        .filter((s) => s.icon !== null || s.iconId !== null)
    : DEFAULT_SOCIAL_LINKS

  return (
    <div id="footer" className="bg-background text-foreground">
      <footer className="relative overflow-hidden bg-[color:var(--footer-background)]">
        {/* Background patterns — conditional via CMS */}
        {footerConfig?.showGridPattern === true && <GridPattern className="z-0" />}
        {footerConfig?.showDottedPattern === true && <DottedPattern spacing={24} withRadialMask={false} className="z-0" />}
        {footerConfig?.showDiagonalStripes !== false && <DiagonalStripes className="opacity-40" />}

        {/* Content container - align with header (max-w-7xl) */}
        <div className="relative z-[1] mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
          {/* Grid: Brand + Links */}
          <div className="mb-10 grid grid-cols-16 gap-comfort text-center md:mb-16">
            {/* Brand */}
            <div className="col-span-16 flex items-center justify-center md:col-span-4 md:items-start md:justify-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoDark} alt="Makalah AI" width={24} height={24} className="hidden dark:block" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoLight} alt="Makalah AI" width={24} height={24} className="block dark:hidden" />
            </div>

            {/* Links - right side, left-aligned text */}
            <div className="col-span-16 grid grid-cols-1 justify-items-center gap-comfort md:col-span-7 md:col-start-10 md:grid-cols-3 md:items-start md:justify-items-center">
              {footerSections.map((section, index) => (
                <div key={index} className="text-center md:text-left">
                  <h4 className="text-narrative mb-3 text-[14px] font-medium text-foreground">
                    {section.title}
                  </h4>
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-narrative mb-3 block text-[14px] font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="h-[0.5px] w-full bg-[color:var(--border-hairline)]" />

          {/* Bottom: Copyright + Socials */}
          <div className="flex flex-col items-center gap-6 pt-6 text-center md:flex-row md:justify-between md:text-left">
            <div className="space-y-1">
              {companyDescription && (
                <p className="text-interface m-0 text-[12px] text-muted-foreground">
                  {companyDescription}
                </p>
              )}
              {copyrightText && (
                <p className="text-interface m-0 text-[12px] text-muted-foreground">
                  {copyrightText}
                </p>
              )}
            </div>
            <div className="flex justify-center gap-6">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center text-muted-foreground transition-colors duration-300 hover:text-foreground"
                >
                  <SocialIcon
                    iconId={"iconId" in social ? social.iconId : null}
                    icon={social.icon}
                    label={social.label}
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
