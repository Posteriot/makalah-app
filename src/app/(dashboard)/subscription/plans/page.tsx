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
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  QrCode,
  Building2,
  Wallet,
  CheckCircle2,
  Loader2,
  Copy,
  ExternalLink,
  Clock,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

interface TopupOption {
  amount: number
  tokens: number
  label: string
  popular?: boolean
}

interface PaymentResult {
  paymentId: string
  convexPaymentId: string
  xenditId: string
  status: string
  amount: number
  expiresAt: number
  qrString?: string
  qrCodeUrl?: string
  vaNumber?: string
  vaChannel?: string
  redirectUrl?: string
}

type PaymentMethod = "qris" | "va" | "ewallet"

// ════════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════════

const PAYMENT_METHODS = [
  { id: "qris" as const, label: "QRIS", icon: QrCode, description: "Scan dengan e-wallet" },
  { id: "va" as const, label: "Virtual Account", icon: Building2, description: "Transfer bank" },
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

const TIER_BADGES = {
  gratis: { label: "GRATIS", color: "bg-segment-gratis" },
  free: { label: "GRATIS", color: "bg-segment-gratis" },
  bpp: { label: "BPP", color: "bg-segment-bpp" },
  pro: { label: "PRO", color: "bg-segment-pro" },
}

// ════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════

export default function PlansHubPage() {
  const { user, isLoading: userLoading } = useCurrentUser()

  // Fetch plans from database
  const plans = useQuery(api.pricingPlans.getActivePlans)

  // Fetch topup options for BPP
  const topupOptionsResult = useQuery(api.pricingPlans.getTopupOptionsForPlan, { slug: "bpp" })

  // Get current credit balance
  const creditBalance = useQuery(
    api.billing.credits.getCreditBalance,
    user?._id ? { userId: user._id } : "skip"
  )

  // BPP card expansion state
  const [isExpanded, setIsExpanded] = useState(false)

  // Payment state
  const [selectedAmount, setSelectedAmount] = useState<TopupOption | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("qris")
  const [selectedVAChannel, setSelectedVAChannel] = useState(VA_CHANNELS[0].code)
  const [selectedEWalletChannel, setSelectedEWalletChannel] = useState(EWALLET_CHANNELS[0].code)
  const [mobileNumber, setMobileNumber] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Real-time payment status subscription
  const paymentStatus = useQuery(
    api.billing.payments.watchPaymentStatus,
    paymentResult?.convexPaymentId
      ? { paymentId: paymentResult.convexPaymentId as Id<"payments"> }
      : "skip"
  )

  // Set default selected amount when topupOptions load
  // Using flushSync alternative: derive initial state from props
  const derivedSelectedAmount = selectedAmount ?? (
    topupOptionsResult?.topupOptions
      ? (topupOptionsResult.topupOptions.find((o) => o.popular) || topupOptionsResult.topupOptions[0])
      : null
  )

  // Handle payment success via real-time subscription
  const handlePaymentStatusChange = useCallback(() => {
    if (paymentStatus?.status === "SUCCEEDED" && paymentResult) {
      toast.success("Pembayaran berhasil! Saldo telah ditambahkan.")
      // Auto-collapse after delay
      setTimeout(() => {
        setPaymentResult(null)
        setIsExpanded(false)
      }, 3000)
    }
  }, [paymentStatus?.status, paymentResult])

  // Trigger status change handler
  useEffect(() => {
    handlePaymentStatusChange()
  }, [handlePaymentStatusChange])

  const handleTopUp = useCallback(async () => {
    if (isProcessing || !derivedSelectedAmount) return

    // Validate mobile number for OVO
    if (selectedMethod === "ewallet" && selectedEWalletChannel === "OVO") {
      if (!mobileNumber.trim()) {
        setError("Nomor HP wajib diisi untuk pembayaran OVO")
        toast.error("Nomor HP wajib diisi untuk pembayaran OVO")
        return
      }
    }

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch("/api/payments/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: derivedSelectedAmount.amount,
          paymentMethod: selectedMethod,
          vaChannel: selectedMethod === "va" ? selectedVAChannel : undefined,
          ewalletChannel: selectedMethod === "ewallet" ? selectedEWalletChannel : undefined,
          mobileNumber: selectedMethod === "ewallet" && selectedEWalletChannel === "OVO" ? mobileNumber : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Gagal membuat pembayaran")
      }

      setPaymentResult(data)

      // If e-wallet with redirect, open in new tab
      if (selectedMethod === "ewallet" && data.redirectUrl) {
        window.open(data.redirectUrl, "_blank")
      }
    } catch (err) {
      console.error("[PlansHub] Payment error:", err)
      setError(err instanceof Error ? err.message : "Terjadi kesalahan")
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, derivedSelectedAmount, selectedMethod, selectedVAChannel, selectedEWalletChannel, mobileNumber])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Berhasil disalin!")
  }, [])

  const resetPayment = useCallback(() => {
    setPaymentResult(null)
    setError(null)
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
        <h1 className="text-xl font-semibold">Pilih Paket</h1>
        <p className="text-sm text-muted-foreground">
          Sesi tidak aktif. Silakan login ulang.
        </p>
      </div>
    )
  }

  const currentTier = (user.subscriptionStatus || "free") as keyof typeof TIER_BADGES
  const tierBadge = TIER_BADGES[currentTier] || TIER_BADGES.gratis
  const currentBalance = creditBalance?.balanceIDR ?? 0
  const topupOptions = topupOptionsResult?.topupOptions || []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Pilih Paket
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pilih paket yang sesuai dengan kebutuhan Anda
        </p>
      </div>

      {/* Current Tier Info */}
      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
        <span className={cn("text-xs font-bold px-2 py-0.5 rounded text-white", tierBadge.color)}>
          {tierBadge.label}
        </span>
        <span className="text-sm text-muted-foreground">
          Tier saat ini
        </span>
        {currentTier === "bpp" && (
          <span className="ml-auto text-sm">
            Saldo: <strong>Rp {currentBalance.toLocaleString("id-ID")}</strong>
          </span>
        )}
      </div>

      {/* Plans Grid - Responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrentTier =
            (plan.slug === "gratis" && (currentTier === "gratis" || currentTier === "free")) ||
            (plan.slug === currentTier)
          const isBPP = plan.slug === "bpp"
          const isPro = plan.slug === "pro"

          return (
            <div
              key={plan._id}
              className={cn(
                "bg-card border rounded-lg overflow-hidden transition-all",
                plan.isHighlighted
                  ? "border-primary shadow-lg shadow-primary/10"
                  : "border-border",
                isCurrentTier && "ring-2 ring-primary/50"
              )}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold">{plan.price}</span>
                      {plan.unit && (
                        <span className="text-sm text-muted-foreground">{plan.unit}</span>
                      )}
                    </div>
                  </div>
                  {isCurrentTier && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      Saat ini
                    </span>
                  )}
                  {plan.isHighlighted && !isCurrentTier && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                      Populer
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.tagline}</p>
              </div>

              {/* Features */}
              <div className="p-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Section */}
              <div className="p-4 pt-0">
                {/* Gratis Plan */}
                {plan.slug === "gratis" && (
                  isCurrentTier ? (
                    <div className="text-center py-2 text-sm text-muted-foreground">
                      Tier aktif Anda
                    </div>
                  ) : (
                    <Link
                      href="/chat"
                      className="block w-full py-2.5 text-center rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium"
                    >
                      {plan.ctaText}
                    </Link>
                  )
                )}

                {/* BPP Plan - Expandable */}
                {isBPP && (
                  <>
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className={cn(
                        "w-full py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2",
                        plan.isHighlighted
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      {isCurrentTier ? "Top Up Saldo" : plan.ctaText}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    {/* Expanded Topup Section */}
                    {isExpanded && (
                      <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {/* Payment Result State */}
                        {paymentResult && (
                          <PaymentResultSection
                            paymentResult={paymentResult}
                            paymentStatus={paymentStatus}
                            selectedMethod={selectedMethod}
                            selectedEWalletChannel={selectedEWalletChannel}
                            onReset={resetPayment}
                            onCopy={copyToClipboard}
                            currentBalance={currentBalance}
                          />
                        )}

                        {/* Normal Topup Flow */}
                        {!paymentResult && (
                          <>
                            {/* Error Banner */}
                            {error && (
                              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                <p className="text-sm text-destructive">{error}</p>
                              </div>
                            )}

                            {/* Amount Selection */}
                            <div>
                              <p className="text-sm font-medium mb-2">Pilih Nominal</p>
                              <div className="grid grid-cols-1 gap-2">
                                {topupOptions.map((option) => (
                                  <button
                                    key={option.amount}
                                    onClick={() => setSelectedAmount(option)}
                                    disabled={isProcessing}
                                    className={cn(
                                      "relative p-3 border rounded-lg text-left transition-colors",
                                      derivedSelectedAmount?.amount === option.amount
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/50",
                                      isProcessing && "opacity-50 cursor-not-allowed"
                                    )}
                                  >
                                    {option.popular && (
                                      <span className="absolute -top-2 right-2 text-[10px] font-medium bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                                        Populer
                                      </span>
                                    )}
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold">{option.label}</span>
                                      <span className="text-sm text-muted-foreground">
                                        = {option.tokens.toLocaleString("id-ID")} tokens
                                      </span>
                                    </div>
                                    {derivedSelectedAmount?.amount === option.amount && (
                                      <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-primary" />
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
                                  const isSelected = selectedMethod === method.id
                                  return (
                                    <button
                                      key={method.id}
                                      onClick={() => setSelectedMethod(method.id)}
                                      disabled={isProcessing}
                                      className={cn(
                                        "w-full flex items-center gap-2 p-2 border rounded-lg text-left transition-colors",
                                        isSelected
                                          ? "border-primary bg-primary/5"
                                          : "border-border hover:border-primary/50",
                                        isProcessing && "opacity-50 cursor-not-allowed"
                                      )}
                                    >
                                      <Icon className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium">{method.label}</p>
                                      </div>
                                      {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                    </button>
                                  )
                                })}
                              </div>

                              {/* VA Channel Selection */}
                              {selectedMethod === "va" && (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  {VA_CHANNELS.map((channel) => (
                                    <button
                                      key={channel.code}
                                      onClick={() => setSelectedVAChannel(channel.code)}
                                      disabled={isProcessing}
                                      className={cn(
                                        "p-2 border rounded-lg text-center text-sm transition-colors",
                                        selectedVAChannel === channel.code
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
                              {selectedMethod === "ewallet" && (
                                <div className="mt-3 space-y-3">
                                  <div className="grid grid-cols-2 gap-2">
                                    {EWALLET_CHANNELS.map((channel) => (
                                      <button
                                        key={channel.code}
                                        onClick={() => setSelectedEWalletChannel(channel.code)}
                                        disabled={isProcessing}
                                        className={cn(
                                          "p-2 border rounded-lg text-center text-sm transition-colors",
                                          selectedEWalletChannel === channel.code
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/50"
                                        )}
                                      >
                                        {channel.label}
                                      </button>
                                    ))}
                                  </div>
                                  {selectedEWalletChannel === "OVO" && (
                                    <input
                                      type="tel"
                                      value={mobileNumber}
                                      onChange={(e) => setMobileNumber(e.target.value)}
                                      placeholder="08123456789"
                                      disabled={isProcessing}
                                      className="w-full p-2 border border-border rounded-lg bg-background text-sm"
                                    />
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Pay Button */}
                            <button
                              onClick={handleTopUp}
                              disabled={isProcessing || !derivedSelectedAmount}
                              className={cn(
                                "w-full py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2",
                                "bg-primary text-primary-foreground hover:bg-primary/90",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                              )}
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Memproses...
                                </>
                              ) : (
                                <>
                                  <CreditCard className="h-4 w-4" />
                                  Bayar {derivedSelectedAmount?.label}
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Pro Plan - Coming Soon */}
                {isPro && (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-lg font-medium bg-muted text-muted-foreground cursor-not-allowed"
                  >
                    {plan.ctaText}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Info Section */}
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <h3 className="font-medium mb-2">Cara Kerja Pembayaran</h3>
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
            <span><strong>Pro:</strong> Rp 200.000/bulan untuk menyusun 5-6 paper (segera hadir)</span>
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
  paymentResult: PaymentResult
  paymentStatus: { status: string; amount: number; paidAt?: number } | null | undefined
  selectedMethod: PaymentMethod
  selectedEWalletChannel: string
  onReset: () => void
  onCopy: (text: string) => void
  currentBalance: number
}

function PaymentResultSection({
  paymentResult,
  paymentStatus,
  selectedMethod,
  selectedEWalletChannel,
  onReset,
  onCopy,
  currentBalance,
}: PaymentResultSectionProps) {
  const status = paymentStatus?.status || paymentResult.status

  // Success State
  if (status === "SUCCEEDED") {
    return (
      <div className="text-center space-y-3 py-4">
        <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-green-700 dark:text-green-400">Pembayaran Berhasil!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Saldo baru: <strong>Rp {(currentBalance + paymentResult.amount).toLocaleString("id-ID")}</strong>
          </p>
        </div>
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          Mulai Menyusun Paper
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
          <AlertCircle className="h-6 w-6 text-destructive" />
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
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          Coba Lagi
        </button>
      </div>
    )
  }

  // Pending State - Show QR/VA/E-Wallet
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
        <div className="bg-white p-3 rounded-lg inline-block">
          {paymentResult.qrCodeUrl ? (
            <Image src={paymentResult.qrCodeUrl} alt="QRIS" width={180} height={180} />
          ) : paymentResult.qrString ? (
            <QRCodeSVG value={paymentResult.qrString} size={180} level="M" />
          ) : null}
        </div>
      )}

      {/* VA Number */}
      {selectedMethod === "va" && paymentResult.vaNumber && (
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Bank {paymentResult.vaChannel}</p>
          <div className="flex items-center justify-center gap-2">
            <p className="text-lg font-mono font-bold">{paymentResult.vaNumber}</p>
            <button onClick={() => onCopy(paymentResult.vaNumber!)} className="p-1 hover:bg-muted rounded">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* E-Wallet */}
      {selectedMethod === "ewallet" && (
        <div className={cn(
          "p-3 rounded-lg",
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
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {/* Expiry */}
      <p className="text-xs text-muted-foreground">
        Berlaku sampai: {new Date(paymentResult.expiresAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
      </p>

      {/* Reset */}
      <button onClick={onReset} className="text-sm text-muted-foreground hover:text-foreground">
        Batalkan & Pilih Ulang
      </button>
    </div>
  )
}
