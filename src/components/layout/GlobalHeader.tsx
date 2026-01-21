"use client"

import Link from "next/link"
import Image from "next/image"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { SignedIn, SignedOut } from "@clerk/nextjs"
import { UserDropdown } from "./UserDropdown"

const NAV_LINKS = [
  { href: "/pricing", label: "Harga" },
  { href: "/chat", label: "Chat" },
  { href: "/blog", label: "Blog" },
  { href: "/documentation", label: "Dokumentasi" },
  { href: "/about", label: "Tentang" },
]

export function GlobalHeader() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <header className="global-header">
      {/* Header Left - Logo & Brand */}
      <div className="header-left">
        <Link href="/" className="header-brand">
          <Image
            src="/logo/makalah_logo_500x500.png"
            alt="Makalah"
            width={32}
            height={32}
            className="logo-img"
          />
          {/* Light text (for dark mode) */}
          <Image
            src="/makalah_brand_text.svg"
            alt="Makalah"
            width={80}
            height={18}
            className="logo-brand-text logo-brand-light"
          />
          {/* Dark text (for light mode) */}
          <Image
            src="/makalah_brand_text_dark.svg"
            alt="Makalah"
            width={80}
            height={18}
            className="logo-brand-text logo-brand-dark"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="header-nav">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="nav-link">
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Header Right - Theme Toggle & Auth */}
      <div className="header-right">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          <Sun className="icon sun-icon" />
          <Moon className="icon moon-icon" />
        </button>

        {/* Auth State */}
        <SignedOut>
          <Link href="/sign-in" className="btn btn-green-solid">
            Masuk
          </Link>
        </SignedOut>

        <SignedIn>
          <UserDropdown />
        </SignedIn>
      </div>

      {/* Diagonal Stripes Separator */}
      <svg
        className="diagonal-stripes-header"
        aria-hidden="true"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="diagonal-stripes-header"
            x="0"
            y="0"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="10" x2="10" y2="0" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diagonal-stripes-header)" />
      </svg>
    </header>
  )
}
