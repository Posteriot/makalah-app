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

  // Admin/superadmin: show badge + "Unlimited" in single line
  if (meter.isAdmin) {
    const AdminWrapper = onClick ? "button" : "div"
    const adminProps = onClick
      ? { onClick, type: "button" as const, className: cn("w-full text-left", className) }
      : { className }

    return (
      <AdminWrapper {...adminProps}>
        <div className="flex items-center gap-2 px-3 py-2">
          <SegmentBadge role={user?.role} subscriptionStatus={user?.subscriptionStatus} />
          <span className="font-mono text-xs font-semibold text-foreground">Unlimited</span>
        </div>
      </AdminWrapper>
    )
  }

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

  // BPP tier — credit-based (no progress bar in compact)
  if (meter.tier === "bpp") {
    // Compact: single line — [BPP] used/total
    if (variant === "compact") {
      return (
        <Wrapper {...wrapperProps}>
          <div className="flex items-center gap-2 px-3 py-2">
            <SegmentBadge role={user?.role} subscriptionStatus={user?.subscriptionStatus} />
            <span className="font-mono text-xs text-foreground">
              <span className="font-semibold">{formatNumber(meter.used)}</span>
              <span className="text-muted-foreground">/{formatNumber(meter.total)}</span>
            </span>
          </div>
        </Wrapper>
      )
    }

    // Standard/detailed: keep expanded layout
    return (
      <Wrapper {...wrapperProps}>
        <div className="px-3 py-2">
          <div className="flex items-center gap-2">
            <SegmentBadge role={user?.role} subscriptionStatus={user?.subscriptionStatus} />
            <p className="font-mono text-sm text-foreground">
              <span className="font-semibold">{formatNumber(meter.used)}</span>
              <span className="text-muted-foreground">/{formatNumber(meter.total)}</span>
            </p>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <Link
              href="/subscription/plans"
              className="font-mono text-[10px] font-medium text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Top Up &rarr;
            </Link>
          </div>
        </div>
      </Wrapper>
    )
  }

  // Gratis / Pro — quota-based
  const barPercent = Math.min(meter.percentage, 100)
  const hasOverage = meter.overage !== undefined && meter.overage > 0

  // Compact: single line — [BADGE] used/total
  if (variant === "compact") {
    return (
      <Wrapper {...wrapperProps}>
        <div className="flex items-center gap-2 px-3 py-2">
          <SegmentBadge role={user?.role} subscriptionStatus={user?.subscriptionStatus} />
          <span className="font-mono text-xs text-foreground">
            <span className="font-semibold">{formatNumber(meter.used)}</span>
            <span className="text-muted-foreground">/{formatNumber(meter.total)}</span>
          </span>
        </div>
      </Wrapper>
    )
  }

  // Standard/detailed: full layout with progress bar
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

        {/* Show reset date */}
        {meter.periodEnd && !meter.cancelAtPeriodEnd && (
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            Reset: {formatDate(meter.periodEnd)}
          </p>
        )}
      </div>
    </Wrapper>
  )
}

export default CreditMeter
