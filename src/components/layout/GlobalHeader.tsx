"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useTheme } from "next-themes"
import { Menu, Sun, Moon } from "lucide-react"
import { SignedIn, SignedOut } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import { UserDropdown } from "./UserDropdown"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "/pricing", label: "Harga" },
  { href: "/chat", label: "Chat" },
  { href: "/blog", label: "Blog" },
  { href: "/documentation", label: "Dokumentasi" },
  { href: "/about", label: "Tentang" },
]

const SCROLL_THRESHOLD = 100 // px before header changes state

export function GlobalHeader() {
  const { resolvedTheme, setTheme } = useTheme()
  const pathname = usePathname()
  const [isHidden, setIsHidden] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const lastScrollYRef = useRef(0)
  const isDocumentation = pathname === "/documentation"

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY

    // Determine if we're past the threshold (not at top/hero)
    const pastThreshold = currentScrollY > SCROLL_THRESHOLD

    // Determine scroll direction using ref (no re-render on update)
    const isScrollingDown = currentScrollY > lastScrollYRef.current

    // Update states
    setIsScrolled(pastThreshold)

    // Only hide/show after passing threshold
    if (pastThreshold) {
      setIsHidden(isScrollingDown)
    } else {
      setIsHidden(false)
    }

    // Update ref without triggering re-render
    lastScrollYRef.current = currentScrollY
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  const handleDocumentationMenu = () => {
    if (!isDocumentation) return
    window.dispatchEvent(new CustomEvent("documentation:toggle-sidebar"))
  }

  return (
    <header
      className={cn(
        "global-header",
        isScrolled && "header-scrolled",
        isHidden && "header-hidden"
      )}
    >
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
          {/* Light text (for dark mode) - CSS handles visibility */}
          <Image
            src="/makalah_brand_text.svg"
            alt="Makalah"
            width={80}
            height={18}
            className="logo-brand-text logo-brand-light"
          />
          {/* Dark text (for light mode) - CSS handles visibility */}
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
        <button
          onClick={handleDocumentationMenu}
          className={cn(
            "md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/80 text-foreground transition hover:bg-muted",
            !isDocumentation && "cursor-not-allowed opacity-60"
          )}
          type="button"
          aria-label="Buka menu dokumentasi"
          disabled={!isDocumentation}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Theme Toggle - Only visible for logged-in users */}
        <SignedIn>
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            <Sun className="icon sun-icon" />
            <Moon className="icon moon-icon" />
          </button>
        </SignedIn>

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
