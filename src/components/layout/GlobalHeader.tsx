"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useTheme } from "next-themes"
import { Menu, X, Sun, Moon, User, CreditCard, Settings, LogOut, Loader2, ChevronDown } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { SignedIn, SignedOut, useUser, useClerk } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import { UserDropdown } from "./UserDropdown"
import { UserSettingsModal } from "@/components/settings/UserSettingsModal"
import { SegmentBadge } from "@/components/ui/SegmentBadge"
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

/**
 * Segment configuration for user avatar and badge
 *
 * ATURAN WARNA:
 * - Warna avatar dan badge berdasarkan SUBSCRIPTION TIER, bukan role
 * - Admin dan Superadmin diperlakukan sebagai PRO (amber)
 * - Tidak ada warna terpisah untuk role admin/superadmin
 */
type SegmentType = "gratis" | "bpp" | "pro"

const SEGMENT_CONFIG: Record<SegmentType, { label: string; className: string }> = {
  gratis: { label: "GRATIS", className: "bg-segment-gratis text-white" },
  bpp: { label: "BPP", className: "bg-segment-bpp text-white" },
  pro: { label: "PRO", className: "bg-segment-pro text-white" },
}

/**
 * Determine subscription tier from user role and subscription status
 * Admin/Superadmin always treated as PRO (full access)
 */
function getSegmentFromUser(role?: string, subscriptionStatus?: string): SegmentType {
  // Admin and superadmin are always treated as PRO
  if (role === "superadmin" || role === "admin") return "pro"
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
  // isAdmin berdasarkan ROLE (bukan segment), karena segment sekarang hanya subscription tier
  const isAdmin = convexUser?.role === "admin" || convexUser?.role === "superadmin"

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
        {/* Subscription Badge - shows when logged in */}
        <SignedIn>
          {isConvexLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : convexUser ? (
            <SegmentBadge
              role={convexUser.role}
              subscriptionStatus={convexUser.subscriptionStatus}
            />
          ) : null}
        </SignedIn>
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
        {/* Theme Toggle - Mobile (icon only, left of hamburger) */}
        <SignedIn>
          <button
            onClick={toggleTheme}
            className="md:hidden inline-flex h-9 w-9 items-center justify-center text-foreground transition-opacity hover:opacity-70 mr-3"
            type="button"
            title="Toggle theme"
            aria-label="Toggle theme"
            disabled={!mounted}
          >
            {(mounted ? resolvedTheme : "dark") === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </SignedIn>

        {/* Mobile Menu Toggle */}
        <button
          onClick={toggleMobileMenu}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center text-foreground transition-opacity hover:opacity-70"
          type="button"
          aria-label={isMobileMenuOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Theme Toggle - Desktop only for logged-in users */}
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
          <Link href="/sign-in" className="btn btn-outline hidden md:inline-flex">
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

          {/* SignedIn: Auth section with benefits-like background */}
          <SignedIn>
            <div className="mobile-menu__auth-section">
              {/* Background layers (like BenefitsSection) */}
              <div className="mobile-menu__auth-bg-stripes" />
              <div className="mobile-menu__auth-bg-dots" />

              {/* Auth content */}
              <div className="mobile-menu__auth-content">
                {/* User Accordion */}
                <Accordion type="single" collapsible className="mobile-menu__user-accordion">
                  <AccordionItem value="user" className="mobile-menu__user-accordion-item">
                    <AccordionTrigger className="mobile-menu__user-accordion-trigger">
                      <div className="mobile-menu__auth-row">
                        <div className={cn("mobile-menu__auth-avatar", segmentConfig.className)}>
                          {initial}
                        </div>
                        <span className="mobile-menu__auth-label">{fullName}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="mobile-menu__user-accordion-content">
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false)
                          setIsSettingsOpen(true)
                        }}
                        className="mobile-menu__user-menu-item"
                        type="button"
                      >
                        <User className="h-4 w-4" />
                        <span>Atur Akun</span>
                      </button>

                      <Link
                        href="/subscription/overview"
                        className="mobile-menu__user-menu-item"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Subskripsi</span>
                      </Link>

                      {isAdmin && (
                        <Link
                          href="/dashboard"
                          className="mobile-menu__user-menu-item"
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
                          "mobile-menu__user-menu-item mobile-menu__user-signout",
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
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
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
