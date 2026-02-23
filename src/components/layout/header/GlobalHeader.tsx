"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import Link from "next/link"
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
import { useConvexAuth, useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Skeleton } from "@/components/ui/skeleton"
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
  const headerConfig = useQuery(api.siteConfig.getConfig, { key: "header" })

  // CMS logo/brand image URLs (resolve storage IDs, fallback to static)
  const cmsLogoDarkUrl = useQuery(
    api.pageContent.getImageUrl,
    headerConfig?.logoDarkId ? { storageId: headerConfig.logoDarkId as Id<"_storage"> } : "skip"
  )
  const cmsLogoLightUrl = useQuery(
    api.pageContent.getImageUrl,
    headerConfig?.logoLightId ? { storageId: headerConfig.logoLightId as Id<"_storage"> } : "skip"
  )
  const cmsBrandDarkUrl = useQuery(
    api.pageContent.getImageUrl,
    headerConfig?.brandTextDarkId ? { storageId: headerConfig.brandTextDarkId as Id<"_storage"> } : "skip"
  )
  const cmsBrandLightUrl = useQuery(
    api.pageContent.getImageUrl,
    headerConfig?.brandTextLightId ? { storageId: headerConfig.brandTextLightId as Id<"_storage"> } : "skip"
  )

  const logoIconDark = cmsLogoDarkUrl ?? "/logo/logo-color-darkmode.png"
  const logoIconLight = cmsLogoLightUrl ?? "/logo/logo-color-lightmode.png"
  const brandTextDark = cmsBrandDarkUrl ?? "/logo-makalah-ai-white.svg"
  const brandTextLight = cmsBrandLightUrl ?? "/logo-makalah-ai-black.svg"

  // CMS-driven nav links with hardcoded fallback
  const baseNavLinks = headerConfig?.navLinks
    ? (headerConfig.navLinks as Array<{ label: string; href: string; isVisible: boolean }>)
        .filter((link) => link.isVisible)
        .map((link) => ({ href: link.href, label: link.label }))
    : NAV_LINKS

  const visibleNavLinks = baseNavLinks

  const isMobileMenuOpen = useMemo(() => {
    return mobileMenuState.isOpen && mobileMenuState.pathname === pathname
  }, [mobileMenuState.isOpen, mobileMenuState.pathname, pathname])

  // Auth state from Convex (replaces <Authenticated>/<Unauthenticated> wrappers)
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth()

  // Track whether auth has resolved at least once — prevents skeleton flash
  // on tab refocus when Convex re-validates JWT (briefly sets isLoading=true).
  // React supports setState during render for derived state (replaces getDerivedStateFromProps).
  const [hasBeenAuthenticated, setHasBeenAuthenticated] = useState(false)
  if (isAuthenticated && !hasBeenAuthenticated) {
    setHasBeenAuthenticated(true)
  }

  // Only show skeleton on initial load, not on tab-refocus re-auth
  const showAuthSkeleton = isAuthLoading && !hasBeenAuthenticated
  // Keep showing authenticated UI during brief re-auth cycles
  const showAsAuthenticated = isAuthenticated || hasBeenAuthenticated

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoIconDark} alt="Makalah" className="h-6 w-6 rounded-[4px] hidden dark:block" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoIconLight} alt="Makalah" className="h-6 w-6 rounded-[4px] block dark:hidden" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brandTextDark} alt="Makalah" className="h-[18px] w-auto hidden dark:block" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brandTextLight} alt="Makalah" className="h-[18px] w-auto block dark:hidden" />
          </Link>
          {/* Subscription Badge - shows when logged in */}
          {showAuthSkeleton ? (
            <Skeleton className="h-5 w-12 rounded-badge shrink-0" />
          ) : showAsAuthenticated ? (
            isConvexLoading ? (
              <Skeleton className="h-5 w-12 rounded-badge shrink-0" />
            ) : convexUser ? (
              <SegmentBadge
                role={convexUser.role}
                subscriptionStatus={convexUser.subscriptionStatus}
                className="shrink-0"
              />
            ) : null
          ) : null}
        </div>

        {/* Header Right - Nav, Theme Toggle & Auth */}
        <div className="col-span-8 md:col-span-12 flex items-center justify-end gap-comfort">
          {/* Navigation - Desktop only */}
          <nav className="hidden md:flex items-center gap-4">
            {visibleNavLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative rounded-action px-2.5 py-1.5 text-narrative text-xs uppercase",
                    "text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800",
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
          {showAuthSkeleton ? (
            <Skeleton className="md:hidden h-6 w-6 rounded-action mr-2" />
          ) : showAsAuthenticated ? (
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
          ) : null}

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
          {showAuthSkeleton ? (
            <Skeleton className="hidden md:block h-7.5 w-7.5 rounded-action" />
          ) : showAsAuthenticated ? (
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
          ) : null}

          {/* Auth State - Desktop only (mobile shows in panel) */}
          {showAuthSkeleton ? (
            <Skeleton className="hidden md:block h-[30px] w-[100px] rounded-action" />
          ) : showAsAuthenticated ? (
            <div className="hidden md:block">
              <UserDropdown />
            </div>
          ) : (
            <Link
              href={`/sign-in?redirect_url=${encodeURIComponent(pathname)}`}
              className="hidden md:inline-flex items-center justify-center gap-2 rounded-action border-main border-slate-950 bg-slate-950 px-2 py-1 text-xs font-medium text-narrative uppercase text-slate-50 transition-colors hover:bg-slate-900 dark:border-slate-50 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200 focus-ring"
            >
              Masuk
            </Link>
          )}
        </div>
      </div>
      {/* End header-inner */}

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <nav className="absolute top-full left-0 right-0 z-40 flex flex-col border-b border-slate-300 bg-slate-100 p-4 shadow-sm dark:border-slate-800 dark:bg-background md:hidden">
          {/* Main Navigation Links */}
          {visibleNavLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
            return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex min-h-11 items-center rounded-action px-3 py-2.5 text-[11px] text-narrative uppercase tracking-wider",
                    "text-foreground transition-colors hover:bg-slate-300 dark:hover:bg-slate-800",
                    isActive && "text-muted-foreground"
                  )}
                  onClick={() => setMobileMenuState({ isOpen: false, pathname })}
              >
                {link.label}
              </Link>
            )
          })}

          {/* SignedOut: Show login button */}
          {!showAuthSkeleton && !showAsAuthenticated && (
            <Link
              href={`/sign-in?redirect_url=${encodeURIComponent(pathname)}`}
              className="mt-2 inline-flex items-center justify-center rounded-action border-main border-border px-3 py-2 text-signal text-[11px] font-bold uppercase tracking-widest text-foreground hover:bg-accent transition-colors"
              onClick={() => setMobileMenuState({ isOpen: false, pathname })}
            >
              Masuk
            </Link>
          )}

          {/* SignedIn: Auth section */}
          {showAsAuthenticated && (
            <div className="mt-3 rounded-sm border-hairline border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-900 p-4">
              <Accordion type="single" collapsible>
                <AccordionItem value="user" className="border-none">
                  <AccordionTrigger className="items-center py-0 hover:no-underline [&>svg]:self-center [&>svg]:translate-y-0">
                    <div className="flex min-h-12 w-full items-center gap-3 rounded-action px-3 py-3 text-left transition-colors hover:bg-slate-300 dark:hover:bg-slate-800">
                      <div className={cn("h-8 w-8 rounded-action flex items-center justify-center text-xs font-semibold", segmentConfig.className)}>
                        {initial}
                      </div>
                      <span className="flex-1 text-narrative text-xs font-medium text-foreground">
                        {fullName}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <Link
                      href="/settings"
                      onClick={() => setMobileMenuState({ isOpen: false, pathname })}
                      className="flex min-h-11 w-full items-center gap-3 rounded-action px-3 py-2.5 text-xs text-narrative text-foreground transition-colors hover:bg-slate-300 dark:hover:bg-slate-800"
                    >
                      <User className="icon-interface" />
                      <span>Atur Akun</span>
                    </Link>

                    <Link
                      href="/subscription/overview"
                      className="flex min-h-11 w-full items-center gap-3 rounded-action px-3 py-2.5 text-xs text-narrative text-foreground transition-colors hover:bg-slate-300 dark:hover:bg-slate-800"
                      onClick={() => setMobileMenuState({ isOpen: false, pathname })}
                    >
                      <CreditCard className="icon-interface" />
                      <span>Subskripsi</span>
                    </Link>

                    {isAdmin && (
                        <Link
                          href="/dashboard"
                          className="flex min-h-11 w-full items-center gap-3 rounded-action px-3 py-2.5 text-xs text-narrative text-foreground transition-colors hover:bg-slate-300 dark:hover:bg-slate-800"
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
                        "flex min-h-11 w-full items-center gap-3 rounded-action px-3 py-2.5 text-xs text-narrative transition-colors",
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
          )}
        </nav>
      )}

    </header>
  )
}
