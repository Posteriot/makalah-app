"use client"

import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import {
  ArrowUpCircle,
  CreditCard,
  Sparkles,
  TrendingUp,
  MessageSquare,
  FileText,
  Search,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Tier configuration
const TIER_CONFIG = {
  gratis: {
    label: "GRATIS",
    description: "Akses dasar dengan limit",
    color: "bg-segment-gratis",
    textColor: "text-segment-gratis",
  },
  free: {
    label: "GRATIS",
    description: "Akses dasar dengan limit",
    color: "bg-segment-gratis",
    textColor: "text-segment-gratis",
  },
  bpp: {
    label: "BPP",
    description: "Bayar Per Paper",
    color: "bg-segment-bpp",
    textColor: "text-segment-bpp",
  },
  pro: {
    label: "PRO",
    description: "Akses penuh tanpa batas",
    color: "bg-segment-pro",
    textColor: "text-segment-pro",
  },
}

// Icon mapping for breakdown
const ICON_MAP = {
  MessageSquare,
  FileText,
  Search,
  RefreshCw,
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp))
}

export default function SubscriptionOverviewPage() {
  const { user, isLoading: userLoading } = useCurrentUser()

  // Get quota status
  const quotaStatus = useQuery(
    api.billing.quotas.getQuotaStatus,
    user?._id ? { userId: user._id } : "skip"
  )

  // Get monthly usage breakdown
  const usageBreakdown = useQuery(
    api.billing.usage.getMonthlyBreakdown,
    user?._id ? { userId: user._id } : "skip"
  )

  // Get credit balance (for BPP users)
  const creditBalance = useQuery(
    api.billing.credits.getCreditBalance,
    user?._id ? { userId: user._id } : "skip"
  )

  // Loading state
  if (userLoading || quotaStatus === undefined) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Subskripsi</h1>
        <p className="text-sm text-muted-foreground">
          Sesi tidak aktif. Silakan login ulang.
        </p>
      </div>
    )
  }

  const tier = (user?.subscriptionStatus || "free") as keyof typeof TIER_CONFIG
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.gratis

  // For BPP users, show credit balance
  const isBPP = quotaStatus?.creditBased || tier === "bpp"

  // Calculate usage percentage (for non-BPP)
  const usedTokens = quotaStatus?.usedTokens ?? 0
  const allottedTokens = quotaStatus?.allottedTokens ?? 100000
  const rawUsagePercentage =
    quotaStatus?.percentageUsed ??
    (allottedTokens > 0 ? (usedTokens / allottedTokens) * 100 : 0)
  const usagePercentage = Number.isFinite(rawUsagePercentage)
    ? Math.max(0, Math.round(rawUsagePercentage))
    : 0
  const isLowQuota = quotaStatus?.warningLevel === "warning" || quotaStatus?.warningLevel === "critical"
  const isBlocked = quotaStatus?.warningLevel === "blocked"

  // Reset date (end of current period)
  const resetDate = quotaStatus?.periodEnd ? formatDate(quotaStatus.periodEnd) : "-"

  // Credit balance for BPP
  const currentCreditBalance = creditBalance?.balanceIDR ?? 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Subskripsi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola langganan dan pantau penggunaan Anda
        </p>
      </div>

      {/* Top Cards: Tier + Credit - 2 columns 50%/50% */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tier Card */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Tier Saat Ini
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded text-white",
                    tierConfig.color
                  )}
                >
                  {tierConfig.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {tierConfig.description}
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>

          {tier !== "pro" && (
            <Link
              href="/subscription/upgrade"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ArrowUpCircle className="h-4 w-4" />
              Upgrade ke Pro
            </Link>
          )}
        </div>

        {/* Credit Balance Card */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Saldo Credit
              </p>
              <p className="text-2xl font-semibold mt-1">
                Rp {currentCreditBalance.toLocaleString("id-ID")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Saldo untuk tier Bayar Per Paper
              </p>
            </div>
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </div>

          <Link
            href="/subscription/topup"
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            Top Up
          </Link>
        </div>
      </div>

      {/* Usage Progress Card (for non-BPP users) */}
      {!isBPP && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Penggunaan Bulan Ini</h2>
            <span className="text-xs text-muted-foreground">
              Reset: {resetDate}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "absolute left-0 top-0 h-full rounded-full transition-all",
                isBlocked ? "bg-destructive" : isLowQuota ? "bg-amber-500" : "bg-primary"
              )}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm">
              <span className={cn("font-semibold", (isLowQuota || isBlocked) && "text-destructive")}>
                {usedTokens.toLocaleString("id-ID")}
              </span>
              <span className="text-muted-foreground">
                {" / "}
                {allottedTokens.toLocaleString("id-ID")} tokens
              </span>
            </span>
            <span
              className={cn(
                "text-sm font-medium",
                isBlocked ? "text-destructive" : isLowQuota ? "text-amber-600" : "text-muted-foreground"
              )}
            >
              {usagePercentage}%
            </span>
          </div>

          {isBlocked && (
            <p className="text-xs text-destructive mt-2">
              Quota bulanan habis. Upgrade ke Pro atau top up credit untuk melanjutkan.
            </p>
          )}

          {isLowQuota && !isBlocked && (
            <p className="text-xs text-amber-600 mt-2">
              Quota hampir habis. Pertimbangkan untuk upgrade atau top up credit.
            </p>
          )}

          {/* Pro tier overage info */}
          {quotaStatus?.overageTokens && quotaStatus.overageTokens > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Overage: {quotaStatus.overageTokens.toLocaleString("id-ID")} tokens
              (Rp {quotaStatus.overageCostIDR?.toLocaleString("id-ID") ?? 0})
            </p>
          )}
        </div>
      )}

      {/* BPP Credit Status Card */}
      {isBPP && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Status Credit</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-3xl font-bold">
                Rp {currentCreditBalance.toLocaleString("id-ID")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                ≈ {(currentCreditBalance * 10).toLocaleString("id-ID")} tokens tersedia
              </p>
            </div>
            {creditBalance && currentCreditBalance < 10000 && (
              <div className="px-3 py-1.5 bg-amber-100 text-amber-800 text-sm rounded-md">
                Saldo Rendah
              </div>
            )}
          </div>

          {creditBalance?.lastTopUpAt && (
            <p className="text-xs text-muted-foreground mt-3">
              Top up terakhir: {formatDate(creditBalance.lastTopUpAt)}
              (Rp {creditBalance.lastTopUpAmount?.toLocaleString("id-ID") ?? 0})
            </p>
          )}
        </div>
      )}

      {/* Usage Breakdown Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-medium">Breakdown Penggunaan</h2>
        </div>

        {usageBreakdown === undefined ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : usageBreakdown.breakdown.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Belum ada penggunaan bulan ini
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Tipe
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                    Tokens
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                    Estimasi Biaya
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usageBreakdown.breakdown.map((item) => {
                  const IconComponent = ICON_MAP[item.icon as keyof typeof ICON_MAP] || MessageSquare
                  return (
                    <tr key={item.type} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <span>{item.type}</span>
                        </div>
                      </td>
                      <td className="text-right px-4 py-3 tabular-nums">
                        {item.tokens.toLocaleString("id-ID")}
                      </td>
                      <td className="text-right px-4 py-3 tabular-nums text-muted-foreground">
                        Rp {item.cost.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-medium">
                  <td className="px-4 py-2">Total</td>
                  <td className="text-right px-4 py-2 tabular-nums">
                    {usageBreakdown.totalTokens.toLocaleString("id-ID")}
                  </td>
                  <td className="text-right px-4 py-2 tabular-nums">
                    Rp {usageBreakdown.totalCost.toLocaleString("id-ID")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Hybrid Model Info */}
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <h3 className="font-medium mb-2">Cara Kerja Pembayaran</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-primary">1.</span>
            <span>
              <strong>Gratis:</strong> 100K tokens/bulan untuk mencoba fitur dasar
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">2.</span>
            <span>
              <strong>Top Up Credit:</strong> Beli credit mulai Rp 25.000, bayar sesuai
              pemakaian
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">3.</span>
            <span>
              <strong>Pro:</strong> Rp 200.000/bulan untuk menyusun 5-6 paper
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}
