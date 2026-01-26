"use client"

import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

const RESOURCE_LINKS = [
  { href: "/documentation", label: "Dokumentasi" },
  { href: "/faq", label: "FAQ" },
]

const COMPANY_LINKS = [
  { href: "/about#bergabung-dengan-tim", label: "Karir" },
  { href: "/about#hubungi-kami", label: "Kontak" },
  { href: "/documentation#privacy-policy", label: "Kebijakan Privasi" },
]

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <footer className="site-footer relative">
      {/* Horizontal line border at top - same style as header bottom line */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0",
          "h-px bg-border"
        )}
      />

      <div className="footer-container">
        {/* Left: Brand + Copyright */}
        <div className="footer-brand-section">
          <button
            onClick={scrollToTop}
            className="footer-logo-btn"
            aria-label="Scroll to top"
          >
            <Image
              src="/logo/makalah_logo_500x500.png"
              alt="Makalah"
              width={32}
              height={32}
              className="footer-logo"
            />
          </button>
          <div className="footer-copyright">
            <span>&copy; {new Date().getFullYear()} Makalah AI</span>
            <span>Semua hak cipta dilindungi.</span>
          </div>
        </div>

        {/* Right: Links */}
        <div className="footer-links">
          <div className="footer-links-group">
            <h4 className="footer-links-heading">Sumber Daya</h4>
            <ul className="footer-links-list">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="footer-links-group">
            <h4 className="footer-links-heading">Perusahaan</h4>
            <ul className="footer-links-list">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}
