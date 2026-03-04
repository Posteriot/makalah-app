"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { WarningTriangle, Flash, CreditCard, Xmark } from "iconoir-react"
import { useState, useCallback } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { getEffectiveTier } from "@/lib/utils/subscription"
import { Button } from "@/components/ui/button"
import {
  resolveQuotaOffer,
  type QuotaVisualState,
} from "@/lib/billing/quota-offer-policy"

type BannerType = "warning" | "critical" | "depleted"
type PreviewTier = "gratis" | "pro" | "bpp"

interface QuotaWarningBannerProps {
  className?: string
  preview?: {
    enabled?: boolean
    tier?: PreviewTier
    type?: BannerType
  }
}

export function QuotaWarningBanner({ className, preview }: QuotaWarningBannerProps) {
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

  let bannerType: BannerType | null = null
  let visualState: QuotaVisualState | null = null
  let offer: ReturnType<typeof resolveQuotaOffer> | null = null
  let tierForIcon: PreviewTier = "bpp"

  const isPreviewEnabled = preview?.enabled === true
  if (isPreviewEnabled) {
    tierForIcon = preview?.tier ?? "bpp"
    bannerType = preview?.type ?? "depleted"
    visualState = bannerType
    offer = resolveQuotaOffer({
      tier: tierForIcon,
      context: "banner",
      visualState,
    })
  } else {
    // Don't show anything while loading or if dismissed
    if (userLoading || !user || isDismissed) return null

    const tier = getEffectiveTier(user.role, user.subscriptionStatus)

    // Unlimited tier (admin) - never show quota warning
    if (tier === "unlimited") return null
    tierForIcon = tier as PreviewTier

    if (tier === "gratis" || tier === "pro") {
      // Quota-based tiers
      if (!quotaStatus) return null

      const percentUsed = quotaStatus.percentUsed ?? 0

      if (percentUsed >= 100) {
        bannerType = "depleted"
      } else if (percentUsed >= 90) {
        bannerType = "critical"
      } else if (percentUsed >= 70) {
        bannerType = "warning"
      }
    } else if (tier === "bpp") {
      // Credit-based tier
      if (!creditBalance) return null

      const remainingCredits = creditBalance.remainingCredits ?? 0

      if (remainingCredits <= 0) {
        bannerType = "depleted"
      } else if (remainingCredits < 30) {
        bannerType = "critical"
      } else if (remainingCredits < 100) {
        bannerType = "warning"
      }
    }

    if (bannerType) {
      visualState = bannerType
      offer = resolveQuotaOffer({
        tier,
        context: "banner",
        visualState,
      })
    }
  }

  // No banner needed
  if (!bannerType || !visualState || !offer) return null

  // Align visual language with quota-rejected chat error UI (without changing banner placement/width).
  const bannerStyles = {
    warning: "bg-[var(--chat-warning)] border-[color:var(--chat-warning)] text-[var(--chat-warning-foreground)]",
    critical: "bg-[var(--chat-destructive)] border-[color:var(--chat-destructive)] text-[var(--chat-destructive-foreground)]",
    depleted: "bg-[var(--chat-destructive)] border-[color:var(--chat-destructive)] text-[var(--chat-destructive-foreground)]",
  }

  const iconStyles = {
    warning: "text-[var(--chat-warning-foreground)]",
    critical: "text-[var(--chat-destructive-foreground)]",
    depleted: "text-[var(--chat-destructive-foreground)]",
  }

  const actionButtonStyles = {
    warning:
      "h-7 rounded-action bg-[var(--chat-background)] text-[var(--chat-foreground)] hover:bg-[oklch(0.869_0.022_252.894)] hover:text-[var(--chat-foreground)] text-xs font-sans border-[color:var(--chat-warning)] hover:border-[color:var(--chat-warning)] dark:border-0 dark:hover:border-0 shadow-none hover:shadow-none dark:shadow-none dark:hover:shadow-none",
    critical:
      "h-7 rounded-action bg-[var(--chat-background)] dark:bg-[oklch(0.455_0.188_13.697)] text-[var(--chat-foreground)] dark:text-[var(--chat-destructive-foreground)] hover:bg-[oklch(0.869_0.022_252.894)] dark:hover:bg-[oklch(0.41_0.159_10.272)] hover:text-[var(--chat-foreground)] text-xs font-sans border-[color:var(--chat-destructive)] hover:border-[color:var(--chat-destructive)] dark:border-0 dark:hover:border-0 shadow-none hover:shadow-none dark:shadow-none dark:hover:shadow-none",
    depleted:
      "h-7 rounded-action bg-[var(--chat-background)] dark:bg-[oklch(0.455_0.188_13.697)] text-[var(--chat-foreground)] dark:text-[var(--chat-destructive-foreground)] hover:bg-[oklch(0.869_0.022_252.894)] dark:hover:bg-[oklch(0.41_0.159_10.272)] hover:text-[var(--chat-foreground)] text-xs font-sans border-[color:var(--chat-destructive)] hover:border-[color:var(--chat-destructive)] dark:border-0 dark:hover:border-0 shadow-none hover:shadow-none dark:shadow-none dark:hover:shadow-none",
  }

  const Icon = bannerType === "depleted" ? WarningTriangle :
               tierForIcon === "bpp" ? CreditCard : Flash

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border rounded-action p-3 text-sm md:flex-nowrap md:gap-3 md:px-4",
        bannerStyles[bannerType],
        className
      )}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0", iconStyles[bannerType])} />

      <p className="flex-1 basis-full text-xs font-sans md:basis-auto">{offer.message}</p>

      <Button asChild variant="outline" size="sm" className={actionButtonStyles[bannerType]}>
        <Link href={offer.primaryCta.href} className="whitespace-nowrap">
          {offer.primaryCta.label}
        </Link>
      </Button>

      {offer.secondaryCta && (
        <Button asChild variant="outline" size="sm" className={actionButtonStyles[bannerType]}>
          <Link href={offer.secondaryCta.href} className="whitespace-nowrap">
            {offer.secondaryCta.label}
          </Link>
        </Button>
      )}

      {bannerType !== "depleted" && (
        <button
          onClick={handleDismiss}
          className="p-1.5 -mr-1 rounded-action hover:bg-[var(--chat-muted)] flex-shrink-0"
          aria-label="Tutup"
        >
          <Xmark className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
