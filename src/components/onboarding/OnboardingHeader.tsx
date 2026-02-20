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
  const { completeOnboarding, isAuthenticated } = useOnboardingStatus()

  // Determine close destination based on current path
  const getCloseDestination = () => {
    if (pathname.startsWith("/checkout")) return "/pricing"
    return "/" // from /get-started go to homepage
  }

  const handleClose = async () => {
    // Set hasCompletedOnboarding = true when closing from /get-started
    // Only attempt if auth is established (JWT ready) — otherwise the mutation
    // would throw "Unauthorized". This can happen when the layout renders the
    // close button before the page's auth guard has passed (e.g. during OTT
    // exchange after magic-link redirect).
    if (pathname === "/get-started" && isAuthenticated) {
      try {
        await completeOnboarding()
      } catch {
        // Auth state mismatch (e.g. JWT expired between query and mutation) —
        // navigate anyway; user will see get-started again on next visit.
      }
    }
    router.push(getCloseDestination())
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-drawer h-[54px] border-b border-border/60 bg-[var(--header-background)]">
      <div className="mx-auto grid h-full w-full max-w-7xl grid-cols-16 items-center gap-4 px-4 py-3 lg:px-8">
        <div className="col-span-10 md:col-span-8 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Image
              src="/logo/logo-color-darkmode.png"
              alt="Makalah"
              width={24}
              height={24}
              className="h-6 w-6 rounded-[4px] hidden dark:block"
            />
            <Image
              src="/logo/logo-color-lightmode.png"
              alt="Makalah"
              width={24}
              height={24}
              className="h-6 w-6 rounded-[4px] block dark:hidden"
            />
            <Image
              src="/logo-makalah-ai-white.svg"
              alt="Makalah"
              width={80}
              height={18}
              className="h-[18px] w-auto hidden dark:block"
            />
            <Image
              src="/logo-makalah-ai-black.svg"
              alt="Makalah"
              width={80}
              height={18}
              className="h-[18px] w-auto block dark:hidden"
            />
          </Link>

        </div>

        <div className="col-span-6 md:col-span-8 flex items-center justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-action border border-transparent bg-[color:var(--slate-800)] px-2 py-1 text-signal text-xs font-medium uppercase tracking-widest text-[color:var(--slate-100)] transition-colors hover:border-[color:var(--slate-600)] hover:text-[color:var(--slate-800)] dark:bg-[color:var(--slate-100)] dark:text-[color:var(--slate-800)] dark:hover:border-[color:var(--slate-400)] dark:hover:text-[color:var(--slate-100)] focus-ring"
            aria-label="Tutup halaman get started"
          >
            <span
              className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
              aria-hidden="true"
            />
            <span className="relative z-10 inline-flex items-center gap-1.5 whitespace-nowrap">
              Tutup
              <Xmark className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
