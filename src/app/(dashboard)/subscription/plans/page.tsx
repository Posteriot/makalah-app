"use client"

import { useState, useCallback, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { Id } from "@convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import Link from "next/link"
import Image from "next/image"
import { QRCodeSVG } from "qrcode.react"
import {
  CreditCard,
  NavArrowDown,
  NavArrowUp,
  Sparks,
  QrCode,
  Building,
  Wallet,
  CheckCircle,
  RefreshDouble,
  Copy,
  OpenNewWindow,
  Clock,
  WarningCircle,
  ArrowRight,
  Refresh,
} from "iconoir-react"
import { cn } from "@/lib/utils"
import { getEffectiveTier } from "@/lib/utils/subscription"
import { SUBSCRIPTION_PRICING } from "@convex/billing/constants"
import { toast } from "sonner"
import { SectionCTA } from "@/components/ui/section-cta"

type ProPlanType = keyof typeof SUBSCRIPTION_PRICING

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

interface PaymentResult {
  paymentId: string
  convexPaymentId: string
  xenditId: string
  status: string
  amount: number
  expiresAt: number
  // Package info
  packageType?: string
  credits?: number
  packageLabel?: string
  // QRIS
  qrString?: string
  qrCodeUrl?: string
  // VA
  vaNumber?: string
  vaChannel?: string
  // E-Wallet
  redirectUrl?: string
}

type PaymentMethod = "qris" | "va" | "ewallet"

// ════════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════════

const PAYMENT_METHODS = [
  { id: "qris" as const, label: "QRIS", icon: QrCode, description: "Scan dengan e-wallet" },
  { id: "va" as const, label: "Virtual Account", icon: Building, description: "Transfer bank" },
  { id: "ewallet" as const, label: "E-Wallet", icon: Wallet, description: "OVO, GoPay" },
]

const VA_CHANNELS = [
  { code: "BCA_VIRTUAL_ACCOUNT", label: "BCA" },
  { code: "BNI_VIRTUAL_ACCOUNT", label: "BNI" },
  { code: "BRI_VIRTUAL_ACCOUNT", label: "BRI" },
  { code: "MANDIRI_VIRTUAL_ACCOUNT", label: "Mandiri" },
]

const EWALLET_CHANNELS = [
  { code: "OVO", label: "OVO" },
  { code: "GOPAY", label: "GoPay" },
]

// ════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════

export default function PlansHubPage() {
  const { user, isLoading: userLoading } = useCurrentUser()

  // Fetch plans from database
  const plans = useQuery(api.pricingPlans.getActivePlans)

  // Get current credit balance
  const creditBalance = useQuery(
    api.billing.credits.getCreditBalance,
    user?._id ? { userId: user._id } : "skip"
  )

  // Pro card state (isolated from BPP)
  const [isProExpanded, setIsProExpanded] = useState(false)
  const [selectedProPlan, setSelectedProPlan] = useState<ProPlanType>("pro_monthly")
  const [proPaymentResult, setProPaymentResult] = useState<PaymentResult | null>(null)
  const [isProProcessing, setIsProProcessing] = useState(false)
  const [proError, setProError] = useState<string | null>(null)
  const [proSelectedMethod, setProSelectedMethod] = useState<PaymentMethod>("qris")
  const [proSelectedVAChannel, setProSelectedVAChannel] = useState(VA_CHANNELS[0].code)
  const [proSelectedEWalletChannel, setProSelectedEWalletChannel] = useState(EWALLET_CHANNELS[0].code)
  const [proMobileNumber, setProMobileNumber] = useState("")

  // Real-time payment status subscription (Pro)
  const proPaymentStatus = useQuery(
    api.billing.payments.watchPaymentStatus,
    proPaymentResult?.convexPaymentId
      ? { paymentId: proPaymentResult.convexPaymentId as Id<"payments"> }
      : "skip"
  )

  // Handle Pro payment success via real-time subscription
  const handleProPaymentStatusChange = useCallback(() => {
    if (proPaymentStatus?.status === "SUCCEEDED" && proPaymentResult) {
      toast.success("Pembayaran berhasil! Langganan Pro telah aktif.")
      setTimeout(() => {
        setProPaymentResult(null)
        setIsProExpanded(false)
      }, 3000)
    }
  }, [proPaymentStatus?.status, proPaymentResult])

  useEffect(() => {
    handleProPaymentStatusChange()
  }, [handleProPaymentStatusChange])

  const handleProSubscribe = useCallback(async () => {
    if (isProProcessing) return

    if (proSelectedMethod === "ewallet" && proSelectedEWalletChannel === "OVO") {
      if (!proMobileNumber.trim()) {
        setProError("Nomor HP wajib diisi untuk pembayaran OVO")
        toast.error("Nomor HP wajib diisi untuk pembayaran OVO")
        return
      }
    }

    setIsProProcessing(true)
    setProError(null)

    try {
      const response = await fetch("/api/payments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: selectedProPlan,
          paymentMethod: proSelectedMethod,
          vaChannel: proSelectedMethod === "va" ? proSelectedVAChannel : undefined,
          ewalletChannel: proSelectedMethod === "ewallet" ? proSelectedEWalletChannel : undefined,
          mobileNumber: proSelectedMethod === "ewallet" && proSelectedEWalletChannel === "OVO" ? proMobileNumber : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Gagal membuat pembayaran")
      }

      setProPaymentResult(data)

      if (proSelectedMethod === "ewallet" && data.redirectUrl) {
        window.open(data.redirectUrl, "_blank")
      }
    } catch (err) {
      console.error("[PlansHub] Pro subscription error:", err)
      setProError(err instanceof Error ? err.message : "Terjadi kesalahan")
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsProProcessing(false)
    }
  }, [isProProcessing, selectedProPlan, proSelectedMethod, proSelectedVAChannel, proSelectedEWalletChannel, proMobileNumber])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Berhasil disalin!")
  }, [])

  const resetProPayment = useCallback(() => {
    setProPaymentResult(null)
    setProError(null)
  }, [])

  // Loading state
  if (userLoading || plans === undefined) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-64 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-2">
        <h1 className="text-interface text-xl font-semibold">Pilih Paket</h1>
        <p className="text-sm text-muted-foreground">
          Sesi tidak aktif. Silakan login ulang.
        </p>
      </div>
    )
  }

  const currentTier = getEffectiveTier(user.role, user.subscriptionStatus)
  const currentCredits = creditBalance?.remainingCredits ?? 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-interface text-xl font-semibold flex items-center gap-2">
          <Sparks className="h-5 w-5 text-primary" />
          Pilih Paket
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pilih paket yang sesuai dengan kebutuhan Anda
        </p>
      </div>

      {/* Plans Grid - Responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrentTier = plan.slug === currentTier
          const planView = { ...plan, isHighlighted: isCurrentTier }
          const isBPP = plan.slug === "bpp"
          const isPro = plan.slug === "pro"
          const teaserCreditNote = plan.teaserCreditNote || plan.features[0] || ""

          return (
            <div key={plan._id} className="group/card relative h-full">
              {planView.isHighlighted && (
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
                  planView.isHighlighted && "border-2 border-[color:var(--emerald-500)]"
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

                {/* CTA Section */}
                {/* Gratis Plan */}
                {plan.slug === "gratis" && !isCurrentTier && currentTier !== "unlimited" && (
                  <SectionCTA
                    href="/chat"
                    className="mt-auto flex w-full justify-center py-2.5"
                  >
                    {plan.ctaText}
                  </SectionCTA>
                )}

                {/* BPP Plan - Direct to topup */}
                {isBPP && (
                  <SectionCTA
                    href="/subscription/topup?from=plans"
                    className="mt-auto flex w-full justify-center py-2.5"
                  >
                    {isCurrentTier ? "Beli Kredit" : plan.ctaText}
                  </SectionCTA>
                )}

                {/* Pro Plan - Expandable Checkout (hidden for unlimited/admin) */}
                {isPro && !isCurrentTier && currentTier !== "unlimited" && (
                  <>
                    <button
                      onClick={() => setIsProExpanded(!isProExpanded)}
                      className={cn(
                        "focus-ring mt-auto flex w-full items-center justify-center gap-2 rounded-action py-2.5 font-medium transition-colors",
                        "bg-slate-900 text-slate-100 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                      )}
                    >
                      {plan.ctaText}
                      {isProExpanded ? (
                        <NavArrowUp className="h-4 w-4" />
                      ) : (
                        <NavArrowDown className="h-4 w-4" />
                      )}
                    </button>

                    {/* Expanded Pro Checkout */}
                    {isProExpanded && (
                      <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                          {/* Payment Result State */}
                          {proPaymentResult && (
                            <PaymentResultSection
                              variant="pro"
                              paymentResult={proPaymentResult}
                              paymentStatus={proPaymentStatus}
                              selectedMethod={proSelectedMethod}
                              selectedEWalletChannel={proSelectedEWalletChannel}
                              onReset={resetProPayment}
                              onCopy={copyToClipboard}
                              currentCredits={currentCredits}
                            />
                          )}

                          {/* Normal Checkout Flow */}
                          {!proPaymentResult && (
                            <>
                              {/* Error Banner */}
                              {proError && (
                                <div className="bg-destructive/10 border border-destructive/30 rounded-action p-3 flex items-start gap-2">
                                  <WarningCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                  <p className="text-sm text-destructive">{proError}</p>
                                </div>
                              )}

                              {/* Plan Selection */}
                              <div>
                                <p className="text-sm font-medium mb-2">Pilih Paket Langganan</p>
                                <div className="grid grid-cols-1 gap-2">
                                  {(Object.entries(SUBSCRIPTION_PRICING) as [ProPlanType, (typeof SUBSCRIPTION_PRICING)[ProPlanType]][]).map(([type, pricing]) => (
                                    <button
                                      key={type}
                                      onClick={() => setSelectedProPlan(type)}
                                      disabled={isProProcessing}
                                      className={cn(
                                        "relative p-3 border rounded-action text-left transition-colors",
                                        selectedProPlan === type
                                          ? "border-primary bg-primary/5"
                                          : "border-border hover:border-primary/50",
                                        isProProcessing && "opacity-50 cursor-not-allowed"
                                      )}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold">{pricing.label}</span>
                                        <span className="text-sm font-medium">
                                          Rp {pricing.priceIDR.toLocaleString("id-ID")}
                                        </span>
                                      </div>
                                      {type === "pro_yearly" && (
                                        <p className="text-xs text-primary mt-1">Hemat 2 bulan</p>
                                      )}
                                      {selectedProPlan === type && (
                                        <CheckCircle className="absolute top-3 right-3 h-4 w-4 text-primary" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Payment Method */}
                              <div>
                                <p className="text-sm font-medium mb-2">Metode Pembayaran</p>
                                <div className="space-y-2">
                                  {PAYMENT_METHODS.map((method) => {
                                    const Icon = method.icon
                                    const isSelected = proSelectedMethod === method.id
                                    return (
                                      <button
                                        key={method.id}
                                        onClick={() => setProSelectedMethod(method.id)}
                                        disabled={isProProcessing}
                                        className={cn(
                                          "w-full flex items-center gap-2 p-2 border rounded-action text-left transition-colors",
                                          isSelected
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/50",
                                          isProProcessing && "opacity-50 cursor-not-allowed"
                                        )}
                                      >
                                        <Icon className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                                        <div className="flex-1">
                                          <p className="text-sm font-medium">{method.label}</p>
                                        </div>
                                        {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                                      </button>
                                    )
                                  })}
                                </div>

                                {/* VA Channel Selection */}
                                {proSelectedMethod === "va" && (
                                  <div className="mt-3 grid grid-cols-2 gap-2">
                                    {VA_CHANNELS.map((channel) => (
                                      <button
                                        key={channel.code}
                                        onClick={() => setProSelectedVAChannel(channel.code)}
                                        disabled={isProProcessing}
                                        className={cn(
                                          "p-2 border rounded-action text-center text-sm transition-colors",
                                          proSelectedVAChannel === channel.code
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/50"
                                        )}
                                      >
                                        {channel.label}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {/* E-Wallet Selection */}
                                {proSelectedMethod === "ewallet" && (
                                  <div className="mt-3 space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                      {EWALLET_CHANNELS.map((channel) => (
                                        <button
                                          key={channel.code}
                                          onClick={() => setProSelectedEWalletChannel(channel.code)}
                                          disabled={isProProcessing}
                                          className={cn(
                                            "p-2 border rounded-action text-center text-sm transition-colors",
                                            proSelectedEWalletChannel === channel.code
                                              ? "border-primary bg-primary/5"
                                              : "border-border hover:border-primary/50"
                                          )}
                                        >
                                          {channel.label}
                                        </button>
                                      ))}
                                    </div>
                                    {proSelectedEWalletChannel === "OVO" && (
                                      <input
                                        type="tel"
                                        value={proMobileNumber}
                                        onChange={(e) => setProMobileNumber(e.target.value)}
                                        placeholder="08123456789"
                                        disabled={isProProcessing}
                                        className="w-full p-2 border border-border rounded-action bg-background text-sm"
                                      />
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Pay Button */}
                              <button
                                onClick={handleProSubscribe}
                                disabled={isProProcessing}
                                className={cn(
                                  "focus-ring w-full py-2.5 rounded-action font-medium transition-colors flex items-center justify-center gap-2",
                                  "bg-primary text-primary-foreground hover:bg-primary/90",
                                  "disabled:opacity-50 disabled:cursor-not-allowed"
                                )}
                              >
                                {isProProcessing ? (
                                  <>
                                    <RefreshDouble className="h-4 w-4 animate-spin" />
                                    Memproses...
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="h-4 w-4" />
                                    Bayar {SUBSCRIPTION_PRICING[selectedProPlan].label}
                                  </>
                                )}
                              </button>
                            </>
                          )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Info Section */}
      <div className="rounded-shell border-main border border-border bg-card/90 p-4 dark:bg-slate-900/90">
        <h3 className="text-interface font-medium mb-2">Cara Kerja Pembayaran</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-primary">1.</span>
            <span><strong>Gratis:</strong> 100K tokens/bulan untuk mencoba fitur dasar</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">2.</span>
            <span><strong>Bayar Per Paper:</strong> Top up credit mulai Rp 25.000, bayar sesuai pemakaian</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">3.</span>
            <span><strong>Pro:</strong> Rp 200.000/bulan untuk menyusun 5-6 paper</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// Payment Result Component
// ════════════════════════════════════════════════════════════════

interface PaymentResultSectionProps {
  variant?: "bpp" | "pro"
  paymentResult: PaymentResult
  paymentStatus: { status: string; amount: number; paidAt?: number } | null | undefined
  selectedMethod: PaymentMethod
  selectedEWalletChannel: string
  onReset: () => void
  onCopy: (text: string) => void
  currentCredits: number
}

// Helper function to format countdown as MM:SS
function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function PaymentResultSection({
  variant = "bpp",
  paymentResult,
  paymentStatus,
  selectedMethod,
  selectedEWalletChannel,
  onReset,
  onCopy,
  currentCredits,
}: PaymentResultSectionProps) {
  const status = paymentStatus?.status || paymentResult.status
  const purchasedCredits = paymentResult.credits ?? 0

  // Countdown timer state
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const now = Date.now()
    const remaining = Math.max(0, Math.floor((paymentResult.expiresAt - now) / 1000))
    return remaining
  })
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [statusCheckResult, setStatusCheckResult] = useState<'pending' | null>(null)

  // Derived state
  const isExpired = remainingSeconds <= 0

  // Countdown effect
  useEffect(() => {
    if (remainingSeconds <= 0) return

    const timer = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, Math.floor((paymentResult.expiresAt - now) / 1000))
      setRemainingSeconds(remaining)

      if (remaining <= 0) {
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [paymentResult.expiresAt, remainingSeconds])

  // Handle check status when expired
  const handleCheckStatus = async () => {
    setIsCheckingStatus(true)
    try {
      // Add small delay for UX feedback ("sedang mengecek...")
      await new Promise(resolve => setTimeout(resolve, 800))

      // Check current subscription value (realtime updated)
      if (paymentStatus?.status === 'SUCCEEDED') {
        // Success handled by existing flow - UI will auto-update
        return
      }
      // Still pending after expiry
      setStatusCheckResult('pending')
    } finally {
      setIsCheckingStatus(false)
    }
  }

  // Success State
  if (status === "SUCCEEDED") {
    return (
      <div className="text-center space-y-3 py-4">
        <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-green-700 dark:text-green-400">Pembayaran Berhasil!</p>
          {variant === "pro" ? (
            <p className="text-sm text-muted-foreground mt-1">
              Langganan Pro Anda telah aktif. Nikmati semua fitur premium!
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              +{purchasedCredits} kredit → Total: <strong>{currentCredits + purchasedCredits} kredit</strong>
            </p>
          )}
        </div>
        <Link
          href="/chat"
          className="focus-ring inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-action text-sm font-medium hover:bg-primary/90"
        >
          {variant === "pro" ? "Mulai Menggunakan Pro" : "Mulai Menyusun Paper"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  // Failed/Expired State
  if (status === "FAILED" || status === "EXPIRED") {
    return (
      <div className="text-center space-y-3 py-4">
        <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
          <WarningCircle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <p className="font-semibold text-destructive">
            {status === "FAILED" ? "Pembayaran Gagal" : "Pembayaran Kadaluarsa"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {status === "FAILED"
              ? "Transaksi tidak dapat diproses. Silakan coba lagi."
              : "Waktu pembayaran telah habis. Silakan buat transaksi baru."}
          </p>
        </div>
        <button
          onClick={onReset}
          className="focus-ring inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-action text-sm font-medium hover:bg-primary/90"
        >
          <Refresh className="h-4 w-4" />
          Coba Lagi
        </button>
      </div>
    )
  }

  // Pending State - Show QR/VA/E-Wallet
  // State 3 (post-check pending) replaces entire section
  if (statusCheckResult === 'pending') {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
          <WarningCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold">Pembayaran Tidak Ditemukan</p>
          <p className="text-sm text-muted-foreground mt-1">
            Silakan buat transaksi baru untuk melanjutkan.
          </p>
        </div>
        <button
          onClick={onReset}
          className="focus-ring inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-action text-sm font-medium hover:bg-primary/90"
        >
          Buat Pembayaran Baru
        </button>
      </div>
    )
  }

  return (
    <div className="text-center space-y-3">
      {/* Status */}
      <div className="flex items-center justify-center gap-2 text-amber-600">
        <Clock className="h-4 w-4" />
        <span className="text-sm font-medium">Menunggu Pembayaran</span>
      </div>

      {/* Amount */}
      <p className="text-xl font-bold">Rp {paymentResult.amount.toLocaleString("id-ID")}</p>

      {/* QR Code */}
      {selectedMethod === "qris" && (paymentResult.qrCodeUrl || paymentResult.qrString) && (
        <div className="bg-white p-3 rounded-action inline-block">
          {paymentResult.qrCodeUrl ? (
            <Image src={paymentResult.qrCodeUrl} alt="QRIS" width={180} height={180} />
          ) : paymentResult.qrString ? (
            <QRCodeSVG value={paymentResult.qrString} size={180} level="M" />
          ) : null}
        </div>
      )}

      {/* VA Number */}
      {selectedMethod === "va" && paymentResult.vaNumber && (
        <div className="bg-muted/50 p-3 rounded-action">
          <p className="text-xs text-muted-foreground mb-1">Bank {paymentResult.vaChannel}</p>
          <div className="flex items-center justify-center gap-2">
            <p className="text-lg font-mono font-bold">{paymentResult.vaNumber}</p>
            <button onClick={() => onCopy(paymentResult.vaNumber!)} className="focus-ring p-1 hover:bg-muted rounded-action">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* E-Wallet */}
      {selectedMethod === "ewallet" && (
        <div className={cn(
          "p-3 rounded-action",
          selectedEWalletChannel === "OVO" ? "bg-purple-50 dark:bg-purple-950/30" : "bg-green-50 dark:bg-green-950/30"
        )}>
          <div className="flex items-center justify-center gap-2">
            <Wallet className={cn("h-5 w-5", selectedEWalletChannel === "OVO" ? "text-purple-600" : "text-green-600")} />
            <p className="font-semibold">{selectedEWalletChannel}</p>
          </div>
          <p className="text-sm mt-1">
            {selectedEWalletChannel === "OVO"
              ? "Notifikasi dikirim ke aplikasi OVO"
              : "Buka aplikasi GoPay untuk menyelesaikan pembayaran"}
          </p>
          {paymentResult.redirectUrl && (
            <a
              href={paymentResult.redirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
            >
              Buka {selectedEWalletChannel}
              <OpenNewWindow className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {/* Expiry & Countdown */}
      {isExpired ? (
        // State 2: Expired, show check button
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-yellow-500">
            <WarningCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Waktu pembayaran habis</span>
          </div>
          <button
            onClick={handleCheckStatus}
            disabled={isCheckingStatus}
            className="focus-ring inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-action text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {isCheckingStatus && <RefreshDouble className="h-4 w-4 animate-spin" />}
            Cek Status Pembayaran
          </button>
          <button onClick={onReset} className="block mx-auto text-sm text-muted-foreground hover:text-foreground">
            Batalkan & Pilih Ulang
          </button>
        </div>
      ) : (
        // State 1: Countdown active
        <>
          <p className="text-xs text-muted-foreground">
            Berlaku sampai: {new Date(paymentResult.expiresAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })} (sisa {formatCountdown(remainingSeconds)})
          </p>
          {/* Reset */}
          <button onClick={onReset} className="text-sm text-muted-foreground hover:text-foreground">
            Batalkan & Pilih Ulang
          </button>
        </>
      )}
    </div>
  )
}
