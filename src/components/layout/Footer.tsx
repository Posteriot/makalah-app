"use client"

import Link from "next/link"
import Image from "next/image"

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
    <footer className="site-footer">
      {/* Diagonal Stripes Separator */}
      <svg
        className="diagonal-stripes-footer"
        aria-hidden="true"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="diagonal-stripes-footer"
            x="0"
            y="0"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="10"
              x2="10"
              y2="0"
              stroke="currentColor"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diagonal-stripes-footer)" />
      </svg>

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
