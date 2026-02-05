"use client"

import Link from "next/link"
import Image from "next/image"
import { X as XIcon, Linkedin, Instagram } from "iconoir-react"
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
  { href: "#", label: "X", icon: XIcon },
  { href: "#", label: "LinkedIn", icon: Linkedin },
  { href: "#", label: "Instagram", icon: Instagram },
]

export function Footer() {
  return (
    <div id="footer" className="bg-background text-foreground">
      <footer className="relative overflow-hidden bg-[color:var(--section-bg-alt)]">
        {/* Subtle Background Pattern - using memoized React component */}
        <DiagonalStripes className="opacity-40" />

        {/* Content container - align with header (max-w-7xl) */}
        <div className="relative z-[1] mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
          {/* Grid: Brand + Links */}
          <div className="mb-10 grid grid-cols-16 gap-comfort text-center md:mb-16">
            {/* Brand */}
            <div className="col-span-16 flex items-center justify-center md:col-span-4 md:items-start md:justify-start">
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
            <div className="col-span-16 grid grid-cols-1 justify-items-center gap-comfort md:col-span-7 md:col-start-10 md:grid-cols-3 md:items-start md:justify-items-center">
              {/* Sumber Daya */}
              <div className="text-center md:text-left">
                <h4 className="text-narrative mb-3 text-[14px] font-medium text-foreground">
                  Sumber Daya
                </h4>
                {RESOURCE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-narrative mb-3 block text-[14px] font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Perusahaan */}
              <div className="text-center md:text-left">
                <h4 className="text-narrative mb-3 text-[14px] font-medium text-foreground">
                  Perusahaan
                </h4>
                {COMPANY_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-narrative mb-3 block text-[14px] font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Legal */}
              <div className="text-center md:text-left">
                <h4 className="text-narrative mb-3 text-[14px] font-medium text-foreground">
                  Legal
                </h4>
                {LEGAL_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-narrative mb-3 block text-[14px] font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="h-[0.5px] w-full bg-[color:var(--border-hairline)]" />

          {/* Bottom: Copyright + Socials */}
          <div className="flex flex-col items-center gap-6 pt-6 text-center md:flex-row md:justify-between md:text-left">
            <p className="text-interface m-0 text-[12px] text-muted-foreground">
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
                  className="flex items-center justify-center text-muted-foreground transition-colors duration-300 hover:text-foreground"
                >
                  <social.icon className="icon-interface" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
