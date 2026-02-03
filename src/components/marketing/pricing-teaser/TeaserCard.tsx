import { cn } from "@/lib/utils"
import type { TeaserPlan } from "./types"

/**
 * TeaserCard - Individual pricing card
 * Styling mengikuti BentoBenefitsGrid (bento design tokens)
 */
export function TeaserCard({ plan }: { plan: TeaserPlan }) {
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
        <p className="font-mono text-3xl md:text-5xl mt-tracking-tight text-foreground text-center mb-6">
          {plan.price}
          {plan.unit && (
            <span className="text-sm font-normal text-muted-foreground ml-1">
              {plan.unit}
            </span>
          )}
        </p>

        {/* Description with dot indicator */}
        <div className="flex items-start gap-3">
          <span className="w-2 h-2 min-w-2 rounded-full mt-3 bg-dot-light dark:bg-dot animate-badge-dot shadow-[0_0_8px_var(--color-dot-light)] dark:shadow-[0_0_8px_var(--color-dot)]" />
          <p className="font-mono font-normal text-md leading-relaxed text-foreground">
            {plan.description}
          </p>
        </div>

        {/* Credit note */}
        <p className="font-mono text-xs leading-relaxed text-muted-foreground mt-6 md:mt-0 pt-3 md:pt-6 mb-6 md:md-0">
          {plan.creditNote}
        </p>
      </div>
    </div>
  )
}
