"use client"

import Link from "next/link"
import { SectionCTA } from "@/components/ui/section-cta"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useCreditMeter } from "@/lib/hooks/useCreditMeter"
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
import { TOKENS_PER_CREDIT, TIER_LIMITS, type TierType } from "@convex/billing/constants"

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
  unlimited: {
    label: "UNLIMITED",
    description: "Akses tidak terbatas (admin)",
    color: "bg-segment-unlimited",
    textColor: "text-segment-unlimited",
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

// ─────────────────────────────────────────────────
// Regular user view: simplified, credit-only
// ─────────────────────────────────────────────────
function RegularOverviewView({
  tier,
  tierConfig,
}: {
  tier: EffectiveTier
  tierConfig: { label: string; description: string; color: string; textColor: string }
}) {
  const meter = useCreditMeter()

  // Pro plan data for BPP upgrade pitch
  const proPlan = useQuery(
    api.pricingPlans.getPlanBySlug,
    tier === "bpp" ? { slug: "pro" } : "skip"
  )

  // All plans for gratis upgrade section
  const allPlans = useQuery(
    api.pricingPlans.getActivePlans,
    tier === "gratis" ? {} : "skip"
  )
  const { user } = useCurrentUser()
  const creditBalance = useQuery(
    api.billing.credits.getCreditBalance,
    tier === "bpp" && user?._id ? { userId: user._id } : "skip"
  )

  return (
    <>
      {/* Tier + Saldo Card */}
      <div className="rounded-shell border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">
          {/* Left: Tier Info */}
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Tier Saat Ini</p>
            <div className="flex items-center gap-3 mt-2">
              <span
                className={cn(
                  "font-mono text-[10px] font-bold px-2 py-0.5 rounded-badge text-white",
                  tierConfig.color
                )}
              >
                {tierConfig.label}
              </span>
              <span className="font-sans text-sm text-slate-600 dark:text-slate-300">{tierConfig.description}</span>
            </div>

            {(tier === "bpp" || tier === "pro") && (
              <Link
                href="/checkout/bpp?from=overview"
                className="focus-ring font-mono mt-4 inline-flex h-8 items-center gap-1.5 rounded-action border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <CreditCard className="h-4 w-4" />
                Top Up Kredit
              </Link>
            )}
          </div>

          {/* Right: Saldo Kredit */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4 md:border-t-0 md:pt-0 md:border-l md:border-slate-200 md:dark:border-slate-700 md:pl-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Saldo Kredit</p>

            {/* Progress Bar */}
            <div className="relative h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  "absolute left-0 top-0 h-full rounded-full transition-all",
                  meter.level === "depleted" ? "bg-rose-500"
                    : meter.level === "critical" ? "bg-rose-500"
                    : meter.level === "warning" ? "bg-amber-500"
                    : "bg-amber-500"
                )}
                style={{ width: `${Math.min(meter.percentage, 100)}%` }}
              />
            </div>

            {/* Kredit text */}
            <div className="mt-3">
              <span className="font-mono text-xl font-bold text-slate-900 dark:text-slate-100">
                <span className={cn((meter.level === "warning" || meter.level === "critical" || meter.level === "depleted") && "text-rose-600 dark:text-rose-400")}>
                  {meter.used.toLocaleString("id-ID")}
                </span>
                <span className="text-slate-400 dark:text-slate-500"> / </span>
                <span className="text-slate-600 dark:text-slate-300">{meter.total.toLocaleString("id-ID")}</span>
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-2">kredit</span>
            </div>

            {/* Pro: reset note */}
            {tier === "pro" && (
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">Direset setiap bulan</p>
            )}

            {/* Blocked state */}
            {meter.level === "depleted" && (
              <div className="mt-3 space-y-2">
                <p className="font-sans text-xs text-rose-600 dark:text-rose-400">
                  {tier === "gratis"
                    ? "Kredit habis. Upgrade untuk melanjutkan."
                    : "Kredit habis. Top up untuk melanjutkan."}
                </p>
                <Link
                  href={tier === "gratis" ? "/subscription/upgrade" : "/checkout/bpp?from=overview"}
                  className="focus-ring font-mono inline-flex h-8 items-center gap-1.5 rounded-action border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  {tier === "gratis" ? "Upgrade" : "Top Up Kredit"}
                </Link>
              </div>
            )}

            {/* Warning state */}
            {(meter.level === "warning" || meter.level === "critical") && (
              <p className="font-sans text-xs text-amber-600 dark:text-amber-400 mt-2">
                Kredit hampir habis. {tier === "gratis" ? "Pertimbangkan upgrade." : "Pertimbangkan top up."}
              </p>
            )}
          </div>
        </div>

        {/* Pilih Paket — Gratis only, embedded */}
        {tier === "gratis" && allPlans && allPlans.length > 0 && (
          <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700">
            <h2 className="font-sans text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <ArrowUpCircle className="h-4 w-4 text-amber-500" />
              Upgrade Paket
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {allPlans
                .filter((plan) => plan.slug === "bpp" || plan.slug === "pro")
                .map((plan) => {
                  const isBPP = plan.slug === "bpp"
                  const teaserCreditNote = plan.teaserCreditNote || plan.features[0] || ""
                  return (
                    <div
                      key={plan._id}
                      className="flex flex-col rounded-shell border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-5"
                    >
                      <h3 className="font-sans text-lg font-medium text-slate-900 dark:text-slate-100 text-center">
                        {plan.name}
                      </h3>
                      <p className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100 text-center mt-1">
                        {plan.price}
                        {plan.unit && (
                          <span className="font-mono text-sm font-normal text-slate-500 dark:text-slate-400"> {plan.unit}</span>
                        )}
                      </p>
                      <p className="font-sans text-sm text-slate-600 dark:text-slate-300 mt-4 leading-relaxed">
                        {teaserCreditNote}
                      </p>
                      <div className="mt-auto pt-4">
                        <SectionCTA
                          href={isBPP ? "/checkout/bpp?from=overview" : "/checkout/pro?from=overview"}
                          className="w-full justify-center"
                        >
                          {isBPP ? "Top Up Kredit" : "Upgrade ke Pro"}
                        </SectionCTA>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      {/* Pro Upgrade Pitch — BPP only */}
      {tier === "bpp" && proPlan && (
        <div className="rounded-shell border border-slate-200 dark:border-slate-700 border-l-4 border-l-amber-500 bg-white dark:bg-slate-900 p-5">
          <h2 className="font-sans text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Sparks className="h-4 w-4 text-amber-500" />
            Leluasa dengan Paket Pro
          </h2>
          <p className="font-sans text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            Mendapat 5.000 kredit, untuk menyusun 5–6 paper dan diskusi mendalam
            dengan masing-masing paper setara 15 halaman
          </p>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <p className="font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {proPlan.price}
                {proPlan.unit && (
                  <span className="font-mono text-xs font-normal text-slate-500 dark:text-slate-400"> {proPlan.unit}</span>
                )}
              </p>
              {(creditBalance?.remainingCredits ?? 0) > 0 && (
                <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Sisa {creditBalance!.remainingCredits.toLocaleString("id-ID")} kredit BPP tetap tersimpan setelah upgrade.
                </p>
              )}
            </div>
            <SectionCTA href="/checkout/pro?from=overview">
              Upgrade ke Pro
            </SectionCTA>
          </div>
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────
// Admin view: full observability (unchanged from original)
// ─────────────────────────────────────────────────
function AdminOverviewView({
  quotaStatus,
  usageBreakdown,
  creditBalance,
  tier,
  tierConfig,
  resetDate,
  isBPP,
  isUnlimited,
  usedTokens,
  allottedTokens,
  usedKredit,
  totalKredit,
  usagePercentage,
  isLowQuota,
  isBlocked,
  currentCreditBalance,
}: {
  quotaStatus: any
  usageBreakdown: any
  creditBalance: any
  tier: EffectiveTier
  tierConfig: { label: string; description: string; color: string; textColor: string }
  resetDate: string
  isBPP: boolean
  isUnlimited: boolean
  usedTokens: number
  allottedTokens: number
  usedKredit: number
  totalKredit: number
  usagePercentage: number
  isLowQuota: boolean
  isBlocked: boolean
  currentCreditBalance: number
}) {
  return (
    <>
      {/* Top Cards: Tier + Credit - 2 columns 50%/50% */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tier Card */}
        <div className="rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-signal text-[10px] text-muted-foreground">
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
              <p className="text-sm text-muted-foreground mt-2">
                {tierConfig.description}
              </p>
            </div>
            <GraphUp className="h-5 w-5 text-muted-foreground" />
          </div>

          {tier !== "pro" && tier !== "unlimited" && (
            <Link
              href="/subscription/upgrade"
              className="focus-ring text-interface mt-4 inline-flex h-8 items-center gap-1.5 rounded-action border-main border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <ArrowUpCircle className="h-4 w-4" />
              Upgrade ke Pro
            </Link>
          )}
        </div>

        {/* Right Card — tier-aware */}
        <div className="rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90 p-4">
          {isBPP ? (
            <>
              {/* BPP: Credit balance + Top Up */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-signal text-[10px] text-muted-foreground">
                    Saldo Credit
                  </p>
                  <p className="text-interface text-2xl font-semibold mt-1 text-foreground">
                    {currentCreditBalance.toLocaleString("id-ID")} kredit
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ≈ {(currentCreditBalance * 1000).toLocaleString("id-ID")} tokens tersedia
                  </p>
                </div>
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <Link
                href="/subscription/topup?from=overview"
                className="focus-ring text-interface mt-4 inline-flex h-8 items-center gap-1.5 rounded-action border-main border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <CreditCard className="h-4 w-4" />
                Top Up
              </Link>
            </>
          ) : isUnlimited ? (
            <>
              {/* Admin: Unlimited access */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-signal text-[10px] text-muted-foreground">
                    Akses
                  </p>
                  <p className="text-interface text-2xl font-semibold mt-1 text-foreground">
                    Unlimited
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Akses tidak terbatas (admin)
                  </p>
                </div>
                <Sparks className="h-5 w-5 text-amber-500" />
              </div>
            </>
          ) : (
            <>
              {/* Gratis / Pro: Monthly quota info */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-signal text-[10px] text-muted-foreground">
                    Kuota Bulanan
                  </p>
                  <p className="text-interface text-2xl font-semibold mt-1 text-foreground">
                    {totalKredit.toLocaleString("id-ID")} kredit
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Reset: {resetDate}
                  </p>
                </div>
                <GraphUp className="h-5 w-5 text-muted-foreground" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Usage Progress Card (for non-BPP users) */}
      {!isBPP && (
        <div className="rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-interface text-sm font-medium text-foreground">Penggunaan Bulan Ini</h2>
            {!isUnlimited && (
              <span className="text-[10px] font-mono text-muted-foreground">
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
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-destructive">
                    {tier === "pro"
                      ? "Quota bulanan habis. Top up credit untuk melanjutkan."
                      : "Quota bulanan habis. Upgrade ke Pro atau top up credit untuk melanjutkan."}
                  </p>
                  <Link
                    href="/subscription/topup?from=overview"
                    className="focus-ring text-interface inline-flex h-8 items-center gap-1.5 rounded-action border-main border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Top Up Credit
                  </Link>
                </div>
              )}

              {isLowQuota && !isBlocked && (
                <p className="text-xs text-amber-600 mt-2">
                  Quota hampir habis. Pertimbangkan untuk top up credit.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* BPP Credit Detail Card */}
      {isBPP && (
        <div className="rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-interface text-sm font-medium text-foreground">Detail Credit</h2>
            {creditBalance && currentCreditBalance < 100 && (
              <div className="px-3 py-1.5 bg-amber-500/15 text-amber-400 text-xs font-mono rounded-badge border border-amber-500/30">
                Saldo Rendah
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-signal text-[10px] text-muted-foreground">Tersisa</p>
              <p className="font-mono text-lg font-bold text-foreground">
                {currentCreditBalance.toLocaleString("id-ID")}
              </p>
            </div>
            <div>
              <p className="text-signal text-[10px] text-muted-foreground">Terpakai</p>
              <p className="font-mono text-lg font-bold text-muted-foreground">
                {(creditBalance?.usedCredits ?? 0).toLocaleString("id-ID")}
              </p>
            </div>
            <div>
              <p className="text-signal text-[10px] text-muted-foreground">Total Dibeli</p>
              <p className="font-mono text-lg font-bold text-muted-foreground">
                {(creditBalance?.totalCredits ?? 0).toLocaleString("id-ID")}
              </p>
            </div>
          </div>

          {creditBalance?.lastPurchaseAt && (
            <p className="text-[10px] font-mono text-muted-foreground mt-3">
              Pembelian terakhir: {formatDate(creditBalance.lastPurchaseAt)}
              ({creditBalance.lastPurchaseCredits ?? 0} kredit)
            </p>
          )}
        </div>
      )}

      {/* Usage Breakdown Table */}
      <div className="rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90 overflow-hidden">
        <div className="border-b border-border bg-slate-200/45 px-4 py-3 dark:bg-slate-900/50">
          <h2 className="text-interface text-sm font-medium text-foreground">Breakdown Penggunaan</h2>
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
            <table className="text-interface w-full table-fixed border-collapse text-left text-sm">
              <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
                <tr>
                  <th className="text-signal h-12 w-[34%] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
                    Tipe
                  </th>
                  <th className="text-signal h-12 w-[22%] px-4 py-3 text-right text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Kredit
                  </th>
                  <th className="text-signal h-12 w-[22%] px-4 py-3 text-right text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Tokens
                  </th>
                  <th className="text-signal h-12 w-[22%] px-4 py-3 text-right text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Estimasi Biaya
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usageBreakdown.breakdown.map((item: any) => {
                  const IconComponent = ICON_MAP[item.icon as keyof typeof ICON_MAP] || ChatBubble
                  return (
                    <tr key={item.type} className="group transition-colors hover:bg-muted/50">
                      <td className="bg-slate-200/35 px-4 py-3 group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{item.type}</span>
                        </div>
                      </td>
                      <td className="text-right px-4 py-3 tabular-nums text-foreground">
                        {Math.ceil(item.tokens / TOKENS_PER_CREDIT).toLocaleString("id-ID")}
                      </td>
                      <td className="text-right px-4 py-3 tabular-nums text-foreground">
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
                <tr className="bg-slate-200/35 font-semibold dark:bg-slate-900/55">
                  <td className="px-4 py-2 text-foreground">Total</td>
                  <td className="text-right px-4 py-2 tabular-nums text-foreground">
                    {Math.ceil(usageBreakdown.totalTokens / TOKENS_PER_CREDIT).toLocaleString("id-ID")}
                  </td>
                  <td className="text-right px-4 py-2 tabular-nums text-foreground">
                    {usageBreakdown.totalTokens.toLocaleString("id-ID")}
                  </td>
                  <td className="text-right px-4 py-2 tabular-nums text-foreground">
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
      <div className="rounded-shell border-main border border-border bg-card/90 p-4 dark:bg-slate-900/90">
        <h3 className="text-interface text-sm font-medium text-foreground mb-2">Cara Kerja Pembayaran</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-amber-500">1.</span>
            <span>
              <strong>Gratis:</strong> 100 kredit/bulan untuk mencoba fitur dasar
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
    </>
  )
}

// ─────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────
export default function SubscriptionOverviewPage() {
  const { user, isLoading: userLoading } = useCurrentUser()

  // Get quota status
  const quotaStatus = useQuery(
    api.billing.quotas.getQuotaStatus,
    user?._id ? { userId: user._id } : "skip"
  )

  // Get monthly usage breakdown (admin only, but query is harmless for others)
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

  // Admin/superadmin: unlimited access
  const isUnlimited = quotaStatus?.unlimited === true

  // Computed values for admin view
  const isBPP = quotaStatus?.creditBased || tier === "bpp"
  const usedTokens = quotaStatus?.usedTokens ?? 0
  const tierMonthlyTokens = TIER_LIMITS[tier as TierType]?.monthlyTokens ?? 0
  const allottedTokens = quotaStatus?.allottedTokens ?? (isUnlimited ? 0 : tierMonthlyTokens)
  const rawUsagePercentage =
    quotaStatus?.percentageUsed ??
    (allottedTokens > 0 ? (usedTokens / allottedTokens) * 100 : 0)
  const usagePercentage = Number.isFinite(rawUsagePercentage)
    ? Math.max(0, Math.round(rawUsagePercentage))
    : 0
  const isLowQuota = quotaStatus?.warningLevel === "warning" || quotaStatus?.warningLevel === "critical"
  const isBlocked = quotaStatus?.warningLevel === "blocked"
  const resetDate = quotaStatus?.periodEnd ? formatDate(quotaStatus.periodEnd) : "-"
  const currentCreditBalance = creditBalance?.remainingCredits ?? 0
  const usedKredit = Math.ceil(usedTokens / TOKENS_PER_CREDIT)
  const totalKredit = Math.floor(allottedTokens / TOKENS_PER_CREDIT)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-sans text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Sparks className="h-5 w-5 text-amber-500" />
          Subskripsi
        </h1>
        <p className="font-sans text-sm text-slate-600 dark:text-slate-300 mt-1">
          Kelola langganan dan pantau penggunaan
        </p>
      </div>

      {isUnlimited ? (
        <AdminOverviewView
          quotaStatus={quotaStatus}
          usageBreakdown={usageBreakdown}
          creditBalance={creditBalance}
          tier={tier}
          tierConfig={tierConfig}
          resetDate={resetDate}
          isBPP={isBPP}
          isUnlimited={isUnlimited}
          usedTokens={usedTokens}
          allottedTokens={allottedTokens}
          usedKredit={usedKredit}
          totalKredit={totalKredit}
          usagePercentage={usagePercentage}
          isLowQuota={isLowQuota}
          isBlocked={isBlocked}
          currentCreditBalance={currentCreditBalance}
        />
      ) : (
        <RegularOverviewView
          tier={tier}
          tierConfig={tierConfig}
        />
      )}
    </div>
  )
}
