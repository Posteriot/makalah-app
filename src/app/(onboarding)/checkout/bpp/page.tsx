"use client"

import { useState, useCallback, useEffect, useRef, Suspense } from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
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
} from "iconoir-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Image from "next/image"
import { QRCodeSVG } from "qrcode.react"
import { DottedPattern } from "@/components/marketing/SectionBackground"

// ════════════════════════════════════════════════════════════════
// Constants — Single BPP package (300 kredit = Rp 80.000)
// ════════════════════════════════════════════════════════════════

const BPP_PACKAGE = {
  type: "paper" as const,
  credits: 300,
  priceIDR: 80_000,
  label: "Paket Paper",
  description: "1 paper lengkap (~15 halaman)",
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

type PaymentMethod = "qris" | "va" | "ewallet"

const shellPanelClass = "rounded-shell border border-border/70 bg-card/95"
const sectionCardClass = "rounded-shell border border-border/60 bg-[color:var(--slate-100)] p-3 dark:bg-[color:var(--slate-800)]/70 md:p-4"

interface PaymentResult {
  paymentId: string
  convexPaymentId?: string
  xenditId: string
  status: string
  amount: number
  expiresAt: number
  packageType?: string
  credits?: number
  packageLabel?: string
  qrString?: string
  qrCodeUrl?: string
  vaNumber?: string
  vaChannel?: string
  redirectUrl?: string
}

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

export default function CheckoutBPPPage() {
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
      <CheckoutBPPContent />
    </Suspense>
  )
}

function CheckoutBPPContent() {
  const { user, isLoading: userLoading } = useCurrentUser()
  const { hasCompletedOnboarding, completeOnboarding } = useOnboardingStatus()
  const onboardingCompletedRef = useRef(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const backRoute = getSubscriptionBackRoute(searchParams.get("from"))
  const handleBackToSubscription = useCallback(() => {
    router.push(backRoute)
  }, [router, backRoute])

  // Auto-complete onboarding when user lands on checkout page
  useEffect(() => {
    if (!hasCompletedOnboarding && !onboardingCompletedRef.current) {
      onboardingCompletedRef.current = true
      void completeOnboarding().catch((error) => {
        console.error("[CheckoutBPP] completeOnboarding failed:", error)
      })
    }
  }, [hasCompletedOnboarding, completeOnboarding])

  // Keep checkout viewport fixed like /get-started (no page scroll).
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

  // Get current credit balance
  const creditBalance = useQuery(
    api.billing.credits.getCreditBalance,
    user?._id ? { userId: user._id } : "skip"
  )

  // Payment state
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("qris")
  const [selectedVAChannel, setSelectedVAChannel] = useState(VA_CHANNELS[0].code)
  const [selectedEWalletChannel, setSelectedEWalletChannel] = useState(EWALLET_CHANNELS[0].code)
  const [mobileNumber, setMobileNumber] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTopUp = useCallback(async () => {
    if (isProcessing) return

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
          packageType: BPP_PACKAGE.type,
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

      // If e-wallet, redirect to payment app
      if (selectedMethod === "ewallet" && data.redirectUrl) {
        window.location.href = data.redirectUrl
      }
    } catch (err) {
      console.error("[CheckoutBPP] Error:", err)
      setError(err instanceof Error ? err.message : "Terjadi kesalahan")
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, selectedMethod, selectedVAChannel, selectedEWalletChannel, mobileNumber])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Berhasil disalin!")
  }, [])

  // Loading state
  if (userLoading) {
    return (
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
    )
  }

  const currentCredits = creditBalance?.remainingCredits ?? 0

  // Show payment result (QR Code / VA Number / OVO notification)
  if (paymentResult && (selectedMethod !== "ewallet" || !paymentResult.redirectUrl)) {
    return (
      <section className="fixed inset-0 overflow-hidden bg-[color:var(--slate-100)] dark:bg-[color:var(--slate-950)]">
        <DottedPattern spacing={24} withRadialMask={false} className="z-0" />
        <div className="relative z-10 flex h-full items-center justify-center px-3 py-3 md:px-6 md:py-6">
          <div className="w-full max-w-2xl">
            <div className={cn("space-y-3 p-4 md:p-5", shellPanelClass)}>
              <BackToSubscriptionButton onClick={handleBackToSubscription} />

              <div className={cn("space-y-3 text-center", sectionCardClass)}>
                <div className="inline-flex items-center gap-2 rounded-action border border-[color:var(--emerald-500)] bg-[color:var(--emerald-500)]/10 px-3 py-1 text-signal text-[10px] text-[color:var(--emerald-500)]">
                  <Clock className="h-3.5 w-3.5" />
                  Menunggu Pembayaran
                </div>

                <div>
                  <p className="text-interface text-xs text-muted-foreground">Total Pembayaran</p>
                  <p className="text-interface text-3xl font-medium tracking-tight text-foreground">
                    Rp {paymentResult.amount.toLocaleString("id-ID")}
                  </p>
                  <p className="text-narrative text-sm text-muted-foreground">
                    {BPP_PACKAGE.credits} kredit ({BPP_PACKAGE.description})
                  </p>
                </div>

                {selectedMethod === "qris" && (paymentResult.qrCodeUrl || paymentResult.qrString) && (
                  <div className="space-y-2">
                    <div className="inline-flex rounded-shell border border-border/70 bg-white p-3">
                      {paymentResult.qrCodeUrl ? (
                        <Image
                          src={paymentResult.qrCodeUrl}
                          alt="QRIS Code"
                          width={208}
                          height={208}
                          className="h-[208px] w-[208px]"
                        />
                      ) : paymentResult.qrString ? (
                        <QRCodeSVG
                          value={paymentResult.qrString}
                          size={208}
                          level="M"
                          includeMargin={false}
                        />
                      ) : null}
                    </div>
                    <p className="text-narrative text-sm text-muted-foreground">
                      Scan QR code dengan aplikasi e-wallet lo
                    </p>
                  </div>
                )}

                {selectedMethod === "va" && paymentResult.vaNumber && (
                  <div className="space-y-2">
                    <div className="rounded-shell border border-border/70 bg-background/60 p-3">
                      <p className="text-interface text-xs text-muted-foreground mb-1">
                        Bank {paymentResult.vaChannel}
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-interface text-2xl font-medium tracking-wider text-foreground">
                          {paymentResult.vaNumber}
                        </p>
                        <button
                          onClick={() => copyToClipboard(paymentResult.vaNumber!)}
                          className="focus-ring rounded-action border border-border/70 p-2 transition-colors hover:bg-muted"
                          title="Salin nomor"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-narrative text-sm text-muted-foreground">
                      Transfer ke nomor virtual account di atas
                    </p>
                  </div>
                )}

                {selectedMethod === "ewallet" && (
                  <div className="rounded-shell border border-border/70 bg-background/60 p-3">
                    <div className="mb-2 flex items-center justify-center gap-2">
                      <Wallet className="h-5 w-5 text-foreground" />
                      <p className="text-interface text-sm font-medium">{selectedEWalletChannel}</p>
                    </div>
                    <p className="text-narrative text-sm text-muted-foreground">
                      Buka aplikasi {selectedEWalletChannel} lalu selesaikan pembayarannya.
                    </p>
                  </div>
                )}

                <div className="text-narrative text-sm text-muted-foreground">
                  <p>Pembayaran berlaku sampai:</p>
                  <p className="text-interface font-medium text-foreground">
                    {new Date(paymentResult.expiresAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                <div className="rounded-shell border border-border/70 bg-background/60 p-3 text-left">
                  <p className="text-interface text-xs font-medium text-foreground mb-1">Catatan:</p>
                  <ul className="text-narrative list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Pembayaran diproses otomatis dalam hitungan menit.</li>
                    <li>Saldo kredit langsung bertambah setelah pembayaran sukses.</li>
                    <li>Jangan tutup halaman ini sebelum status berubah berhasil.</li>
                  </ul>
                </div>
              </div>
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
              <div className="inline-flex items-center gap-2 mb-1">
                <CreditCard className="h-5 w-5 text-foreground" />
                <h1 className="text-narrative text-xl font-medium text-foreground">Beli Kredit</h1>
              </div>
              <p className="text-interface text-xs text-muted-foreground">
                Bayar Per Paper - 1 paper lengkap
              </p>
            </div>

            {error && (
              <div className="rounded-shell border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2">
                <WarningCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-interface text-xs font-medium text-destructive">Gagal memproses pembayaran</p>
                  <p className="text-narrative text-sm text-destructive/80">{error}</p>
                </div>
              </div>
            )}

            <div className={sectionCardClass}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-interface text-xs text-muted-foreground">Saldo kredit saat ini</p>
                  <p className="text-interface text-2xl font-medium tracking-tight text-foreground">
                    {currentCredits}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">kredit</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-signal text-[10px] text-muted-foreground">Paket Paper</p>
                  <p className="text-interface text-lg font-medium text-foreground">
                    {BPP_PACKAGE.credits} kredit
                  </p>
                  <p className="text-interface text-sm text-muted-foreground">
                    Rp {BPP_PACKAGE.priceIDR.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            </div>

            <div className={sectionCardClass}>
              <h2 className="text-narrative font-medium text-foreground mb-2">Metode Pembayaran</h2>
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
                        "w-full flex items-center gap-3 rounded-shell border p-3 text-left transition-colors",
                        isSelected
                          ? "border-[color:var(--emerald-500)] bg-[color:var(--emerald-500)]/10"
                          : "border-border/70 bg-background/50 hover:bg-muted/90",
                        isProcessing && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-action border p-2",
                          isSelected
                            ? "border-[color:var(--emerald-500)] bg-[color:var(--emerald-500)]/15"
                            : "border-border/70 bg-muted/70"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            isSelected ? "text-[color:var(--emerald-500)]" : "text-muted-foreground"
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-interface text-sm font-medium text-foreground">{method.label}</p>
                        <p className="text-narrative text-sm text-muted-foreground">
                          {method.description}
                        </p>
                      </div>
                      {isSelected && <CheckCircle className="h-4 w-4 text-[color:var(--emerald-500)]" />}
                    </button>
                  )
                })}
              </div>

              {selectedMethod === "va" && (
                <div className="mt-3 border-t border-border/60 pt-3">
                  <p className="text-interface text-xs text-muted-foreground mb-2">Pilih Bank</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                          isProcessing && "opacity-50 cursor-not-allowed"
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
                  <p className="text-interface text-xs text-muted-foreground mb-2">Pilih E-Wallet</p>
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
                          isProcessing && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {channel.label}
                      </button>
                    ))}
                  </div>

                  {selectedEWalletChannel === "OVO" && (
                    <div className="mt-2">
                      <label htmlFor="mobileNumber" className="text-interface text-xs text-muted-foreground mb-1 block">
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
                          "focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-ring",
                          isProcessing && "opacity-50 cursor-not-allowed"
                        )}
                      />
                      <p className="text-narrative text-xs text-muted-foreground mt-1">
                        Notifikasi pembayaran akan dikirim ke aplikasi OVO.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={sectionCardClass}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-narrative text-sm text-muted-foreground">Total Pembayaran</span>
                <span className="text-interface text-2xl font-medium tracking-tight text-foreground">
                  Rp {BPP_PACKAGE.priceIDR.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="text-narrative text-muted-foreground">Kredit setelah top up</span>
                <span className="text-interface font-medium text-foreground">
                  {currentCredits + BPP_PACKAGE.credits} kredit
                </span>
              </div>
              <button
                onClick={handleTopUp}
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
                  ) : selectedMethod === "ewallet" ? (
                    <>
                      <OpenNewWindow className="h-4 w-4" />
                      Lanjut ke {selectedEWalletChannel}
                    </>
                  ) : (
                    <>Bayar Rp {BPP_PACKAGE.priceIDR.toLocaleString("id-ID")}</>
                  )}
                </span>
              </button>
              <p className="text-narrative text-xs text-muted-foreground text-center mt-2">
                Pembayaran diproses oleh Xendit. Aman dan terenkripsi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
