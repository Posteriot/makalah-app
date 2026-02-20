import { cn } from "@/lib/utils"
import type { TeaserPlan } from "./types"

/**
 * TeaserCard - Individual pricing card
 * Styling mengikuti BentoBenefitsGrid (bento design tokens)
 */
export function TeaserCard({ plan, isWaitlistMode }: { plan: TeaserPlan; isWaitlistMode?: boolean }) {
  const isDisabledByWaitlist = isWaitlistMode && plan.name.toLowerCase() !== "gratis"
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
          "bg-card/88 backdrop-blur-[1px] dark:bg-slate-900/88",
          "border-1 border-[color:var(--slate-400)]",
          "group-hover:bg-slate-100 group-hover:border-[color:var(--slate-500)] dark:group-hover:bg-slate-800 dark:group-hover:border-[color:var(--slate-600)]",
          "group-hover:-translate-y-1 transition-all duration-300",
          plan.isHighlighted && "border-2 border-[color:var(--emerald-500)]",
          isDisabledByWaitlist && "opacity-60"
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

        {isDisabledByWaitlist && (
          <div className="mt-auto pt-4">
            <span className="inline-flex items-center justify-center w-full px-4 py-2 text-signal text-[11px] font-bold uppercase tracking-widest rounded-action bg-slate-200 dark:bg-slate-700 text-muted-foreground">
              SEGERA HADIR
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
