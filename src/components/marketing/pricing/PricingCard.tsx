"use client"

import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { cn } from "@/lib/utils"

export type PricingPlan = {
  _id: string
  name: string
  slug: string
  price: string
  unit?: string
  tagline: string
  features: string[]
  ctaText: string
  ctaHref?: string
  isHighlighted: boolean
  isDisabled: boolean
}

// ════════════════════════════════════════════════════════════════
// CTA Component with Auth-Aware Redirect
// ════════════════════════════════════════════════════════════════

function PricingCTA({
  plan,
}: {
  plan: PricingPlan
}) {
  const { isSignedIn } = useUser()

  const getHref = (): string => {
    const dest = plan.ctaHref || "/chat"
    if (!isSignedIn) {
      return `/sign-up?redirect=${encodeURIComponent(dest)}`
    }
    return dest
  }

  // Disabled state (e.g., Pro coming soon)
  if (plan.isDisabled) {
    return (
      <button
        disabled
        className={cn(
          "w-full py-2.5 px-4 rounded-lg text-sm font-semibold",
          "bg-black/5 dark:bg-white/5",
          "border border-black/10 dark:border-white/10",
          "text-muted-foreground cursor-not-allowed opacity-60"
        )}
      >
        {plan.ctaText}
      </button>
    )
  }

  return (
    <Link
      href={getHref()}
      className={cn(
        "w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-center block",
        "transition-all duration-200",
        plan.isHighlighted
          ? "bg-[var(--brand)] text-white shadow-[0_4px_20px_rgba(232,102,9,0.2)] hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgba(232,102,9,0.4)]"
          : "bg-transparent border border-black/20 dark:border-white/30 text-foreground hover:bg-black/5 dark:hover:bg-white/5"
      )}
    >
      {plan.ctaText}
    </Link>
  )
}

// ════════════════════════════════════════════════════════════════
// Main PricingCard Component
// ════════════════════════════════════════════════════════════════

export function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <div className="relative h-full">
      {/* Popular tag for highlighted card */}
      {plan.isHighlighted && (
        <div
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 z-10",
            "bg-emerald-600 text-white",
            "text-[11px] font-semibold uppercase tracking-wide",
            "px-3 py-1 rounded-full whitespace-nowrap"
          )}
        >
          Solusi Terbaik
        </div>
      )}

      <div
        className={cn(
          "group relative overflow-hidden h-full min-h-[240px] md:min-h-[280px] flex flex-col p-4 md:p-8 rounded-lg",
          "border border-black/20 dark:border-white/25",
          "hover:bg-bento-light-hover dark:hover:bg-bento-hover",
          "hover:border-black/30 dark:hover:border-white/35",
          "hover:-translate-y-1 transition-all duration-300",
          plan.isHighlighted && "border-2 border-emerald-600 dark:border-emerald-500"
        )}
      >
        {/* Plan name */}
        <h3 className="font-sans font-light text-xl md:text-2xl text-foreground mb-3 text-center mt-4 md:mt-0">
          {plan.name}
        </h3>

        {/* Price */}
        <p className="font-mono text-3xl md:text-5xl tracking-tight text-foreground text-center mb-6">
          {plan.price}
          {plan.unit && (
            <span className="text-sm font-normal text-muted-foreground ml-1">
              {plan.unit}
            </span>
          )}
        </p>

        {/* Tagline with dot indicator */}
        <div className="flex items-start gap-3">
          <span className="w-2 h-2 min-w-2 rounded-full mt-3 bg-dot-light dark:bg-dot animate-badge-dot shadow-[0_0_8px_var(--color-dot-light)] dark:shadow-[0_0_8px_var(--color-dot)]" />
          <p className="font-mono font-bold text-base leading-relaxed text-foreground">
            {plan.tagline}
          </p>
        </div>

        {/* Features list */}
        <ul className="mt-4 pt-3 flex-1 space-y-1.5">
          {plan.features.map((feature, index) => (
            <li
              key={index}
              className="font-mono text-sm leading-relaxed text-foreground/80 flex items-start gap-2"
            >
              <span className="text-emerald-600 dark:text-emerald-500 mt-0.5">✓</span>
              {feature}
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <div className="mt-6">
          <PricingCTA plan={plan} />
        </div>
      </div>
    </div>
  )
}
