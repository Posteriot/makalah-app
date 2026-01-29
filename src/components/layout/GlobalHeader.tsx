"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useTheme } from "next-themes"
import { Menu, X, Sun, Moon, User, CreditCard, Settings, LogOut, Loader2 } from "lucide-react"
import { SignedIn, SignedOut, useUser, useClerk } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import { UserDropdown } from "./UserDropdown"
import { UserSettingsModal } from "@/components/settings/UserSettingsModal"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const NAV_LINKS = [
  { href: "/pricing", label: "Harga" },
  { href: "/chat", label: "Chat" },
  { href: "/blog", label: "Blog" },
  { href: "/documentation", label: "Dokumentasi" },
  { href: "/about", label: "Tentang" },
]

const SCROLL_THRESHOLD = 100 // px before header changes state
const SCROLL_DOWN_DELTA = 8  // px minimum to hide header (less sensitive)
const SCROLL_UP_DELTA = 2    // px minimum to show header (more sensitive)

// Segment configuration for user badge
type SegmentType = "gratis" | "bpp" | "pro" | "admin" | "superadmin"

const SEGMENT_CONFIG: Record<SegmentType, { label: string; className: string }> = {
  gratis: { label: "GRATIS", className: "bg-segment-gratis text-white" },
  bpp: { label: "BPP", className: "bg-segment-bpp text-white" },
  pro: { label: "PRO", className: "bg-segment-pro text-white" },
  admin: { label: "ADMIN", className: "bg-segment-admin text-white" },
  superadmin: { label: "SUPERADMIN", className: "bg-segment-superadmin text-white" },
}

function getSegmentFromUser(role?: string, subscriptionStatus?: string): SegmentType {
  if (role === "superadmin") return "superadmin"
  if (role === "admin") return "admin"
  if (subscriptionStatus === "pro") return "pro"
  if (subscriptionStatus === "bpp") return "bpp"
  return "gratis"
}

export function GlobalHeader() {
  const { resolvedTheme, setTheme } = useTheme()
  const pathname = usePathname()
  const [isHidden, setIsHidden] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [mounted, setMounted] = useState(false)
  const lastScrollYRef = useRef(0)
  const isDocumentation = pathname === "/documentation"

  // Clerk and Convex user data for mobile menu
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()
  const { user: convexUser, isLoading: isConvexLoading } = useCurrentUser()

  // Prevent hydration mismatch for theme toggle
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY

    // Determine if we're past the threshold (not at top/hero)
    const pastThreshold = currentScrollY > SCROLL_THRESHOLD

    // Calculate scroll delta for direction detection
    const scrollDelta = currentScrollY - lastScrollYRef.current

    // Update scrolled state (for background)
    setIsScrolled(pastThreshold)

    if (pastThreshold) {
      // Asymmetric sensitivity: scroll up (show) more sensitive than scroll down (hide)
      if (scrollDelta > SCROLL_DOWN_DELTA) {
        // Scrolling down - hide header
        setIsHidden(true)
        lastScrollYRef.current = currentScrollY
      } else if (scrollDelta < -SCROLL_UP_DELTA) {
        // Scrolling up - show header (more sensitive)
        setIsHidden(false)
        lastScrollYRef.current = currentScrollY
      }
    } else {
      setIsHidden(false)
      lastScrollYRef.current = currentScrollY
    }
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Close mobile menu on click outside
  useEffect(() => {
    if (!isMobileMenuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.global-header')) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isMobileMenuOpen])

  const toggleTheme = () => {
    if (!mounted) return // Prevent toggle before hydration
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev)
  }

  const handleDocumentationSidebar = () => {
    window.dispatchEvent(new CustomEvent("documentation:toggle-sidebar"))
  }

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      await signOut()
    } catch (error) {
      console.error("Sign out failed:", error)
      toast.error("Gagal keluar. Silakan coba lagi.")
      setIsSigningOut(false)
    }
  }

  // Derived user data for mobile menu
  const firstName = clerkUser?.firstName || "User"
  const lastName = clerkUser?.lastName || ""
  const fullName = `${firstName} ${lastName}`.trim()
  const initial = firstName.charAt(0).toUpperCase()
  const segment = getSegmentFromUser(convexUser?.role, convexUser?.subscriptionStatus)
  const segmentConfig = SEGMENT_CONFIG[segment]
  const canRenderBadge = !isConvexLoading && segment !== "superadmin"
  const isAdmin = segment === "admin" || segment === "superadmin"

  return (
    <header
      className={cn(
        "global-header",
        (isScrolled || isMobileMenuOpen) && "header-scrolled",
        isHidden && "header-hidden"
      )}
    >
      {/* Inner container - matches hero max-width for alignment */}
      <div className="header-inner">
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
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn("nav-link", isActive && "active")}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Header Right - Theme Toggle & Auth */}
      <div className="header-right">
        {/* Mobile Menu Toggle */}
        <button
          onClick={toggleMobileMenu}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/80 text-foreground transition hover:bg-muted"
          type="button"
          aria-label={isMobileMenuOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Theme Toggle - Desktop only for logged-in users (mobile shows in panel) */}
        <SignedIn>
          <button
            onClick={toggleTheme}
            className="theme-toggle hidden md:inline-flex"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            <Sun className="icon sun-icon" />
            <Moon className="icon moon-icon" />
          </button>
        </SignedIn>

        {/* Auth State - Desktop only (mobile shows in panel) */}
        <SignedOut>
          <Link href="/sign-in" className="btn btn-green-solid hidden md:inline-flex">
            Masuk
          </Link>
        </SignedOut>

        <SignedIn>
          <div className="hidden md:block">
            <UserDropdown />
          </div>
        </SignedIn>
      </div>
      </div>{/* End header-inner */}

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <nav className="mobile-menu md:hidden">
          {/* Main Navigation Links */}
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn("mobile-menu__link", isActive && "mobile-menu__link--active")}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            )
          })}

          {/* SignedOut: Show login button */}
          <SignedOut>
            <Link
              href="/sign-in"
              className="mobile-menu__cta"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Masuk
            </Link>
          </SignedOut>

          {/* SignedIn: Show theme toggle + user section */}
          <SignedIn>
            {/* Hairline Divider */}
            <div className="mobile-menu__divider" />

            {/* Theme Toggle Row - use mounted check to prevent hydration mismatch */}
            <button
              onClick={toggleTheme}
              className="mobile-menu__link mobile-menu__theme-toggle"
              type="button"
              disabled={!mounted}
            >
              {(mounted ? resolvedTheme : "dark") === "dark" ? (
                <>
                  <Sun className="h-4 w-4" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            {/* User Info Header */}
            <div className="mobile-menu__user-header">
              <div className="mobile-menu__avatar">
                {initial}
              </div>
              <div className="mobile-menu__user-info">
                <span className="mobile-menu__user-name">{fullName}</span>
                {canRenderBadge && (
                  <span className={cn("mobile-menu__badge", segmentConfig.className)}>
                    {segmentConfig.label}
                  </span>
                )}
              </div>
            </div>

            {/* User Menu Items */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false)
                setIsSettingsOpen(true)
              }}
              className="mobile-menu__link mobile-menu__user-link"
              type="button"
            >
              <User className="h-4 w-4" />
              <span>Atur Akun</span>
            </button>

            <Link
              href="/subscription/overview"
              className="mobile-menu__link mobile-menu__user-link"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <CreditCard className="h-4 w-4" />
              <span>Subskripsi</span>
            </Link>

            {isAdmin && (
              <Link
                href="/dashboard"
                className="mobile-menu__link mobile-menu__user-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Settings className="h-4 w-4" />
                <span>Admin Panel</span>
              </Link>
            )}

            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className={cn(
                "mobile-menu__link mobile-menu__signout",
                isSigningOut && "opacity-50 cursor-not-allowed"
              )}
              type="button"
            >
              {isSigningOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span>{isSigningOut ? "Keluar..." : "Sign out"}</span>
            </button>
          </SignedIn>
        </nav>
      )}

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

      {/* Horizontal line border below stripes */}
      <div className="header-bottom-line" />

      {/* User Settings Modal (for mobile menu "Atur Akun") */}
      <UserSettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </header>
  )
}
