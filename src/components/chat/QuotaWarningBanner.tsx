"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { AlertTriangle, Zap, CreditCard, X } from "lucide-react"
import { useState, useCallback } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

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

  const tier = user.subscriptionStatus || "free"
  const tierDisplay = tier === "free" ? "gratis" : tier

  // Determine banner type and content
  let bannerType: BannerType | null = null
  let message = ""
  let actionText = ""
  let actionHref = ""

  if (tierDisplay === "gratis" || tierDisplay === "pro") {
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
  } else if (tierDisplay === "bpp") {
    // Credit-based tier
    if (!creditBalance) return null

    const balanceIDR = creditBalance.balanceIDR ?? 0

    if (balanceIDR <= 0) {
      bannerType = "depleted"
      message = "Saldo credit habis. Top up untuk melanjutkan."
      actionText = "Top Up"
      actionHref = "/subscription/topup"
    } else if (balanceIDR < 5000) {
      bannerType = "critical"
      message = `Saldo credit rendah: Rp ${balanceIDR.toLocaleString("id-ID")}. Segera top up.`
      actionText = "Top Up"
      actionHref = "/subscription/topup"
    } else if (balanceIDR < 15000) {
      bannerType = "warning"
      message = `Saldo credit: Rp ${balanceIDR.toLocaleString("id-ID")}. Pertimbangkan top up.`
      actionText = "Top Up"
      actionHref = "/subscription/topup"
    }
  }

  // No banner needed
  if (!bannerType) return null

  const bannerStyles = {
    warning: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
    critical: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200",
    depleted: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
  }

  const iconStyles = {
    warning: "text-amber-500",
    critical: "text-orange-500",
    depleted: "text-red-500",
  }

  const Icon = bannerType === "depleted" ? AlertTriangle :
               tierDisplay === "bpp" ? CreditCard : Zap

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 border rounded-lg text-sm",
        bannerStyles[bannerType],
        className
      )}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0", iconStyles[bannerType])} />

      <p className="flex-1">{message}</p>

      <Link
        href={actionHref}
        className={cn(
          "font-medium underline underline-offset-2 hover:no-underline whitespace-nowrap",
          bannerType === "depleted" && "text-red-700 dark:text-red-300",
          bannerType === "critical" && "text-orange-700 dark:text-orange-300",
          bannerType === "warning" && "text-amber-700 dark:text-amber-300"
        )}
      >
        {actionText}
      </Link>

      {bannerType !== "depleted" && (
        <button
          onClick={handleDismiss}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 flex-shrink-0"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
