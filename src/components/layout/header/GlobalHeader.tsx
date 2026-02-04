"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useTheme } from "next-themes"
import {
  Menu,
  Xmark,
  SunLight,
  HalfMoon,
  User,
  CreditCard,
  Settings,
  LogOut,
  RefreshDouble,
} from "iconoir-react"
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
  const [mobileMenuState, setMobileMenuState] = useState(() => ({
    isOpen: false,
    pathname,
  }))
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const lastScrollYRef = useRef(0)
  const isThemeReady = resolvedTheme !== undefined
  const shouldHideHeader = pathname?.startsWith("/chat")

  const isMobileMenuOpen = useMemo(() => {
    return mobileMenuState.isOpen && mobileMenuState.pathname === pathname
  }, [mobileMenuState.isOpen, mobileMenuState.pathname, pathname])

  // Clerk and Convex user data for mobile menu
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()
  const { user: convexUser, isLoading: isConvexLoading } = useCurrentUser()

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY

    // Determine if we're past the threshold (not at top/hero)
    const pastThreshold = currentScrollY > SCROLL_THRESHOLD

    // Calculate scroll delta for direction detection
    const scrollDelta = currentScrollY - lastScrollYRef.current

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

  // Close mobile menu on click outside
  useEffect(() => {
    if (!isMobileMenuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.global-header')) {
        setMobileMenuState({ isOpen: false, pathname })
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isMobileMenuOpen, pathname])

  const toggleTheme = () => {
    if (!isThemeReady) return // Prevent toggle before hydration
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  const toggleMobileMenu = () => {
    setMobileMenuState((prev) => ({
      isOpen: !(prev.isOpen && prev.pathname === pathname),
      pathname,
    }))
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

  if (shouldHideHeader) return null

  return (
    <header
      className={cn(
        "global-header bg-background z-drawer",
        isHidden && "header-hidden"
      )}
    >
      {/* Inner container - matches hero max-width for alignment */}
      <div className="header-inner">
        {/* Header Left - Logo & Brand */}
        <div className="header-left col-span-8 md:col-span-4 gap-dense flex-nowrap">
          <Link href="/" className="header-brand shrink-0">
            {/* Light logo icon (for dark mode) */}
            <Image
              src="/logo/makalah_logo_light.svg"
              alt="Makalah"
              width={24}
              height={24}
              className="logo-img logo-img-light"
            />
            {/* Dark logo icon (for light mode) */}
            <Image
              src="/logo/makalah_logo_dark.svg"
              alt="Makalah"
              width={24}
              height={24}
              className="logo-img logo-img-dark"
            />
            {/* White brand text (for dark mode) */}
            <Image
              src="/logo-makalah-ai-white.svg"
              alt="Makalah"
              width={80}
              height={18}
              className="logo-brand-text logo-brand-light"
            />
            {/* Black brand text (for light mode) */}
            <Image
              src="/logo-makalah-ai-black.svg"
              alt="Makalah"
              width={80}
              height={18}
              className="logo-brand-text logo-brand-dark"
            />
          </Link>
          {/* Subscription Badge - shows when logged in */}
          <SignedIn>
            {isConvexLoading ? (
              <RefreshDouble className="icon-interface animate-spin text-muted-foreground" />
            ) : convexUser ? (
              <SegmentBadge
                role={convexUser.role}
                subscriptionStatus={convexUser.subscriptionStatus}
                className="shrink-0"
              />
            ) : null}
          </SignedIn>
        </div>

        {/* Header Right - Nav, Theme Toggle & Auth */}
        <div className="header-right col-span-8 md:col-span-12 gap-comfort">
          {/* Navigation - Desktop only */}
          <nav className="header-nav">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                  "nav-link text-narrative uppercase tracking-wider",
                  isActive && "active"
                )}
              >
                {link.label}
                </Link>
              )
            })}
          </nav>
          {/* Theme Toggle - Mobile (icon only, left of hamburger) */}
          <SignedIn>
            <button
              onClick={toggleTheme}
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-action border-main border-border text-foreground transition-opacity hover:opacity-70 mr-3"
              type="button"
              title="Toggle theme"
              aria-label="Toggle theme"
              disabled={!isThemeReady}
            >
              {(resolvedTheme ?? "dark") === "dark" ? (
                <SunLight className="icon-interface" />
              ) : (
                <HalfMoon className="icon-interface" />
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
            {isMobileMenuOpen ? (
              <Xmark className="icon-interface" />
            ) : (
              <Menu className="icon-interface" />
            )}
          </button>

          {/* Theme Toggle - Desktop only for logged-in users */}
          <SignedIn>
            <button
              onClick={toggleTheme}
              className="theme-toggle hidden md:inline-flex rounded-action border-main border-border"
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              <SunLight className="icon sun-icon" />
              <HalfMoon className="icon moon-icon" />
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
      </div>
      {/* End header-inner */}

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
                onClick={() => setMobileMenuState({ isOpen: false, pathname })}
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
              onClick={() => setMobileMenuState({ isOpen: false, pathname })}
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
                          setMobileMenuState({ isOpen: false, pathname })
                          setIsSettingsOpen(true)
                        }}
                        className="mobile-menu__user-menu-item"
                        type="button"
                      >
                        <User className="icon-interface" />
                        <span>Atur Akun</span>
                      </button>

                      <Link
                        href="/subscription/overview"
                        className="mobile-menu__user-menu-item"
                        onClick={() => setMobileMenuState({ isOpen: false, pathname })}
                      >
                        <CreditCard className="icon-interface" />
                        <span>Subskripsi</span>
                      </Link>

                      {isAdmin && (
                        <Link
                          href="/dashboard"
                          className="mobile-menu__user-menu-item"
                          onClick={() => setMobileMenuState({ isOpen: false, pathname })}
                        >
                          <Settings className="icon-interface" />
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
                          <RefreshDouble className="icon-interface animate-spin" />
                        ) : (
                          <LogOut className="icon-interface" />
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

      {/* User Settings Modal (for mobile menu "Atur Akun") */}
      <UserSettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </header>
  )
}
