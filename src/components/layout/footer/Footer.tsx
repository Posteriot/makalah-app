"use client"

import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import type { ComponentType, SVGProps } from "react"
import { X as XIcon, Linkedin, Instagram } from "iconoir-react"
import { GridPattern, DottedPattern, DiagonalStripes } from "@/components/marketing/SectionBackground"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/lib/auth-client"
import {
  FOOTER_SUPPORT_PATH,
  resolveFooterSections,
  resolveFooterSocialLinks,
  type FooterSectionItem,
} from "./footer-config"

// Map CMS platform names to iconoir icons
const PLATFORM_ICON_MAP: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  x: XIcon,
  twitter: XIcon,
  linkedin: Linkedin,
  instagram: Instagram,
}

function SocialIcon({ iconId, icon: IconComponent, label }: {
  iconId?: Id<"_storage"> | null
  icon: ComponentType<SVGProps<SVGSVGElement>> | null
  label: string
}) {
  const iconUrl = useQuery(
    api.pageContent.getImageUrl,
    iconId ? { storageId: iconId } : "skip"
  )

  if (iconId && iconUrl === undefined) {
    return <Skeleton data-testid="footer-social-icon-skeleton" className="h-4 w-4 rounded-full" />
  }

  if (iconUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={iconUrl} alt={label} className="h-4 w-4" />
  }

  if (IconComponent) {
    return <IconComponent className="footer-icon" />
  }

  return null
}

function FooterSkeleton() {
  return (
    <div id="footer" className="footer-shell" data-testid="footer-skeleton">
      <footer className="footer-surface">
        <div className="footer-content" aria-hidden="true">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded-[4px]" />
                <Skeleton className="h-[18px] w-24 rounded-[4px]" />
              </div>
            </div>

            <div className="footer-links-grid">
              {[0, 1, 2].map((section) => (
                <div key={section} className="footer-section">
                  <Skeleton className="mb-3 h-4 w-24 rounded-[4px]" />
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-28 rounded-[4px]" />
                    <Skeleton className="h-4 w-24 rounded-[4px]" />
                    <Skeleton className="h-4 w-20 rounded-[4px]" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="footer-divider" />

          <div className="footer-meta">
            <div className="footer-meta-copy">
              <Skeleton className="h-3 w-40 rounded-[4px]" />
              <Skeleton className="h-3 w-32 rounded-[4px]" />
            </div>
            <div className="footer-socials">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export function Footer() {
  const { data: session } = useSession()
  const footerConfig = useQuery(api.siteConfig.getConfig, { key: "footer" })
  const supportHref = session
    ? FOOTER_SUPPORT_PATH
    : `/sign-in?${new URLSearchParams({ redirect_url: FOOTER_SUPPORT_PATH }).toString()}`

  // CMS logo URLs (resolve storage IDs, fallback to static)
  const cmsLogoDarkUrl = useQuery(
    api.pageContent.getImageUrl,
    footerConfig?.logoDarkId ? { storageId: footerConfig.logoDarkId as Id<"_storage"> } : "skip"
  )
  const cmsLogoLightUrl = useQuery(
    api.pageContent.getImageUrl,
    footerConfig?.logoLightId ? { storageId: footerConfig.logoLightId as Id<"_storage"> } : "skip"
  )
  const isFooterConfigLoading = footerConfig === undefined
  const isBrandAssetLoading =
    isFooterConfigLoading ||
    (Boolean(footerConfig?.logoDarkId) && cmsLogoDarkUrl === undefined) ||
    (Boolean(footerConfig?.logoLightId) && cmsLogoLightUrl === undefined)

  if (isBrandAssetLoading) {
    return <FooterSkeleton />
  }

  const logoDark = cmsLogoDarkUrl ?? "/logo/makalah_logo_light.svg"
  const logoLight = cmsLogoLightUrl ?? "/logo/makalah_logo_dark.svg"

  const footerSections = resolveFooterSections(
    footerConfig?.footerSections as FooterSectionItem[] | undefined,
    supportHref
  )

  // CMS company description (no fallback — empty if not set)
  const companyDescription = (footerConfig?.companyDescription as string | undefined) || ""

  // CMS copyright (no fallback — empty if not set)
  const copyrightText = footerConfig?.copyrightText
    ? (footerConfig.copyrightText as string).replace("{year}", String(new Date().getFullYear()))
    : ""

  // CMS social links with fallback
  type CmsSocialLink = { platform: string; url: string; isVisible: boolean; iconId?: Id<"_storage"> }
  const cmsSocials = footerConfig?.socialLinks as CmsSocialLink[] | undefined
  const socialLinks = resolveFooterSocialLinks(cmsSocials).map((s) => ({
    href: s.url,
    label: s.platform,
    icon: PLATFORM_ICON_MAP[s.platform.toLowerCase()] ?? null,
    iconId: s.iconId ?? null,
  }))
  const hasFooterMeta = Boolean(companyDescription || copyrightText || socialLinks.length > 0)

  return (
    <div id="footer" className="footer-shell">
      <footer className="footer-surface">
        {/* Background patterns — conditional via CMS */}
        {footerConfig != null && footerConfig.showGridPattern !== false && <GridPattern className="z-0" />}
        {footerConfig != null && footerConfig.showDottedPattern !== false && <DottedPattern spacing={24} withRadialMask={false} className="z-0" />}
        {footerConfig != null && footerConfig.showDiagonalStripes !== false && <DiagonalStripes className="opacity-40" />}

        <div className="footer-content">
          {/* Grid: Brand + Links */}
          <div className="footer-grid">
            {/* Brand */}
            <div className="footer-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoDark} alt="Makalah AI" width={24} height={24} className="hidden dark:block" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoLight} alt="Makalah AI" width={24} height={24} className="block dark:hidden" />
            </div>

            <div className="footer-links-grid">
              {footerSections.map((section, index) => (
                <div key={index} className="footer-section">
                  <h4 className="footer-heading">
                    {section.title}
                  </h4>
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="footer-link"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {hasFooterMeta ? (
            <>
              <div className="footer-divider" />

              <div className="footer-meta">
                <div className="footer-meta-copy">
                  {companyDescription && (
                    <p className="footer-meta-line">
                      {companyDescription}
                    </p>
                  )}
                  {copyrightText && (
                    <p className="footer-meta-line">
                      {copyrightText}
                    </p>
                  )}
                </div>
                {socialLinks.length > 0 ? (
                  <div className="footer-socials">
                    {socialLinks.map((social) => (
                      <a
                        key={social.label}
                        href={social.href}
                        aria-label={social.label}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-social-link"
                      >
                        <SocialIcon
                          iconId={"iconId" in social ? social.iconId : null}
                          icon={social.icon}
                          label={social.label}
                        />
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </footer>
    </div>
  )
}
