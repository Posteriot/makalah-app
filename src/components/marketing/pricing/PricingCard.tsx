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
          "w-full py-2.5 px-4 rounded-action text-xs font-mono font-bold uppercase tracking-widest",
          "bg-muted/40 border border-main text-muted-foreground",
          "cursor-not-allowed opacity-60"
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
        "w-full py-2.5 px-4 rounded-action text-xs font-mono font-bold uppercase tracking-widest text-center block",
        "transition-colors",
        plan.isHighlighted
          ? "bg-primary text-primary-foreground hover:bg-primary/90 hover-slash"
          : "bg-transparent border border-main text-foreground hover:bg-muted/50 hover-slash"
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
            "transition-transform duration-300 group-hover:-translate-y-1",
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
          "group relative overflow-hidden h-full min-h-[240px] md:min-h-[280px] flex flex-col p-4 md:p-8 rounded-shell",
          "border-1 border-[color:var(--slate-400)]",
          "group-hover:bg-[color:var(--slate-200)] dark:group-hover:bg-[color:var(--slate-700)]",
          "group-hover:-translate-y-1 transition-all duration-300",
          plan.isHighlighted && "border-2 border-[color:var(--emerald-500)]"
        )}
      >
        {/* Plan name */}
        <h3 className="font-mono font-bold text-xs uppercase tracking-widest text-amber-500 text-center mt-4 md:mt-0">
          {plan.name}
        </h3>

        {/* Price */}
        <p className="font-mono text-4xl md:text-5xl font-bold tracking-tight text-foreground text-center mb-6">
          {plan.price}
          {plan.unit && (
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground ml-2">
              {plan.unit}
            </span>
          )}
        </p>

        <div className="my-4 border-t border-hairline" />

        {/* Tagline with dot indicator */}
        <div className="flex items-start gap-3">
          <span className="w-2 h-2 min-w-2 rounded-full mt-3 bg-[color:var(--rose-500)] animate-pulse shadow-[0_0_8px_var(--rose-500)]" />
          <p className="font-mono text-sm leading-relaxed text-foreground">
            {plan.tagline}
          </p>
        </div>

        {/* Features list */}
        <ul className="mt-4 pt-3 flex-1 space-y-1.5">
          {plan.features.map((feature, index) => (
            <li
              key={index}
              className="font-mono text-[11px] leading-relaxed text-foreground/80 flex items-start gap-2"
            >
              <span className="text-[color:var(--emerald-500)] mt-0.5">✓</span>
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
