"use client"

import { useState, useCallback, useEffect, useRef, Suspense } from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { Id } from "@convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useOnboardingStatus } from "@/lib/hooks/useOnboardingStatus"
import { useRouter, useSearchParams } from "next/navigation"
import {
  CreditCard,
  NavArrowLeft,
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
} from "iconoir-react"
import { cn } from "@/lib/utils"
import { getEffectiveTier } from "@/lib/utils/subscription"
import { SUBSCRIPTION_PRICING } from "@convex/billing/constants"
import { toast } from "sonner"
import Image from "next/image"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import { DottedPattern } from "@/components/marketing/SectionBackground"

type PaymentMethod = "qris" | "va" | "ewallet"
const PRO_PLAN_TYPE = "pro_monthly" as const
const PRO_PRICING = SUBSCRIPTION_PRICING[PRO_PLAN_TYPE]

interface PaymentResult {
  paymentId: string
  convexPaymentId: string
  xenditId: string
  status: string
  amount: number
  expiresAt: number
  planType?: string
  planLabel?: string
  qrString?: string
  qrCodeUrl?: string
  vaNumber?: string
  vaChannel?: string
  redirectUrl?: string
}

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

const shellPanelClass = "rounded-shell border border-border/70 bg-card/95"
const sectionCardClass = "rounded-shell border border-border/60 bg-[color:var(--slate-100)]/70 p-3 dark:bg-[color:var(--slate-900)]/70 md:p-4"

function getSubscriptionBackRoute(fromParam: string | null): string {
  switch (fromParam) {
    case "plans":
      return "/subscription/plans"
    case "history":
      return "/subscription/history"
    case "upgrade":
      return "/subscription/upgrade"
    case "overview":
    default:
      return "/subscription/overview"
  }
}

function BackToSubscriptionButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-interface inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline focus-ring"
    >
      <NavArrowLeft className="h-3.5 w-3.5" />
      <span>Kembali</span>
    </button>
  )
}

export default function CheckoutPROPage() {
  return (
    <Suspense
      fallback={
        <section className="fixed inset-0 overflow-hidden bg-[color:var(--slate-100)] dark:bg-[color:var(--slate-950)]">
          <DottedPattern spacing={24} withRadialMask={false} className="z-0" />
          <div className="relative z-10 flex h-full items-center justify-center px-4">
            <div className={cn("w-full max-w-2xl p-4 md:p-5", shellPanelClass)}>
              <div className="animate-pulse space-y-3">
                <div className="h-6 rounded bg-muted w-1/3" />
                <div className="h-28 rounded-shell bg-muted" />
                <div className="h-48 rounded-shell bg-muted" />
              </div>
            </div>
          </div>
        </section>
      }
    >
      <CheckoutPROContent />
    </Suspense>
  )
}

function CheckoutPROContent() {
  const { user, isLoading: userLoading } = useCurrentUser()
  const { hasCompletedOnboarding, completeOnboarding } = useOnboardingStatus()
  const onboardingCompletedRef = useRef(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const backRoute = getSubscriptionBackRoute(searchParams.get("from"))
  const handleBackToSubscription = useCallback(() => {
    router.push(backRoute)
  }, [router, backRoute])

  useEffect(() => {
    if (!hasCompletedOnboarding && !onboardingCompletedRef.current) {
      onboardingCompletedRef.current = true
      void completeOnboarding().catch((error) => {
        console.error("[CheckoutPRO] completeOnboarding failed:", error)
      })
    }
  }, [hasCompletedOnboarding, completeOnboarding])

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior
    const prevBodyOverscroll = document.body.style.overscrollBehavior

    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
    document.documentElement.style.overscrollBehavior = "none"
    document.body.style.overscrollBehavior = "none"

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll
      document.body.style.overscrollBehavior = prevBodyOverscroll
    }
  }, [])

  const creditBalance = useQuery(
    api.billing.credits.getCreditBalance,
    user?._id ? { userId: user._id } : "skip"
  )

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("qris")
  const [selectedVAChannel, setSelectedVAChannel] = useState(VA_CHANNELS[0].code)
  const [selectedEWalletChannel, setSelectedEWalletChannel] = useState(EWALLET_CHANNELS[0].code)
  const [mobileNumber, setMobileNumber] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const paymentStatus = useQuery(
    api.billing.payments.watchPaymentStatus,
    paymentResult?.convexPaymentId
      ? { paymentId: paymentResult.convexPaymentId as Id<"payments"> }
      : "skip"
  )

  useEffect(() => {
    if (paymentStatus?.status === "SUCCEEDED" && paymentResult) {
      toast.success("Pembayaran berhasil. Langganan Pro sudah aktif.")
    }
  }, [paymentStatus?.status, paymentResult])

  const handleSubscribe = useCallback(async () => {
    if (isProcessing) return

    if (selectedMethod === "ewallet" && selectedEWalletChannel === "OVO" && !mobileNumber.trim()) {
      setError("Nomor HP wajib diisi untuk pembayaran OVO")
      toast.error("Nomor HP wajib diisi untuk pembayaran OVO")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch("/api/payments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: PRO_PLAN_TYPE,
          paymentMethod: selectedMethod,
          vaChannel: selectedMethod === "va" ? selectedVAChannel : undefined,
          ewalletChannel: selectedMethod === "ewallet" ? selectedEWalletChannel : undefined,
          mobileNumber: selectedMethod === "ewallet" && selectedEWalletChannel === "OVO" ? mobileNumber : undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Gagal membuat pembayaran")

      setPaymentResult(data)

      if (selectedMethod === "ewallet" && data.redirectUrl) {
        window.location.href = data.redirectUrl
      }
    } catch (err) {
      console.error("[CheckoutPRO] Error:", err)
      const message = err instanceof Error ? err.message : "Terjadi kesalahan"
      setError(message)
      toast.error(message)
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, selectedMethod, selectedVAChannel, selectedEWalletChannel, mobileNumber])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Berhasil disalin")
  }, [])

  const resetPayment = useCallback(() => {
    setPaymentResult(null)
    setError(null)
  }, [])

  if (userLoading) {
    return (
      <section className="fixed inset-0 overflow-hidden bg-[color:var(--slate-100)] dark:bg-[color:var(--slate-950)]">
        <DottedPattern spacing={24} withRadialMask={false} className="z-0" />
      </section>
    )
  }

  if (!user) {
    return (
      <section className="fixed inset-0 overflow-hidden bg-[color:var(--slate-100)] dark:bg-[color:var(--slate-950)]">
        <DottedPattern spacing={24} withRadialMask={false} className="z-0" />
        <div className="relative z-10 flex h-full items-center justify-center px-4">
          <div className={cn("w-full max-w-xl p-4 text-center", shellPanelClass)}>
            <p className="text-narrative text-sm text-muted-foreground">Sesi tidak aktif. Silakan login ulang.</p>
          </div>
        </div>
      </section>
    )
  }

  const currentTier = getEffectiveTier(user.role, user.subscriptionStatus)
  const currentCredits = creditBalance?.remainingCredits ?? 0
  const pricing = PRO_PRICING
  const paymentState = paymentStatus?.status || paymentResult?.status

  if (currentTier === "pro" || currentTier === "unlimited") {
    return (
      <section className="fixed inset-0 overflow-hidden bg-[color:var(--slate-100)] dark:bg-[color:var(--slate-950)]">
        <DottedPattern spacing={24} withRadialMask={false} className="z-0" />
        <div className="relative z-10 flex h-full items-center justify-center px-4">
          <div className={cn("w-full max-w-xl space-y-3 p-4 text-center", shellPanelClass)}>
            <BackToSubscriptionButton onClick={handleBackToSubscription} />
            <p className="text-narrative text-base text-foreground">Akses Pro sudah aktif.</p>
            <Link href="/subscription/plans" className="text-interface text-xs text-primary hover:underline">
              Kembali ke halaman paket
            </Link>
          </div>
        </div>
      </section>
    )
  }

  if (paymentResult && paymentState === "SUCCEEDED") {
    return (
      <section className="fixed inset-0 overflow-hidden bg-[color:var(--slate-100)] dark:bg-[color:var(--slate-950)]">
        <DottedPattern spacing={24} withRadialMask={false} className="z-0" />
        <div className="relative z-10 flex h-full items-center justify-center px-4">
          <div className={cn("w-full max-w-xl space-y-3 p-4 text-center", shellPanelClass)}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-interface text-base font-medium text-foreground">Pembayaran berhasil</p>
            <p className="text-narrative text-sm text-muted-foreground">Langganan Pro sudah aktif. Langsung mulai kerja di chat.</p>
            <div className="pt-2">
              <Link
                href="/chat"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-action bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Mulai Menggunakan Pro
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="fixed inset-0 overflow-hidden bg-[color:var(--slate-100)] dark:bg-[color:var(--slate-950)]">
      <DottedPattern spacing={24} withRadialMask={false} className="z-0" />
      <div className="relative z-10 flex h-full items-center justify-center px-3 py-3 md:px-6 md:py-6">
        <div className="w-full max-w-2xl">
          <div className={cn("space-y-3 p-4 md:p-5", shellPanelClass)}>
            <BackToSubscriptionButton onClick={handleBackToSubscription} />

            <div className="text-center">
              <div className="mb-1 inline-flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-foreground" />
                <h1 className="text-narrative text-xl font-medium text-foreground">Checkout Pro</h1>
              </div>
              <p className="text-interface text-xs text-muted-foreground">Upgrade ke langganan Pro</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-shell border border-destructive/40 bg-destructive/10 p-3">
                <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="text-interface text-xs font-medium text-destructive">Gagal memproses pembayaran</p>
                  <p className="text-narrative text-sm text-destructive/80">{error}</p>
                </div>
              </div>
            )}

            <div className={sectionCardClass}>
              <p className="text-interface text-xs text-muted-foreground">Saldo kredit saat ini</p>
              <p className="text-interface text-2xl font-medium tracking-tight text-foreground">
                {currentCredits}
                <span className="ml-1 text-sm font-normal text-muted-foreground">kredit</span>
              </p>
              {currentCredits > 0 && (
                <p className="text-narrative mt-1 text-xs text-muted-foreground">
                  Kredit BPP tetap tersimpan setelah upgrade ke Pro.
                </p>
              )}
            </div>

            {paymentResult && paymentState !== "FAILED" && paymentState !== "EXPIRED" && (
              <div className={cn("space-y-3 text-center", sectionCardClass)}>
                <div className="inline-flex items-center gap-2 rounded-action border border-[color:var(--emerald-500)] bg-[color:var(--emerald-500)]/10 px-3 py-1 text-signal text-[10px] text-[color:var(--emerald-500)]">
                  <Clock className="h-3.5 w-3.5" />
                  Menunggu Pembayaran
                </div>
                <div>
                  <p className="text-interface text-xs text-muted-foreground">Total Pembayaran</p>
                  <p className="text-interface text-3xl font-medium tracking-tight text-foreground">Rp {paymentResult.amount.toLocaleString("id-ID")}</p>
                  <p className="text-narrative text-sm text-muted-foreground">{paymentResult.planLabel || pricing.label}</p>
                </div>

                {selectedMethod === "qris" && (paymentResult.qrCodeUrl || paymentResult.qrString) && (
                  <div className="space-y-2">
                    <div className="inline-flex rounded-shell border border-border/70 bg-white p-3">
                      {paymentResult.qrCodeUrl ? (
                        <Image src={paymentResult.qrCodeUrl} alt="QRIS Code" width={208} height={208} className="h-[208px] w-[208px]" />
                      ) : paymentResult.qrString ? (
                        <QRCodeSVG value={paymentResult.qrString} size={208} level="M" includeMargin={false} />
                      ) : null}
                    </div>
                  </div>
                )}

                {selectedMethod === "va" && paymentResult.vaNumber && (
                  <div className="space-y-2">
                    <div className="rounded-shell border border-border/70 bg-background/60 p-3">
                      <p className="text-interface mb-1 text-xs text-muted-foreground">Bank {paymentResult.vaChannel}</p>
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-interface text-2xl font-medium tracking-wider text-foreground">{paymentResult.vaNumber}</p>
                        <button
                          onClick={() => copyToClipboard(paymentResult.vaNumber!)}
                          className="focus-ring rounded-action border border-border/70 p-2 transition-colors hover:bg-muted"
                          title="Salin nomor"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedMethod === "ewallet" && (
                  <div className="rounded-shell border border-border/70 bg-background/60 p-3">
                    <div className="mb-2 flex items-center justify-center gap-2">
                      <Wallet className="h-5 w-5 text-foreground" />
                      <p className="text-interface text-sm font-medium">{selectedEWalletChannel}</p>
                    </div>
                    {paymentResult.redirectUrl && (
                      <a
                        href={paymentResult.redirectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-interface inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Buka {selectedEWalletChannel}
                        <OpenNewWindow className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                <p className="text-narrative text-xs text-muted-foreground">
                  Berlaku sampai {new Date(paymentResult.expiresAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                </p>

                <button onClick={resetPayment} className="text-interface text-xs text-muted-foreground hover:text-foreground">
                  Batalkan & Pilih Ulang
                </button>
              </div>
            )}

            {paymentResult && (paymentState === "FAILED" || paymentState === "EXPIRED") && (
              <div className={cn("space-y-3 text-center", sectionCardClass)}>
                <p className="text-interface text-base font-medium text-destructive">
                  {paymentState === "FAILED" ? "Pembayaran gagal" : "Pembayaran kadaluarsa"}
                </p>
                <button
                  onClick={resetPayment}
                  className="focus-ring rounded-action bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Buat Pembayaran Baru
                </button>
              </div>
            )}

            {!paymentResult && (
              <>
                <div className={sectionCardClass}>
                  <h2 className="text-narrative mb-2 font-medium text-foreground">Paket Langganan</h2>
                  <div className="rounded-shell border border-[color:var(--emerald-500)] bg-[color:var(--emerald-500)]/10 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-interface text-sm font-medium text-foreground">{pricing.label}</p>
                      <p className="text-interface text-sm font-medium text-foreground">Rp {pricing.priceIDR.toLocaleString("id-ID")}</p>
                    </div>
                  </div>
                </div>

                <div className={sectionCardClass}>
                  <h2 className="text-narrative mb-2 font-medium text-foreground">Metode Pembayaran</h2>
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
                            "w-full rounded-shell border p-3 text-left transition-colors",
                            "flex items-center gap-3",
                            isSelected
                              ? "border-[color:var(--emerald-500)] bg-[color:var(--emerald-500)]/10"
                              : "border-border/70 bg-background/50 hover:bg-muted/60",
                            isProcessing && "cursor-not-allowed opacity-50"
                          )}
                        >
                          <Icon className={cn("h-4 w-4", isSelected ? "text-[color:var(--emerald-500)]" : "text-muted-foreground")} />
                          <div className="flex-1">
                            <p className="text-interface text-sm font-medium text-foreground">{method.label}</p>
                            <p className="text-narrative text-xs text-muted-foreground">{method.description}</p>
                          </div>
                          {isSelected && <CheckCircle className="h-4 w-4 text-[color:var(--emerald-500)]" />}
                        </button>
                      )
                    })}
                  </div>

                  {selectedMethod === "va" && (
                    <div className="mt-3 border-t border-border/60 pt-3">
                      <p className="text-interface mb-2 text-xs text-muted-foreground">Pilih Bank</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {VA_CHANNELS.map((channel) => (
                          <button
                            key={channel.code}
                            onClick={() => setSelectedVAChannel(channel.code)}
                            disabled={isProcessing}
                            className={cn(
                              "rounded-action border px-2 py-2 text-interface text-xs transition-colors",
                              selectedVAChannel === channel.code
                                ? "border-[color:var(--emerald-500)] bg-[color:var(--emerald-500)]/10"
                                : "border-border/70 hover:bg-muted/60",
                              isProcessing && "cursor-not-allowed opacity-50"
                            )}
                          >
                            {channel.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedMethod === "ewallet" && (
                    <div className="mt-3 border-t border-border/60 pt-3">
                      <p className="text-interface mb-2 text-xs text-muted-foreground">Pilih E-Wallet</p>
                      <div className="grid grid-cols-2 gap-2">
                        {EWALLET_CHANNELS.map((channel) => (
                          <button
                            key={channel.code}
                            onClick={() => setSelectedEWalletChannel(channel.code)}
                            disabled={isProcessing}
                            className={cn(
                              "rounded-action border px-2 py-2 text-interface text-xs transition-colors",
                              selectedEWalletChannel === channel.code
                                ? "border-[color:var(--emerald-500)] bg-[color:var(--emerald-500)]/10"
                                : "border-border/70 hover:bg-muted/60",
                              isProcessing && "cursor-not-allowed opacity-50"
                            )}
                          >
                            {channel.label}
                          </button>
                        ))}
                      </div>

                      {selectedEWalletChannel === "OVO" && (
                        <div className="mt-2">
                          <label htmlFor="mobileNumber" className="text-interface mb-1 block text-xs text-muted-foreground">
                            Nomor HP terdaftar di OVO
                          </label>
                          <input
                            id="mobileNumber"
                            type="tel"
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value)}
                            placeholder="08123456789"
                            disabled={isProcessing}
                            className={cn(
                              "w-full rounded-shell border border-border/70 bg-background px-3 py-2 text-narrative text-sm text-foreground",
                              "placeholder:text-muted-foreground",
                              "focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/60",
                              isProcessing && "cursor-not-allowed opacity-50"
                            )}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className={sectionCardClass}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-narrative text-sm text-muted-foreground">Total Pembayaran</span>
                    <span className="text-interface text-2xl font-medium tracking-tight text-foreground">Rp {pricing.priceIDR.toLocaleString("id-ID")}</span>
                  </div>
                  <button
                    onClick={handleSubscribe}
                    disabled={isProcessing}
                    className={cn(
                      "group relative w-full overflow-hidden rounded-action border border-transparent px-4 py-2.5",
                      "text-signal text-xs font-medium uppercase tracking-widest",
                      "bg-[color:var(--slate-800)] text-[color:var(--slate-100)]",
                      "hover:text-[color:var(--slate-800)] hover:border-[color:var(--slate-600)]",
                      "dark:bg-[color:var(--slate-100)] dark:text-[color:var(--slate-800)]",
                      "dark:hover:text-[color:var(--slate-100)] dark:hover:border-[color:var(--slate-400)]",
                      "transition-colors focus-ring",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <span
                      className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                      aria-hidden="true"
                    />
                    <span className="relative z-10 inline-flex items-center justify-center gap-2 whitespace-nowrap">
                      {isProcessing ? (
                        <>
                          <RefreshDouble className="h-4 w-4 animate-spin" />
                          Memproses
                        </>
                      ) : (
                        <>Bayar {pricing.label}</>
                      )}
                    </span>
                  </button>
                  <p className="text-narrative mt-2 text-center text-xs text-muted-foreground">
                    Pembayaran diproses oleh Xendit. Aman dan terenkripsi.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
