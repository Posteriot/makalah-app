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
import { Authenticated, Unauthenticated } from "convex/react"
import { signOut, useSession } from "@/lib/auth-client"
import { usePathname } from "next/navigation"
import { UserDropdown } from "./UserDropdown"
import { SegmentBadge } from "@/components/ui/SegmentBadge"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { getEffectiveTier } from "@/lib/utils/subscription"
import type { EffectiveTier } from "@/lib/utils/subscription"
import { cn } from "@/lib/utils"

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
 * - Admin dan Superadmin diperlakukan sebagai UNLIMITED (slate)
 * - Tier determination via shared getEffectiveTier() utility
 */
const SEGMENT_CONFIG: Record<EffectiveTier, { className: string }> = {
  gratis: { className: "bg-segment-gratis text-white" },
  bpp: { className: "bg-segment-bpp text-white" },
  pro: { className: "bg-segment-pro text-white" },
  unlimited: { className: "bg-segment-unlimited text-white dark:text-black" },
}

export function GlobalHeader() {
  const { resolvedTheme, setTheme } = useTheme()
  const pathname = usePathname()
  const [isHidden, setIsHidden] = useState(false)
  const [mobileMenuState, setMobileMenuState] = useState(() => ({
    isOpen: false,
    pathname,
  }))
  const [isSigningOut, setIsSigningOut] = useState(false)
  const lastScrollYRef = useRef(0)
  const isThemeReady = resolvedTheme !== undefined
  const shouldHideHeader = pathname?.startsWith("/chat")

  const isMobileMenuOpen = useMemo(() => {
    return mobileMenuState.isOpen && mobileMenuState.pathname === pathname
  }, [mobileMenuState.isOpen, mobileMenuState.pathname, pathname])

  // Auth session and Convex user data for mobile menu
  const { data: session } = useSession()
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
      if (!target.closest('[data-global-header]')) {
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

    // Clear browser cookie first — crossDomainClient clears localStorage
    // in its init hook (before POST), which can unmount this component.
    // Setting the cookie early ensures proxy.ts sees logged-out state.
    document.cookie =
      "ba_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"

    try {
      await signOut()
    } catch {
      // Expected: crossDomainClient nullifies session atom before POST,
      // component may unmount, and response can abort. Session is already
      // cleared client-side regardless.
    }

    window.location.href = "/"
  }

  // Derived user data for mobile menu
  const firstName = convexUser?.firstName || session?.user?.name?.split(" ")[0] || "User"
  const lastName = convexUser?.lastName || session?.user?.name?.split(" ").slice(1).join(" ") || ""
  const fullName = `${firstName} ${lastName}`.trim()
  const initial = firstName.charAt(0).toUpperCase()
  const segment = getEffectiveTier(convexUser?.role, convexUser?.subscriptionStatus)
  const segmentConfig = SEGMENT_CONFIG[segment]
  // isAdmin berdasarkan ROLE (bukan segment), karena segment sekarang hanya subscription tier
  const isAdmin = convexUser?.role === "admin" || convexUser?.role === "superadmin"

  if (shouldHideHeader) return null

  return (
    <header
      data-global-header
      className={cn(
        "fixed top-0 left-0 right-0 z-drawer h-[54px] bg-[var(--header-background)]",
        "flex items-center transition-transform duration-200",
        isHidden && "-translate-y-full"
      )}
    >
      {/* Inner container - matches hero max-width for alignment */}
      <div className="mx-auto grid w-full max-w-7xl grid-cols-16 items-center gap-4 px-4 py-3 lg:px-8">
        {/* Header Left - Logo & Brand */}
        <div className="col-span-8 md:col-span-4 flex items-center gap-dense flex-nowrap">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            {/* Light logo icon (for dark mode) */}
            <Image
              src="/logo/makalah_logo_light.svg"
              alt="Makalah"
              width={24}
              height={24}
              className="h-6 w-6 rounded-[4px] hidden dark:block"
            />
            {/* Dark logo icon (for light mode) */}
            <Image
              src="/logo/makalah_logo_dark.svg"
              alt="Makalah"
              width={24}
              height={24}
              className="h-6 w-6 rounded-[4px] block dark:hidden"
            />
            {/* White brand text (for dark mode) */}
            <Image
              src="/logo-makalah-ai-white.svg"
              alt="Makalah"
              width={80}
              height={18}
              className="h-[18px] w-auto hidden dark:block"
            />
            {/* Black brand text (for light mode) */}
            <Image
              src="/logo-makalah-ai-black.svg"
              alt="Makalah"
              width={80}
              height={18}
              className="h-[18px] w-auto block dark:hidden"
            />
          </Link>
          {/* Subscription Badge - shows when logged in */}
          <Authenticated>
            {isConvexLoading ? (
              <RefreshDouble className="icon-interface animate-spin text-muted-foreground" />
            ) : convexUser ? (
              <SegmentBadge
                role={convexUser.role}
                subscriptionStatus={convexUser.subscriptionStatus}
                className="shrink-0"
              />
            ) : null}
          </Authenticated>
        </div>

        {/* Header Right - Nav, Theme Toggle & Auth */}
        <div className="col-span-8 md:col-span-12 flex items-center justify-end gap-comfort">
          {/* Navigation - Desktop only */}
          <nav className="hidden md:flex items-center gap-4">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-2.5 py-1.5 text-narrative text-xs uppercase",
                    "text-foreground transition-colors hover:text-muted-foreground",
                    "after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-1",
                    "after:border-b after:border-dotted after:border-current after:scale-x-0 after:origin-left after:transition-transform",
                    "hover:after:scale-x-100",
                    isActive && "text-muted-foreground after:scale-x-100"
                  )}
              >
                {link.label}
                </Link>
              )
            })}
          </nav>
          {/* Theme Toggle - Mobile (icon only, left of hamburger) */}
          <Authenticated>
            <button
              onClick={toggleTheme}
              className={cn(
                // Structure for stripes animation
                "group relative overflow-hidden",
                // Base layout
                "md:hidden inline-flex h-6 w-6 items-center justify-center rounded-action mr-2",
                // Light mode diam: dark button
                "border border-transparent bg-slate-800 text-slate-100",
                // Light mode hover: text & border darken
                "hover:text-slate-800 hover:border-slate-600",
                // Dark mode diam: light button
                "dark:bg-slate-100 dark:text-slate-800",
                // Dark mode hover: text & border lighten
                "dark:hover:text-slate-100 dark:hover:border-slate-400",
                // Transition & focus
                "transition-colors focus-ring"
              )}
              type="button"
              title="Toggle theme"
              aria-label="Toggle theme"
              disabled={!isThemeReady}
            >
              {/* Diagonal stripes overlay */}
              <span className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0" aria-hidden="true" />
              {/* Icon */}
              <span className="relative z-10">
                {(resolvedTheme ?? "dark") === "dark" ? (
                  <SunLight className="h-3.5 w-3.5" />
                ) : (
                  <HalfMoon className="h-3.5 w-3.5" />
                )}
              </span>
            </button>
          </Authenticated>

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
          <Authenticated>
            <button
              onClick={toggleTheme}
              className={cn(
                // Structure for stripes animation
                "group relative overflow-hidden",
                // Base layout
                "hidden md:inline-flex h-7.5 w-7.5 items-center justify-center rounded-action",
                // Light mode diam: dark button
                "border border-transparent bg-slate-800 text-slate-100",
                // Light mode hover: text & border darken
                "hover:text-slate-800 hover:border-slate-600",
                // Dark mode diam: light button
                "dark:bg-slate-100 dark:text-slate-800",
                // Dark mode hover: text & border lighten
                "dark:hover:text-slate-100 dark:hover:border-slate-400",
                // Transition & focus
                "transition-colors focus-ring"
              )}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {/* Diagonal stripes overlay */}
              <span className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0" aria-hidden="true" />
              {/* Icons */}
              <SunLight className="relative z-10 icon-interface block dark:hidden" />
              <HalfMoon className="relative z-10 icon-interface hidden dark:block" />
            </button>
          </Authenticated>

          {/* Auth State - Desktop only (mobile shows in panel) */}
          <Unauthenticated>
            <Link
              href={`/sign-in?redirect_url=${encodeURIComponent(pathname)}`}
              className="hidden md:inline-flex items-center justify-center gap-2 rounded-action border-main border-slate-950 bg-slate-950 px-2 py-1 text-xs font-medium text-narrative uppercase text-slate-50 transition-colors hover:bg-slate-900 dark:border-slate-50 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200 focus-ring"
            >
              Masuk
            </Link>
          </Unauthenticated>

          <Authenticated>
            <div className="hidden md:block">
              <UserDropdown />
            </div>
          </Authenticated>
        </div>
      </div>
      {/* End header-inner */}

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <nav className="absolute top-full left-0 right-0 md:hidden flex flex-col bg-background border-b border-hairline p-4">
          {/* Main Navigation Links */}
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "block px-3 py-2 text-narrative text-[11px] uppercase tracking-wider rounded-action",
                  "text-foreground hover:bg-accent transition-colors",
                  isActive && "text-muted-foreground"
                )}
                onClick={() => setMobileMenuState({ isOpen: false, pathname })}
              >
                {link.label}
              </Link>
            )
          })}

          {/* SignedOut: Show login button */}
          <Unauthenticated>
            <Link
              href={`/sign-in?redirect_url=${encodeURIComponent(pathname)}`}
              className="mt-2 inline-flex items-center justify-center rounded-action border-main border-border px-3 py-2 text-signal text-[11px] font-bold uppercase tracking-widest text-foreground hover:bg-accent transition-colors"
              onClick={() => setMobileMenuState({ isOpen: false, pathname })}
            >
              Masuk
            </Link>
          </Unauthenticated>

          {/* SignedIn: Auth section */}
          <Authenticated>
            <div className="mt-3 rounded-shell border-hairline bg-slate-100 dark:bg-slate-900 p-3">
              <Accordion type="single" collapsible>
                <AccordionItem value="user" className="border-none">
                  <AccordionTrigger className="p-0 hover:no-underline">
                    <div className="flex items-center gap-3 w-full text-left px-2 py-2 rounded-action hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                      <div className={cn("h-7 w-7 rounded-action flex items-center justify-center text-[12px] font-semibold", segmentConfig.className)}>
                        {initial}
                      </div>
                      <span className="text-narrative text-[11px] font-medium text-foreground flex-1">
                        {fullName}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pl-2">
                    <Link
                      href="/settings"
                      onClick={() => setMobileMenuState({ isOpen: false, pathname })}
                      className="w-full flex items-center gap-3 px-2 py-2 text-[11px] text-narrative text-foreground rounded-action hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    >
                      <User className="icon-interface" />
                      <span>Atur Akun</span>
                    </Link>

                    <Link
                      href="/subscription/overview"
                      className="w-full flex items-center gap-3 px-2 py-2 text-[11px] text-narrative text-foreground rounded-action hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => setMobileMenuState({ isOpen: false, pathname })}
                    >
                      <CreditCard className="icon-interface" />
                      <span>Subskripsi</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        href="/dashboard"
                        className="w-full flex items-center gap-3 px-2 py-2 text-[11px] text-narrative text-foreground rounded-action hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
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
                        "w-full flex items-center gap-3 px-2 py-2 text-[11px] text-narrative rounded-action transition-colors",
                        isSigningOut
                          ? "text-muted-foreground cursor-not-allowed"
                          : "text-rose-500 hover:bg-rose-500/10"
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
          </Authenticated>
        </nav>
      )}

    </header>
  )
}
