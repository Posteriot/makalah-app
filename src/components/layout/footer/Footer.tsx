"use client"

import Link from "next/link"
import Image from "next/image"
import { Twitter, Linkedin, Instagram } from "lucide-react"
import { DiagonalStripes } from "@/components/marketing/SectionBackground"

const RESOURCE_LINKS = [
  { href: "/blog", label: "Blog" },
  { href: "/documentation", label: "Dokumentasi" },
  { href: "/about#kontak", label: "Hubungi Sales" },
]

const COMPANY_LINKS = [
  { href: "/about#bergabung-dengan-tim", label: "Karier" },
  { href: "/about", label: "Tentang kami" },
  { href: "/about#security", label: "Security" },
]

const LEGAL_LINKS = [
  { href: "/about#privacy-policy", label: "Privacy" },
  { href: "/about#terms", label: "Terms" },
]

const SOCIAL_LINKS = [
  { href: "#", label: "X", icon: Twitter },
  { href: "#", label: "LinkedIn", icon: Linkedin },
  { href: "#", label: "Instagram", icon: Instagram },
]

export function Footer() {
  return (
    <div
      id="footer"
      className="bg-[#f8f8f8] dark:bg-black"
    >
      <footer className="relative overflow-hidden bg-white dark:bg-[#0c0c0e]">
        {/* Subtle Background Pattern - using memoized React component */}
        <DiagonalStripes withFadeMask={true} className="opacity-60" />

        {/* Content container - same alignment as header (max-width 1200px, 24px padding) */}
        <div className="relative z-[1] mx-auto max-w-[1200px] px-6 py-12 md:py-16">
          {/* Grid: Brand + Links */}
          <div className="mb-10 flex flex-col items-center gap-10 text-center md:mb-16 md:flex-row md:items-start md:justify-between md:gap-20 md:text-left">
            {/* Brand */}
            <div className="flex items-center justify-center md:justify-start">
              {/* Light logo (for dark mode) */}
              <Image
                src="/logo/makalah_logo_light.svg"
                alt="Makalah AI"
                width={32}
                height={32}
                className="logo-img logo-img-light"
              />
              {/* Dark logo (for light mode) */}
              <Image
                src="/logo/makalah_logo_dark.svg"
                alt="Makalah AI"
                width={32}
                height={32}
                className="logo-img logo-img-dark"
              />
            </div>

            {/* Links - right side, left-aligned text */}
            <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:gap-16">
              {/* Sumber Daya */}
              <div className="text-center md:text-left">
                <h4 className="mb-6 text-sm font-normal uppercase tracking-[0.1em]">
                  Sumber Daya
                </h4>
                {RESOURCE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="mb-3 block text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground dark:hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Perusahaan */}
              <div className="text-center md:text-left">
                <h4 className="mb-6 text-sm font-normal uppercase tracking-[0.1em]">
                  Perusahaan
                </h4>
                {COMPANY_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="mb-3 block text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground dark:hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Legal */}
              <div className="text-center md:text-left">
                <h4 className="mb-6 text-sm font-normal uppercase tracking-[0.1em]">
                  Legal
                </h4>
                {LEGAL_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="mb-3 block text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground dark:hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom: Copyright + Socials */}
          <div className="flex flex-col items-center gap-6 border-t border-black/[0.08] pt-8 text-center text-xs text-muted-foreground md:flex-row md:justify-between dark:border-white/[0.05]">
            <p className="m-0">
              &copy; {new Date().getFullYear()} Makalah AI. Hak cipta dilindungi.
            </p>
            <div className="flex justify-center gap-6">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:text-foreground dark:hover:text-white"
                >
                  <social.icon size={20} strokeWidth={2} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
