"use client"

import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import {
  ArrowUpCircle,
  CreditCard,
  Sparks,
  GraphUp,
  ChatBubble,
  Page,
  Search,
  Refresh,
  RefreshDouble,
} from "iconoir-react"
import { cn } from "@/lib/utils"
import { getEffectiveTier } from "@/lib/utils/subscription"
import type { EffectiveTier } from "@/lib/utils/subscription"
import { TOKENS_PER_CREDIT } from "@convex/billing/constants"

// Tier configuration
const TIER_CONFIG: Record<EffectiveTier, { label: string; description: string; color: string; textColor: string }> = {
  gratis: {
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

// Icon mapping for breakdown (backward-compatible keys for database)
const ICON_MAP = {
  MessageSquare: ChatBubble,
  FileText: Page,
  Search,
  RefreshCw: Refresh,
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
        <h1 className="text-interface text-xl font-semibold">Subskripsi</h1>
        <p className="text-sm text-muted-foreground">
          Sesi tidak aktif. Silakan login ulang.
        </p>
      </div>
    )
  }

  const tier = getEffectiveTier(user?.role, user?.subscriptionStatus)
  const tierConfig = TIER_CONFIG[tier]

  // For BPP users, show credit balance
  const isBPP = quotaStatus?.creditBased || tier === "bpp"

  // Admin/superadmin: unlimited access (backend returns { unlimited: true } without token fields)
  const isUnlimited = quotaStatus?.unlimited === true

  // Calculate usage percentage (for non-BPP)
  const usedTokens = quotaStatus?.usedTokens ?? 0
  const allottedTokens = quotaStatus?.allottedTokens ?? (isUnlimited ? 0 : 100000)
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

  // Credit balance for BPP (now in credits, not IDR)
  const currentCreditBalance = creditBalance?.remainingCredits ?? 0

  // Kredit conversion (1 kredit = 1.000 tokens)
  const usedKredit = Math.ceil(usedTokens / TOKENS_PER_CREDIT)
  const totalKredit = Math.floor(allottedTokens / TOKENS_PER_CREDIT)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-interface text-xl font-semibold flex items-center gap-2">
          <Sparks className="h-5 w-5 text-primary" />
          Subskripsi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola langganan dan pantau penggunaan Anda
        </p>
      </div>

      {/* Top Cards: Tier + Credit - 2 columns 50%/50% */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tier Card */}
        <div className="bg-slate-900/50 border border-hairline rounded-shell p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-signal text-[10px] text-slate-500">
                Tier Saat Ini
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-badge text-white",
                    tierConfig.color
                  )}
                >
                  {tierConfig.label}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-2">
                {tierConfig.description}
              </p>
            </div>
            <GraphUp className="h-5 w-5 text-slate-500" />
          </div>

          {tier !== "pro" && (
            <Link
              href="/subscription/upgrade"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-mono font-medium text-amber-500 hover:text-amber-400"
            >
              <ArrowUpCircle className="h-4 w-4" />
              Upgrade ke Pro
            </Link>
          )}
        </div>

        {/* Credit Balance Card */}
        <div className="bg-slate-900/50 border border-hairline rounded-shell p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-signal text-[10px] text-slate-500">
                Saldo Credit
              </p>
              <p className="text-interface text-2xl font-semibold mt-1 text-slate-100">
                {currentCreditBalance.toLocaleString("id-ID")} kredit
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Saldo untuk tier Bayar Per Paper
              </p>
            </div>
            <CreditCard className="h-5 w-5 text-slate-500" />
          </div>

          <Link
            href="/subscription/topup"
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-950 text-xs font-mono font-medium rounded-action hover:bg-amber-400 transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            Top Up
          </Link>
        </div>
      </div>

      {/* Usage Progress Card (for non-BPP users) */}
      {!isBPP && (
        <div className="bg-slate-900/50 border border-hairline rounded-shell p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-interface text-sm font-medium text-slate-200">Penggunaan Bulan Ini</h2>
            {!isUnlimited && (
              <span className="text-[10px] font-mono text-slate-500">
                Reset: {resetDate}
              </span>
            )}
          </div>

          {isUnlimited ? (
            <>
              {/* Admin/superadmin: unlimited access */}
              <p className="font-mono text-xl font-bold text-foreground">
                Unlimited
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Akses tidak terbatas (admin)
              </p>
            </>
          ) : (
            <>
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

              {/* Stats — kredit as primary, tokens as secondary */}
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xl font-bold">
                    <span className={cn("text-foreground", (isLowQuota || isBlocked) && "text-destructive")}>
                      {usedKredit.toLocaleString("id-ID")}
                    </span>
                    <span className="text-muted-foreground">
                      {" / "}
                      {totalKredit.toLocaleString("id-ID")}
                    </span>
                    {" "}
                    <span className="text-signal text-[10px] text-muted-foreground">kredit</span>
                  </span>
                  <span
                    className={cn(
                      "font-mono text-sm font-medium",
                      isBlocked ? "text-destructive" : isLowQuota ? "text-amber-600" : "text-muted-foreground"
                    )}
                  >
                    {usagePercentage}%
                  </span>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  {usedTokens.toLocaleString("id-ID")} / {allottedTokens.toLocaleString("id-ID")} tokens
                </p>
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
            </>
          )}
        </div>
      )}

      {/* BPP Credit Status Card */}
      {isBPP && (
        <div className="bg-slate-900/50 border border-hairline rounded-shell p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-interface text-sm font-medium text-slate-200">Status Credit</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-interface text-3xl font-bold text-slate-100">
                {currentCreditBalance.toLocaleString("id-ID")} kredit
              </p>
              <p className="text-sm text-slate-400 mt-1">
                ≈ {(currentCreditBalance * 1000).toLocaleString("id-ID")} tokens tersedia
              </p>
            </div>
            {creditBalance && currentCreditBalance < 100 && (
              <div className="px-3 py-1.5 bg-amber-500/15 text-amber-400 text-xs font-mono rounded-badge border border-amber-500/30">
                Saldo Rendah
              </div>
            )}
          </div>

          {creditBalance?.lastPurchaseAt && (
            <p className="text-[10px] font-mono text-slate-500 mt-3">
              Pembelian terakhir: {formatDate(creditBalance.lastPurchaseAt)}
              ({creditBalance.lastPurchaseCredits ?? 0} kredit)
            </p>
          )}
        </div>
      )}

      {/* Usage Breakdown Table */}
      <div className="bg-slate-900/50 border border-hairline rounded-shell overflow-hidden">
        <div className="px-4 py-3 border-b border-hairline">
          <h2 className="text-interface text-sm font-medium text-slate-200">Breakdown Penggunaan</h2>
        </div>

        {usageBreakdown === undefined ? (
          <div className="p-8 text-center">
            <RefreshDouble className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : usageBreakdown.breakdown.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Belum ada penggunaan bulan ini
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-slate-800/40">
                  <th className="text-left px-4 py-2 font-bold text-slate-500 uppercase tracking-wider">
                    Tipe
                  </th>
                  <th className="text-right px-4 py-2 font-bold text-slate-500 uppercase tracking-wider">
                    Kredit
                  </th>
                  <th className="text-right px-4 py-2 font-bold text-slate-500 uppercase tracking-wider">
                    Tokens
                  </th>
                  <th className="text-right px-4 py-2 font-bold text-slate-500 uppercase tracking-wider">
                    Estimasi Biaya
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {usageBreakdown.breakdown.map((item) => {
                  const IconComponent = ICON_MAP[item.icon as keyof typeof ICON_MAP] || ChatBubble
                  return (
                    <tr key={item.type} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-slate-500" />
                          <span className="text-slate-200">{item.type}</span>
                        </div>
                      </td>
                      <td className="text-right px-4 py-3 tabular-nums text-slate-200">
                        {Math.ceil(item.tokens / TOKENS_PER_CREDIT).toLocaleString("id-ID")}
                      </td>
                      <td className="text-right px-4 py-3 tabular-nums text-slate-100">
                        {item.tokens.toLocaleString("id-ID")}
                      </td>
                      <td className="text-right px-4 py-3 tabular-nums text-slate-400">
                        Rp {item.cost.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800/40 font-semibold">
                  <td className="px-4 py-2 text-slate-200">Total</td>
                  <td className="text-right px-4 py-2 tabular-nums text-slate-100">
                    {Math.ceil(usageBreakdown.totalTokens / TOKENS_PER_CREDIT).toLocaleString("id-ID")}
                  </td>
                  <td className="text-right px-4 py-2 tabular-nums text-slate-100">
                    {usageBreakdown.totalTokens.toLocaleString("id-ID")}
                  </td>
                  <td className="text-right px-4 py-2 tabular-nums text-slate-200">
                    Rp {usageBreakdown.totalCost.toLocaleString("id-ID")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Conversion note */}
      <p className="font-mono text-[10px] text-muted-foreground px-1">
        1 kredit = 1.000 tokens. Estimasi biaya berdasarkan harga rata-rata model AI.
      </p>

      {/* Hybrid Model Info */}
      <div className="bg-slate-800/30 border border-hairline rounded-shell p-4">
        <h3 className="text-interface text-sm font-medium text-slate-200 mb-2">Cara Kerja Pembayaran</h3>
        <ul className="text-sm text-slate-400 space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-amber-500">1.</span>
            <span>
              <strong>Gratis:</strong> 100K tokens/bulan untuk mencoba fitur dasar
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500">2.</span>
            <span>
              <strong>Top Up Credit:</strong> Beli credit mulai Rp 25.000, bayar sesuai
              pemakaian
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500">3.</span>
            <span>
              <strong>Pro:</strong> Rp 200.000/bulan untuk menyusun 5-6 paper
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}
