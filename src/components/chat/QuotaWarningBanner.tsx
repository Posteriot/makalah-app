"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { WarningTriangle, Flash, CreditCard, Xmark } from "iconoir-react"
import { useState, useCallback } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { getEffectiveTier } from "@/lib/utils/subscription"

type BannerType = "warning" | "critical" | "depleted"

interface QuotaWarningBannerProps {
  className?: string
}

export function QuotaWarningBanner({ className }: QuotaWarningBannerProps) {
  const { user, isLoading: userLoading } = useCurrentUser()

  // Track the percent at which user dismissed the banner
  // Banner reappears if quota drops below 70% (after top-up/reset) then rises again
  const [dismissedAtPercent, setDismissedAtPercent] = useState<number | null>(null)

  // Get quota status
  const quotaStatus = useQuery(
    api.billing.quotas.getUserQuota,
    user?._id ? { userId: user._id } : "skip"
  )

  // Get credit balance for BPP tier
  const creditBalance = useQuery(
    api.billing.credits.getCreditBalance,
    user?._id ? { userId: user._id } : "skip"
  )

  const handleDismiss = useCallback(() => {
    const currentPercent = quotaStatus?.percentUsed ?? 0
    setDismissedAtPercent(currentPercent)
  }, [quotaStatus?.percentUsed])

  // Determine if banner is currently dismissed
  // Re-show if: user dismissed at X%, quota dropped below 70%, then rose above 70% again
  const currentPercent = quotaStatus?.percentUsed ?? 0
  const isDismissed = dismissedAtPercent !== null && currentPercent >= dismissedAtPercent * 0.9

  // Don't show anything while loading or if dismissed
  if (userLoading || !user || isDismissed) return null

  const tier = getEffectiveTier(user.role, user.subscriptionStatus)

  // Unlimited tier (admin) - never show quota warning
  if (tier === "unlimited") return null

  // Determine banner type and content
  let bannerType: BannerType | null = null
  let message = ""
  let actionText = ""
  let actionHref = ""

  if (tier === "gratis" || tier === "pro") {
    // Quota-based tiers
    if (!quotaStatus) return null

    const percentUsed = quotaStatus.percentUsed ?? 0

    if (percentUsed >= 100) {
      bannerType = "depleted"
      message = "Kuota habis. Upgrade ke Pro atau tunggu reset bulan depan."
      actionText = "Upgrade"
      actionHref = "/subscription/upgrade"
    } else if (percentUsed >= 90) {
      bannerType = "critical"
      message = `Kuota tersisa ${100 - Math.round(percentUsed)}%. Segera upgrade untuk lanjut tanpa batas.`
      actionText = "Upgrade"
      actionHref = "/subscription/upgrade"
    } else if (percentUsed >= 70) {
      bannerType = "warning"
      message = `Kuota tersisa ${100 - Math.round(percentUsed)}%. Pantau pemakaian Anda.`
      actionText = "Lihat Detail"
      actionHref = "/subscription/overview"
    }
  } else if (tier === "bpp") {
    // Credit-based tier
    if (!creditBalance) return null

    const remainingCredits = creditBalance.remainingCredits ?? 0

    if (remainingCredits <= 0) {
      bannerType = "depleted"
      message = "Kredit habis. Beli kredit untuk melanjutkan."
      actionText = "Beli Kredit"
      actionHref = "/subscription/plans"
    } else if (remainingCredits < 30) {
      bannerType = "critical"
      message = `Kredit rendah: ${remainingCredits} kredit. Segera beli kredit.`
      actionText = "Beli Kredit"
      actionHref = "/subscription/plans"
    } else if (remainingCredits < 100) {
      bannerType = "warning"
      message = `Sisa kredit: ${remainingCredits} kredit. Pertimbangkan beli kredit.`
      actionText = "Beli Kredit"
      actionHref = "/subscription/plans"
    }
  }

  // No banner needed
  if (!bannerType) return null

  // Mechanical Grace: Slate background, Signal Theory borders
  const bannerStyles = {
    warning: "bg-slate-900 border-amber-500/50 text-amber-200",
    critical: "bg-slate-900 border-orange-500/50 text-orange-200",
    depleted: "bg-slate-900 border-rose-500/50 text-rose-200",
  }

  const iconStyles = {
    warning: "text-amber-500",
    critical: "text-orange-500",
    depleted: "text-rose-500",
  }

  const Icon = bannerType === "depleted" ? WarningTriangle :
               tier === "bpp" ? CreditCard : Flash

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 border rounded-action text-sm",
        bannerStyles[bannerType],
        className
      )}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0", iconStyles[bannerType])} />

      <p className="flex-1 font-mono text-xs">{message}</p>

      <Link
        href={actionHref}
        className={cn(
          "font-mono text-xs font-medium underline underline-offset-2 hover:no-underline whitespace-nowrap",
          bannerType === "depleted" && "text-rose-300",
          bannerType === "critical" && "text-orange-300",
          bannerType === "warning" && "text-amber-300"
        )}
      >
        {actionText}
      </Link>

      {bannerType !== "depleted" && (
        <button
          onClick={handleDismiss}
          className="p-1 rounded-action hover:bg-black/5 dark:hover:bg-white/5 flex-shrink-0"
          aria-label="Tutup"
        >
          <Xmark className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
