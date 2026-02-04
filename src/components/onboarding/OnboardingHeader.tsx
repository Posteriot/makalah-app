"use client"

import Link from "next/link"
import Image from "next/image"
import { Xmark } from "iconoir-react"
import { usePathname, useRouter } from "next/navigation"
import { useOnboardingStatus } from "@/lib/hooks/useOnboardingStatus"

/**
 * Minimal header untuk onboarding flow.
 * - Logo di kiri (link ke homepage)
 * - Close button di kanan
 * - Close dari /get-started akan set hasCompletedOnboarding = true
 */
export function OnboardingHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { completeOnboarding } = useOnboardingStatus()

  // Determine close destination based on current path
  const getCloseDestination = () => {
    if (pathname.startsWith("/checkout")) return "/pricing"
    return "/" // from /get-started go to homepage
  }

  const handleClose = async () => {
    // Set hasCompletedOnboarding = true when closing from /get-started
    // This ensures user won't see welcome page again
    if (pathname === "/get-started") {
      await completeOnboarding()
    }
    router.push(getCloseDestination())
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="h-full max-w-[1200px] mx-auto px-6 flex items-center justify-between">
        {/* Logo - same as GlobalHeader for consistency */}
        <Link href="/" className="flex items-center gap-2">
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

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          aria-label="Tutup"
        >
          <Xmark className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
