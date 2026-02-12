"use client"

import { cn } from "@/lib/utils"
import { useCreditMeter } from "@/lib/hooks/useCreditMeter"
import { SegmentBadge } from "@/components/ui/SegmentBadge"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import Link from "next/link"

interface CreditMeterProps {
  variant: "compact" | "standard" | "detailed"
  className?: string
  onClick?: () => void
}

const BAR_HEIGHT: Record<CreditMeterProps["variant"], string> = {
  compact: "h-1",
  standard: "h-1.5",
  detailed: "h-2",
}

const LEVEL_COLORS = {
  normal: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-rose-500",
  depleted: "bg-rose-500",
} as const

function formatNumber(n: number): string {
  return n.toLocaleString("id-ID")
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp))
}

/**
 * CreditMeter — Universal credit usage meter
 *
 * Displays kredit usage for all tiers (Gratis, BPP, Pro).
 * Admin/superadmin: returns null (hidden).
 *
 * Variants:
 * - compact (~40px): sidebar footer
 * - standard (~64px): settings page
 * - detailed (~120px): overview page
 */
export function CreditMeter({ variant, className, onClick }: CreditMeterProps) {
  const { user } = useCurrentUser()
  const meter = useCreditMeter()

  // Admin/superadmin: hidden
  if (meter.isAdmin) return null

  // Loading state
  if (meter.isLoading) {
    return (
      <div
        className={cn("px-3 py-2", className)}
        data-testid="credit-meter-skeleton"
      >
        <div className={cn("w-full rounded-none bg-muted animate-pulse", BAR_HEIGHT[variant])} />
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">&mdash; kredit</p>
      </div>
    )
  }

  const Wrapper = onClick ? "button" : "div"
  const wrapperProps = onClick
    ? { onClick, type: "button" as const, className: cn("w-full text-left", className) }
    : { className }

  // BPP tier — no progress bar
  if (meter.tier === "bpp") {
    return (
      <Wrapper {...wrapperProps}>
        <div className="px-3 py-2">
          <p className="font-mono text-sm font-semibold text-foreground">
            {formatNumber(meter.remaining)}{" "}
            <span className="text-signal text-[10px] text-muted-foreground">kredit tersisa</span>
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <SegmentBadge role={user?.role} subscriptionStatus={user?.subscriptionStatus} />
            {variant !== "compact" && (
              <Link
                href="/subscription/plans"
                className="font-mono text-[10px] font-medium text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Top Up &rarr;
              </Link>
            )}
          </div>
          {variant === "compact" && meter.level !== "normal" && (
            <p className="mt-1 font-mono text-[10px] text-amber-500">
              Top Up &rarr;
            </p>
          )}
        </div>
      </Wrapper>
    )
  }

  // Gratis / Pro — quota-based with progress bar
  const barPercent = Math.min(meter.percentage, 100)
  const hasOverage = meter.overage !== undefined && meter.overage > 0

  return (
    <Wrapper {...wrapperProps}>
      <div className="px-3 py-2">
        {/* Progress bar */}
        <div
          className={cn("w-full rounded-none bg-muted overflow-hidden", BAR_HEIGHT[variant])}
          role="progressbar"
          aria-valuenow={barPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn(
              "h-full rounded-none transition-all duration-300",
              hasOverage ? "bg-amber-500" : LEVEL_COLORS[meter.level]
            )}
            style={{ width: `${barPercent}%` }}
          />
        </div>

        {/* Kredit text */}
        <div className="mt-1 flex items-center justify-between">
          <p className="font-mono text-sm">
            <span className="font-semibold text-foreground">
              {formatNumber(meter.used)}
            </span>
            <span className="text-muted-foreground">
              /{formatNumber(meter.total)}
            </span>
            {" "}
            <span className="text-signal text-[10px] text-muted-foreground">kredit</span>
          </p>
          <SegmentBadge role={user?.role} subscriptionStatus={user?.subscriptionStatus} />
        </div>

        {/* Pro overage badge */}
        {hasOverage && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-badge border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-400">
              +{formatNumber(meter.overage!)} overage
            </span>
            {meter.overageCost !== undefined && (
              <span className="font-mono text-[10px] text-muted-foreground">
                (Rp {formatNumber(meter.overageCost)})
              </span>
            )}
          </div>
        )}

        {/* Pro cancelAtPeriodEnd warning */}
        {meter.cancelAtPeriodEnd && meter.periodEnd && (
          <p className="mt-1 font-mono text-[10px] font-medium text-rose-500">
            Berakhir: {formatDate(meter.periodEnd)}
          </p>
        )}

        {/* Standard/detailed: show reset date */}
        {variant !== "compact" && meter.periodEnd && !meter.cancelAtPeriodEnd && (
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            Reset: {formatDate(meter.periodEnd)}
          </p>
        )}
      </div>
    </Wrapper>
  )
}

export default CreditMeter
