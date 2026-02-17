"use client"

import { useEffect, useState } from "react"
import { useQuery } from "convex/react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Xmark } from "iconoir-react"
import { api } from "@convex/_generated/api"
import { cn } from "@/lib/utils"
import { useOnboardingStatus } from "@/lib/hooks/useOnboardingStatus"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { isFreeTierForLoginGate } from "@/lib/utils/freeLoginGate"
import { DottedPattern } from "@/components/marketing/SectionBackground"
import { SectionCTA } from "@/components/ui/section-cta"
import { useWaitlistMode } from "@/lib/hooks/useWaitlistMode"

const FEEDBACK_DELAY_MS = 3_000

const TARGET_PLAN_ORDER = ["bpp", "pro"] as const

type GetStartedPlan = {
  id: string
  name: string
  price: string
  unit?: string
  isHighlighted?: boolean
  isDisabled?: boolean
  description: string
  creditNote: string
  ctaLabel: string
  ctaHref?: string
}

function toSafeInternalPath(path?: string): string | null {
  if (!path) return null
  if (!path.startsWith("/") || path.startsWith("//")) return null
  return path
}

function resolvePlanDisabledState(plan: {
  slug: string
  isDisabled: boolean
  ctaHref?: string
}): boolean {
  if (!plan.isDisabled) return false

  // Legacy pricing data can keep Pro as disabled while checkout path is already live.
  if (plan.slug === "pro" && toSafeInternalPath(plan.ctaHref)) {
    return false
  }

  return true
}

function GetStartedPlanCard({
  plan,
  isNavigating,
  onSelect,
}: {
  plan: GetStartedPlan
  isNavigating: boolean
  onSelect: (plan: GetStartedPlan) => void
}) {
  return (
    <article className="group/card relative h-full">
      {plan.isHighlighted && (
        <div
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 z-10",
            "transition-transform duration-300 group-hover/card:-translate-y-1",
            "bg-[color:var(--emerald-500)] text-[color:var(--slate-50)]",
            "text-[11px] font-semibold uppercase tracking-wide",
            "px-3 py-1 rounded-full whitespace-nowrap"
          )}
        >
          Solusi Terbaik
        </div>
      )}

      <div
        className={cn(
          "relative overflow-hidden h-full min-h-[220px] md:min-h-[240px] flex flex-col rounded-shell p-comfort",
          "border border-[color:var(--slate-400)]",
          "group-hover/card:bg-[color:var(--slate-200)] dark:group-hover/card:bg-[color:var(--slate-700)]",
          "group-hover/card:-translate-y-1 transition-all duration-300",
          plan.isHighlighted && "border-2 border-[color:var(--emerald-500)]"
        )}
      >
        <h3 className="text-narrative text-xl md:text-2xl font-light text-foreground text-center mb-3 mt-4 md:mt-0">
          {plan.name}
        </h3>

        <p className="text-interface text-3xl font-medium tracking-tight tabular-nums text-foreground text-center mb-6">
          {plan.price}
          {plan.unit && (
            <span className="text-interface text-sm font-normal text-muted-foreground ml-1">
              {plan.unit}
            </span>
          )}
        </p>

        <div className="flex items-start gap-3">
          <span className="w-2 h-2 min-w-2 rounded-full mt-3 bg-[color:var(--rose-500)] animate-pulse shadow-[0_0_8px_var(--rose-500)]" />
          <p className="text-interface text-sm leading-relaxed text-foreground">
            {plan.description}
          </p>
        </div>

        <p className="text-interface text-xs leading-relaxed text-foreground mt-5 pt-4 border-t border-border/60">
          {plan.creditNote}
        </p>

        <div className="mt-auto pt-6 flex justify-center">
          {plan.isDisabled ? (
            <button
              type="button"
              disabled
              className={cn(
                "group relative overflow-hidden",
                "inline-flex items-center justify-center gap-2 rounded-action px-4 py-2 w-full",
                "text-signal text-[11px] font-bold uppercase tracking-widest",
                "border border-transparent bg-slate-800 text-slate-100",
                "dark:bg-slate-100 dark:text-slate-800",
                "cursor-not-allowed opacity-60"
              )}
            >
              {plan.ctaLabel}
            </button>
          ) : (
            <SectionCTA
              onClick={() => onSelect(plan)}
              isLoading={isNavigating}
              className="w-full justify-center"
            >
              {plan.ctaLabel}
            </SectionCTA>
          )}
        </div>
      </div>
    </article>
  )
}

export default function GetStartedPage() {
  const router = useRouter()
  const { isLoading: isOnboardingLoading, isAuthenticated, completeOnboarding } = useOnboardingStatus()
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const plansData = useQuery(api.pricingPlans.getActivePlans)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const isFreeTier = isFreeTierForLoginGate(user?.role, user?.subscriptionStatus)
  const { isWaitlistMode } = useWaitlistMode()

  // Show "Mempersiapkan..." after FEEDBACK_DELAY_MS while auth/user sync stabilizes.
  useEffect(() => {
    const feedbackTimer = setTimeout(() => setShowFeedback(true), FEEDBACK_DELAY_MS)
    return () => {
      clearTimeout(feedbackTimer)
    }
  }, [])

  // Lock page scroll on get-started so layout always fits current viewport.
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior
    const prevBodyOverscroll = document.body.style.overscrollBehavior

    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
    document.documentElement.style.overscrollBehavior = "none"
    document.body.style.overscrollBehavior = "none"

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll
      document.body.style.overscrollBehavior = prevBodyOverscroll
    }
  }, [])

  // Route guard: this page is only for free-tier users.
  useEffect(() => {
    if (!isOnboardingLoading && !isUserLoading && isAuthenticated && user && !isFreeTier) {
      router.replace("/chat")
    }
  }, [isOnboardingLoading, isUserLoading, isAuthenticated, user, isFreeTier, router])

  const completeThenNavigate = async (targetPath: string) => {
    if (isNavigating) return
    setIsNavigating(true)
    try {
      await completeOnboarding()
    } catch (error) {
      // Fail-safe: upgrade prompt flow must not block navigation.
      console.error("[GetStarted] completeOnboarding failed:", error)
    } finally {
      router.push(targetPath)
    }
  }

  const handlePlanSelection = async (plan: GetStartedPlan) => {
    if (plan.isDisabled) return

    const safeHref = toSafeInternalPath(plan.ctaHref)
    if (safeHref) {
      await completeThenNavigate(safeHref)
      return
    }

    // Fallbacks: prevent dead-end when ctaHref is missing/malformed.
    if (plan.id === "gratis") {
      await completeThenNavigate("/chat")
      return
    }

    if (plan.id === "bpp") {
      await completeThenNavigate("/checkout/bpp")
      return
    }

    await completeThenNavigate("/subscription/plans")
  }

  const handleClose = async () => {
    await completeThenNavigate("/")
  }

  const getStartedPlans: GetStartedPlan[] = TARGET_PLAN_ORDER
    .map((slug) => plansData?.find((plan) => plan.slug === slug))
    .filter((plan): plan is NonNullable<typeof plan> => !!plan)
    .map((plan) => ({
      id: plan.slug,
      name: plan.name,
      price: plan.price,
      unit: plan.unit,
      isHighlighted: plan.isHighlighted,
      isDisabled: isWaitlistMode ? true : resolvePlanDisabledState(plan),
      description: plan.teaserDescription || plan.tagline,
      creditNote: plan.teaserCreditNote || plan.features[0] || "",
      ctaLabel: isWaitlistMode ? "Segera Hadir" : (
        plan.slug === "pro" &&
        resolvePlanDisabledState(plan) === false &&
        plan.ctaText.toLowerCase().includes("segera hadir")
          ? "Langganan Pro"
          : plan.ctaText
      ),
      ctaHref: plan.ctaHref,
    }))

  // Wait for auth + app user record to be fully established
  // useCurrentUser auto-creates app user record if missing (email-based linking for existing users)
  if (isOnboardingLoading || !isAuthenticated || isUserLoading || !user || !isFreeTier || plansData === undefined) {
    return (
      <section className="fixed inset-0 overflow-hidden bg-[color:var(--slate-100)] dark:bg-[color:var(--slate-950)]">
        <DottedPattern spacing={24} withRadialMask={false} className="z-0" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4">
          <Image
            src="/logo/makalah_logo_light.svg"
            alt=""
            width={48}
            height={48}
            className="animate-breathe"
            priority
          />
          {showFeedback && (
            <p className="text-interface text-xs text-muted-foreground animate-in fade-in duration-500">
              Mempersiapkan akun...
            </p>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="fixed inset-0 overflow-hidden bg-[color:var(--slate-100)] dark:bg-[color:var(--slate-950)]">
      <DottedPattern spacing={24} withRadialMask={false} className="z-0" />

      <div className="relative z-10 flex h-full items-center justify-center p-4 md:p-6">
        <div className="relative w-full max-w-5xl">
          <div className="relative overflow-hidden rounded-shell border border-border/70 bg-card">
            <button
              type="button"
              onClick={handleClose}
              disabled={isNavigating}
              className="group absolute right-5 top-6 z-20 inline-flex h-8 w-8 items-center justify-center rounded-action border border-border/60 bg-[color:var(--slate-900)]/70 text-[color:var(--slate-100)] transition-colors hover:bg-[color:var(--slate-100)] hover:text-[color:var(--slate-900)] dark:bg-[color:var(--slate-100)]/90 dark:text-[color:var(--slate-900)] dark:hover:bg-[color:var(--slate-900)] dark:hover:text-[color:var(--slate-100)] focus-ring disabled:opacity-60 disabled:cursor-not-allowed md:top-8 md:right-7"
              aria-label="Tutup halaman get started"
            >
              <Xmark className="h-4 w-4" />
            </button>
          <div className="grid md:grid-cols-[0.3fr_0.7fr]">
            <aside className="relative flex flex-col justify-between gap-8 bg-[color:var(--slate-950)] p-6 md:p-8">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 8px)",
                }}
                aria-hidden="true"
              />

              <div className="relative z-10">
                <Link href="/" className="inline-flex items-center gap-2">
                  <Image
                    src="/logo/makalah_logo_light.svg"
                    alt="Makalah"
                    width={28}
                    height={28}
                    className="h-7 w-7"
                  />
                </Link>
              </div>

              <div className="relative z-10 space-y-4">
                <h1 className="text-narrative text-2xl font-medium leading-[1.12] text-[color:var(--slate-50)] md:text-3xl">
                  Kamu berada di paket gratis
                </h1>
                <p className="text-interface text-sm leading-relaxed text-[color:var(--slate-300)]">
                  Lakukan upgrade untuk pengalaman penyusunan paper yang lebih lengkap
                </p>
              </div>
            </aside>

            <section className="flex flex-col bg-[color:var(--slate-100)] p-5 pt-20 dark:bg-[color:var(--slate-800)] md:p-7 md:pt-24">
              <div className="grid gap-4 md:grid-cols-2">
                {getStartedPlans.map((plan) => (
                  <GetStartedPlanCard
                    key={plan.id}
                    plan={plan}
                    isNavigating={isNavigating}
                    onSelect={handlePlanSelection}
                  />
                ))}
              </div>
            </section>
          </div>
          </div>
        </div>
      </div>
    </section>
  )
}
