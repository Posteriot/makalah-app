"use client"

import { useSession } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { SectionCTA } from "@/components/ui/section-cta"

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
  const { data: session } = useSession()
  const isSignedIn = !!session

  const getHref = (): string => {
    const dest = plan.ctaHref || "/chat"
    if (!isSignedIn) {
      return `/sign-up?redirect_url=${encodeURIComponent(dest)}`
    }
    return dest
  }

  // Disabled state (e.g., Pro coming soon)
  if (plan.isDisabled) {
    return (
      <button
        disabled
        className={cn(
          "group relative overflow-hidden",
          "inline-flex items-center justify-center gap-2 rounded-action px-4 py-2",
          "text-signal text-[11px] font-bold uppercase tracking-widest",
          "border border-transparent bg-slate-800 text-slate-100",
          "dark:bg-slate-100 dark:text-slate-800",
          "cursor-not-allowed opacity-60"
        )}
      >
        {plan.ctaText}
      </button>
    )
  }

  return (
    <SectionCTA href={getHref()} className="justify-center uppercase tracking-widest">
      {plan.ctaText}
    </SectionCTA>
  )
}

// ════════════════════════════════════════════════════════════════
// Main PricingCard Component
// ════════════════════════════════════════════════════════════════

export function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <div className="group/card relative h-full">
      {/* Popular tag for highlighted card */}
      {plan.isHighlighted && (
        <div
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 z-10",
            "transition-transform duration-300 group-hover/card:-translate-y-1",
            "bg-emerald-500 text-slate-50",
            "text-[11px] font-semibold uppercase tracking-wide",
            "px-3 py-1 rounded-full whitespace-nowrap"
          )}
        >
          Solusi Terbaik
        </div>
      )}

      <div
        className={cn(
          "relative overflow-hidden h-full min-h-[240px] md:min-h-[280px] flex flex-col p-comfort md:p-airy rounded-shell",
          "border border-slate-500",
          "group-hover/card:bg-slate-200 dark:group-hover/card:bg-slate-700",
          "group-hover/card:-translate-y-1 transition-all duration-300",
          plan.isHighlighted && "border-2 border-emerald-500"
        )}
      >
        {/* Plan name */}
        <h3 className="text-narrative font-light text-xl md:text-2xl text-foreground mb-3 text-center mt-4 md:mt-0">
          {plan.name}
        </h3>

        {/* Price */}
        <p className="text-interface text-3xl md:text-3xl font-medium tracking-tight tabular-nums text-foreground text-center mb-6">
          {plan.price}
          {plan.unit && (
            <span className="text-interface text-sm font-normal text-muted-foreground ml-1">
              {plan.unit}
            </span>
          )}
        </p>

        {/* Tagline with dot indicator */}
        <div className="flex items-start gap-3">
          <span className="w-2 h-2 min-w-2 rounded-full mt-3 bg-rose-500 animate-pulse shadow-[0_0_8px] shadow-rose-500" />
          <p className="text-interface font-normal text-sm leading-relaxed text-foreground">
            {plan.tagline}
          </p>
        </div>

        {/* Features list */}
        <ul className="mt-6 md:mt-0 pt-3 md:pt-6 flex-1 space-y-1.5">
          {plan.features.map((feature, index) => (
            <li
              key={index}
              className="text-interface text-xs leading-relaxed text-foreground flex items-start gap-2"
            >
              <span className="text-emerald-500 mt-0.5">✓</span>
              {feature}
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <div className="mt-6 flex justify-center">
          <PricingCTA plan={plan} />
        </div>
      </div>
    </div>
  )
}
