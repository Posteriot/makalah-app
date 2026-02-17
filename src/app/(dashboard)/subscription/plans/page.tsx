"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import Link from "next/link"
import { CheckCircle, ShoppingBagArrowUp } from "iconoir-react"
import { cn } from "@/lib/utils"
import { getEffectiveTier } from "@/lib/utils/subscription"

const PRO_CHECKOUT_ROUTE = "/checkout/pro?from=plans"
const TOPUP_ROUTE = "/subscription/topup?from=plans"

export default function PlansHubPage() {
  const { user, isLoading: userLoading } = useCurrentUser()

  const plans = useQuery(api.pricingPlans.getActivePlans)
  const creditBalance = useQuery(
    api.billing.credits.getCreditBalance,
    user?._id ? { userId: user._id } : "skip"
  )
  const subscriptionStatus = useQuery(
    api.billing.subscriptions.checkSubscriptionStatus,
    user?._id ? { userId: user._id } : "skip"
  )

  const [isCanceling, setIsCanceling] = useState(false)
  const [isReactivating, setIsReactivating] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const cancelSubscription = useMutation(api.billing.subscriptions.cancelSubscription)
  const reactivateSubscription = useMutation(api.billing.subscriptions.reactivateSubscription)

  const handleCancelSubscription = useCallback(async () => {
    if (!user?._id || isCanceling) return
    setIsCanceling(true)
    try {
      await cancelSubscription({
        userId: user._id,
        cancelAtPeriodEnd: true,
      })
      setShowCancelConfirm(false)
    } finally {
      setIsCanceling(false)
    }
  }, [user?._id, isCanceling, cancelSubscription])

  const handleReactivate = useCallback(async () => {
    if (!subscriptionStatus?.subscriptionId || isReactivating) return
    setIsReactivating(true)
    try {
      await reactivateSubscription({
        subscriptionId: subscriptionStatus.subscriptionId,
      })
    } finally {
      setIsReactivating(false)
    }
  }, [subscriptionStatus?.subscriptionId, isReactivating, reactivateSubscription])

  if (userLoading || plans === undefined) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-muted" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-64 rounded bg-muted" />
            <div className="h-64 rounded bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-2">
        <h1 className="text-interface text-xl font-semibold">Pilih Paket</h1>
        <p className="text-sm text-muted-foreground">Sesi tidak aktif. Silakan login ulang.</p>
      </div>
    )
  }

  const currentTier = getEffectiveTier(user.role, user.subscriptionStatus)

  const router = useRouter()
  useEffect(() => {
    if (currentTier === "bpp") {
      router.replace("/subscription/overview")
    }
  }, [currentTier, router])

  if (currentTier === "bpp") {
    return null
  }

  const currentCredits = creditBalance?.remainingCredits ?? 0
  const pageTitle = currentTier === "bpp" ? "Leluasa dengan Paket Pro" : "Pilih Paket"

  const visiblePlanSlugs = currentTier === "gratis" ? new Set(["bpp", "pro"]) : new Set(["pro"])
  const visiblePlans = plans.filter((plan) => visiblePlanSlugs.has(plan.slug))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-interface flex items-center gap-2 text-xl font-semibold">
          <ShoppingBagArrowUp className="h-5 w-5 text-primary" />
          {pageTitle}
        </h1>
      </div>

      <div
        className={cn(
          "grid gap-4",
          visiblePlans.length > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
        )}
      >
        {visiblePlans.map((plan) => {
          const isCurrentTier = plan.slug === currentTier
          const isPro = plan.slug === "pro"
          const isBPP = plan.slug === "bpp"
          const teaserCreditNote = plan.teaserCreditNote || plan.features[0] || ""

          const showProCancel = isPro && currentTier === "pro" && !!subscriptionStatus?.hasSubscription
          const showProCheckout = isPro && currentTier !== "pro" && currentTier !== "unlimited"

          return (
            <div key={plan._id} className="group/card relative h-full">
              {isCurrentTier && (
                <div
                  className={cn(
                    "absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1",
                    "bg-[color:var(--emerald-500)] text-[color:var(--slate-50)]",
                    "text-[11px] font-semibold uppercase tracking-wide",
                    "transition-transform duration-300 group-hover/card:-translate-y-1"
                  )}
                >
                  Saat ini
                </div>
              )}

              <div
                className={cn(
                  "relative flex h-full min-h-[240px] flex-col overflow-hidden rounded-shell p-comfort transition-all duration-300 md:min-h-[280px] md:p-airy",
                  "border border-[color:var(--slate-400)] bg-card/90 dark:bg-slate-900/90",
                  "group-hover/card:-translate-y-1 group-hover/card:bg-[color:var(--slate-200)] dark:group-hover/card:bg-[color:var(--slate-700)]",
                  isCurrentTier && "border-2 border-[color:var(--emerald-500)]"
                )}
              >
                <h3 className="text-narrative mt-4 text-center text-xl font-light text-foreground md:mt-0 md:text-2xl">
                  {plan.name}
                </h3>
                <p className="text-interface mb-6 text-center text-3xl font-medium tracking-tight tabular-nums text-foreground">
                  {plan.price}
                  {plan.unit && (
                    <span className="text-interface ml-1 text-sm font-normal text-muted-foreground">
                      {plan.unit}
                    </span>
                  )}
                </p>
                <p className="text-interface mb-6 mt-4 text-sm leading-relaxed text-foreground md:text-base">
                  {teaserCreditNote}
                </p>

                {isBPP && (
                  <Link
                    href={TOPUP_ROUTE}
                    className="focus-ring mt-auto flex w-full items-center justify-center gap-2 rounded-action py-2.5 font-medium transition-colors bg-slate-900 text-slate-100 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    Top Up Kredit
                  </Link>
                )}

                {isPro && !isCurrentTier && currentTier === "bpp" && currentCredits > 0 && (
                  <p className="mb-2 mt-2 px-1 text-xs text-muted-foreground">
                    Sisa {currentCredits} kredit BPP Anda tetap tersimpan setelah upgrade.
                  </p>
                )}

                {showProCheckout && (
                  <Link
                    href={PRO_CHECKOUT_ROUTE}
                    className="focus-ring mt-auto flex w-full items-center justify-center gap-2 rounded-action py-2.5 font-medium transition-colors bg-slate-900 text-slate-100 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    Lanjut ke Checkout Pro
                  </Link>
                )}

                {showProCancel && (
                  <ActiveSubscriptionView
                    subscriptionStatus={subscriptionStatus}
                    showCancelConfirm={showCancelConfirm}
                    setShowCancelConfirm={setShowCancelConfirm}
                    isCanceling={isCanceling}
                    isReactivating={isReactivating}
                    onCancel={handleCancelSubscription}
                    onReactivate={handleReactivate}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}

function ActiveSubscriptionView({
  subscriptionStatus,
  showCancelConfirm,
  setShowCancelConfirm,
  isCanceling,
  isReactivating,
  onCancel,
  onReactivate,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscriptionStatus: any
  showCancelConfirm: boolean
  setShowCancelConfirm: (v: boolean) => void
  isCanceling: boolean
  isReactivating: boolean
  onCancel: () => void
  onReactivate: () => void
}) {
  const daysRemaining = subscriptionStatus?.daysRemaining ?? 0
  const isPendingCancel = subscriptionStatus?.isPendingCancel
  const periodEnd = subscriptionStatus?.currentPeriodEnd
    ? new Date(subscriptionStatus.currentPeriodEnd).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    : "-"

  return (
    <div className="mt-auto space-y-3">
      <div
        className={cn(
          "flex items-center justify-center gap-2 rounded-action py-2 text-sm font-medium",
          isPendingCancel
            ? "border border-amber-500/30 bg-amber-500/10 text-amber-600"
            : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
        )}
      >
        <CheckCircle className="h-4 w-4" />
        {isPendingCancel ? "Akan berakhir" : "Aktif"}
      </div>

      <div className="space-y-0.5 text-center text-xs text-muted-foreground">
        <p>
          Berlaku sampai: <span className="font-mono font-medium text-foreground">{periodEnd}</span>
        </p>
        <p>{daysRemaining} hari tersisa</p>
      </div>

      {isPendingCancel ? (
        <button
          onClick={onReactivate}
          disabled={isReactivating}
          className="focus-ring w-full rounded-action bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isReactivating ? "Memproses..." : "Aktifkan Kembali"}
        </button>
      ) : showCancelConfirm ? (
        <div className="space-y-2 rounded-action border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-xs text-muted-foreground">
            Pro tetap aktif sampai {periodEnd}. Setelah itu akun kembali ke BPP/Gratis.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={isCanceling}
              className="flex-1 rounded-action bg-destructive py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {isCanceling ? "Membatalkan..." : "Ya, Batalkan"}
            </button>
            <button
              onClick={() => setShowCancelConfirm(false)}
              className="flex-1 rounded-action border border-border py-1.5 text-xs font-medium hover:bg-muted"
            >
              Tidak
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCancelConfirm(true)}
          className="w-full rounded-action py-2 text-xs text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive"
        >
          Batalkan Langganan
        </button>
      )}
    </div>
  )
}
