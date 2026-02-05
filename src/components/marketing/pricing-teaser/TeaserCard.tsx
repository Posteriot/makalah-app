import { cn } from "@/lib/utils"
import type { TeaserPlan } from "./types"

/**
 * TeaserCard - Individual pricing card
 * Styling mengikuti BentoBenefitsGrid (bento design tokens)
 */
export function TeaserCard({ plan }: { plan: TeaserPlan }) {
  return (
    <div className="group relative h-full">
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
          "relative overflow-hidden h-full min-h-[240px] md:min-h-[280px] flex flex-col p-comfort md:p-airy rounded-shell",
          "border-1 border-[color:var(--slate-400)]",
          "group-hover:bg-[color:var(--slate-200)] dark:group-hover:bg-[color:var(--slate-700)]",
          "group-hover:-translate-y-1 transition-all duration-300",
          plan.isHighlighted && "border-2 border-[color:var(--emerald-500)]"
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

        {/* Description with dot indicator */}
        <div className="flex items-start gap-3">
          <span className="w-2 h-2 min-w-2 rounded-full mt-3 bg-[color:var(--rose-500)] animate-pulse shadow-[0_0_8px_var(--rose-500)]" />
          <p className="text-interface font-normal text-sm leading-relaxed text-foreground">
            {plan.description}
          </p>
        </div>

        {/* Credit note */}
        <p className="text-interface text-xs leading-relaxed text-foreground mt-6 md:mt-0 pt-3 md:pt-6 mb-6 md:md-0">
          {plan.creditNote}
        </p>
      </div>
    </div>
  )
}
