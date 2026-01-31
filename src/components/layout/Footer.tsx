"use client"

import Link from "next/link"
import Image from "next/image"
import { Twitter, Linkedin, Instagram } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

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
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // White logo for dark mode, grey logo for light mode
  // Default to white (dark mode) during SSR to prevent hydration mismatch
  const logoSrc = mounted && resolvedTheme === "light"
    ? "/logo/makalah_logo_grey_500x500.png"
    : "/logo/makalah_logo_white_500x500.png"

  return (
    <div className="luxe-footer-wrapper" id="footer">
      <footer className="footer-luxe">
        {/* Subtle Background Pattern */}
        <div className="bg-diagonal-stripes" />

        <div className="container">
          {/* Grid: Brand + Links */}
          <div className="footer-grid">
            {/* Brand */}
            <div className="footer-brand">
              <Image
                src={logoSrc}
                alt="Makalah AI"
                width={32}
                height={32}
                className="logo-img"
              />
            </div>

            {/* Links */}
            <div className="footer-links">
              {/* Sumber Daya */}
              <div className="link-group">
                <h4>Sumber Daya</h4>
                {RESOURCE_LINKS.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Perusahaan */}
              <div className="link-group">
                <h4>Perusahaan</h4>
                {COMPANY_LINKS.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Legal */}
              <div className="link-group">
                <h4>Legal</h4>
                {LEGAL_LINKS.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom: Copyright + Socials */}
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Makalah AI. Hak cipta dilindungi.</p>
            <div className="socials">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
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
