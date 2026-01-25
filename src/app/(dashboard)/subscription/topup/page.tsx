"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import {
  CreditCard,
  ArrowLeft,
  QrCode,
  Building2,
  Wallet,
  CheckCircle2,
  Loader2,
  Copy,
  ExternalLink,
  Clock,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Image from "next/image"
import { QRCodeSVG } from "qrcode.react"

const TOP_UP_OPTIONS = [
  { amount: 25000, tokens: 250000, label: "Rp 25.000", popular: false },
  { amount: 50000, tokens: 500000, label: "Rp 50.000", popular: true },
  { amount: 100000, tokens: 1000000, label: "Rp 100.000", popular: false },
]

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

type PaymentMethod = "qris" | "va" | "ewallet"

interface PaymentResult {
  paymentId: string
  xenditId: string
  status: string
  amount: number
  expiresAt: number
  // QRIS
  qrString?: string
  qrCodeUrl?: string
  // VA
  vaNumber?: string
  vaChannel?: string
  // E-Wallet
  redirectUrl?: string
}

export default function TopUpPage() {
  const { user, isLoading: userLoading } = useCurrentUser()
  const [selectedAmount, setSelectedAmount] = useState(TOP_UP_OPTIONS[1])
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("qris")
  const [selectedVAChannel, setSelectedVAChannel] = useState(VA_CHANNELS[0].code)
  const [selectedEWalletChannel, setSelectedEWalletChannel] = useState(EWALLET_CHANNELS[0].code)
  const [mobileNumber, setMobileNumber] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Get current credit balance
  const creditBalance = useQuery(
    api.billing.credits.getCreditBalance,
    user?._id ? { userId: user._id } : "skip"
  )

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: selectedAmount.amount,
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
      console.error("[TopUp] Error:", err)
      setError(err instanceof Error ? err.message : "Terjadi kesalahan")
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, selectedAmount, selectedMethod, selectedVAChannel, selectedEWalletChannel, mobileNumber])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Berhasil disalin!")
  }, [])

  const resetPayment = useCallback(() => {
    setPaymentResult(null)
    setError(null)
  }, [])

  // Loading state
  if (userLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Link
          href="/subscription/overview"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Overview
        </Link>

        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    )
  }

  const currentBalance = creditBalance?.balanceIDR ?? 0

  // Show payment result (QR Code / VA Number / OVO notification)
  // For ewallet: only show result if no redirect URL (OVO uses push notification)
  if (paymentResult && (selectedMethod !== "ewallet" || !paymentResult.redirectUrl)) {
    return (
      <div className="space-y-6 max-w-2xl">
        {/* Back Link */}
        <button
          onClick={resetPayment}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>

        {/* Payment Status Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-center space-y-4">
            {/* Status */}
            <div className="flex items-center justify-center gap-2 text-amber-600">
              <Clock className="h-5 w-5" />
              <span className="font-medium">Menunggu Pembayaran</span>
            </div>

            {/* Amount */}
            <div>
              <p className="text-sm text-muted-foreground">Total Pembayaran</p>
              <p className="text-3xl font-bold">
                Rp {paymentResult.amount.toLocaleString("id-ID")}
              </p>
            </div>

            {/* QR Code for QRIS */}
            {selectedMethod === "qris" && (paymentResult.qrCodeUrl || paymentResult.qrString) && (
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-lg inline-block">
                  {paymentResult.qrCodeUrl ? (
                    <Image
                      src={paymentResult.qrCodeUrl}
                      alt="QRIS Code"
                      width={256}
                      height={256}
                      className="w-64 h-64"
                    />
                  ) : paymentResult.qrString ? (
                    <QRCodeSVG
                      value={paymentResult.qrString}
                      size={256}
                      level="M"
                      includeMargin={false}
                    />
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  Scan QR Code dengan aplikasi e-wallet
                </p>
              </div>
            )}

            {/* VA Number for Virtual Account */}
            {selectedMethod === "va" && paymentResult.vaNumber && (
              <div className="space-y-3">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">
                    Bank {paymentResult.vaChannel}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-2xl font-mono font-bold tracking-wider">
                      {paymentResult.vaNumber}
                    </p>
                    <button
                      onClick={() => copyToClipboard(paymentResult.vaNumber!)}
                      className="p-2 hover:bg-muted rounded-md transition-colors"
                      title="Salin nomor"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Transfer ke nomor Virtual Account di atas
                </p>
              </div>
            )}

            {/* OVO Push Notification */}
            {selectedMethod === "ewallet" && selectedEWalletChannel === "OVO" && (
              <div className="space-y-3">
                <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Wallet className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    <p className="font-semibold text-purple-900 dark:text-purple-100">OVO</p>
                  </div>
                  <p className="text-purple-800 dark:text-purple-200 text-center">
                    Notifikasi pembayaran telah dikirim ke aplikasi OVO Anda
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Buka aplikasi OVO dan selesaikan pembayaran
                </p>
              </div>
            )}

            {/* GoPay - Sandbox mode doesn't return redirect URL */}
            {selectedMethod === "ewallet" && selectedEWalletChannel === "GOPAY" && (
              <div className="space-y-3">
                <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Wallet className="h-6 w-6 text-green-600 dark:text-green-400" />
                    <p className="font-semibold text-green-900 dark:text-green-100">GoPay</p>
                  </div>
                  <p className="text-green-800 dark:text-green-200 text-center">
                    Pembayaran GoPay sedang diproses
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Di production mode, Anda akan diarahkan ke aplikasi GoPay
                </p>
              </div>
            )}

            {/* Expiry Time */}
            <div className="text-sm text-muted-foreground">
              <p>Pembayaran berlaku sampai:</p>
              <p className="font-medium">
                {new Date(paymentResult.expiresAt).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4 text-left text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">Catatan:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                <li>Pembayaran akan diproses otomatis dalam hitungan menit</li>
                <li>Saldo akan bertambah setelah pembayaran berhasil</li>
                <li>Jangan tutup halaman ini sampai pembayaran selesai</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back Link */}
      <Link
        href="/subscription/overview"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Overview
      </Link>

      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Top Up Credit
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tambah saldo credit untuk pembayaran sesuai pemakaian
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Gagal memproses pembayaran</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        </div>
      )}

      {/* Current Balance Info */}
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Saldo saat ini</p>
            <p className="text-2xl font-semibold">
              Rp {currentBalance.toLocaleString("id-ID")}
            </p>
          </div>
          <CreditCard className="h-8 w-8 text-muted-foreground/50" />
        </div>
      </div>

      {/* Amount Selection */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="font-medium mb-3">Pilih Nominal</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TOP_UP_OPTIONS.map((option) => (
            <button
              key={option.amount}
              onClick={() => setSelectedAmount(option)}
              disabled={isProcessing}
              className={cn(
                "relative p-4 border rounded-lg text-left transition-colors",
                selectedAmount.amount === option.amount
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
              <p className="font-semibold">{option.label}</p>
              <p className="text-sm text-muted-foreground mt-1">
                = {option.tokens.toLocaleString("id-ID")} tokens
              </p>
              {selectedAmount.amount === option.amount && (
                <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="font-medium mb-3">Metode Pembayaran</h2>
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
                  "w-full flex items-center gap-3 p-3 border rounded-lg text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50",
                  isProcessing && "opacity-50 cursor-not-allowed"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-md",
                    isSelected ? "bg-primary/10" : "bg-muted"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{method.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {method.description}
                  </p>
                </div>
                {isSelected && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </button>
            )
          })}
        </div>

        {/* VA Channel Selection */}
        {selectedMethod === "va" && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm font-medium mb-2">Pilih Bank</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {VA_CHANNELS.map((channel) => (
                <button
                  key={channel.code}
                  onClick={() => setSelectedVAChannel(channel.code)}
                  disabled={isProcessing}
                  className={cn(
                    "p-2 border rounded-lg text-center transition-colors",
                    selectedVAChannel === channel.code
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                    isProcessing && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <p className="font-medium text-sm">{channel.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* E-Wallet Channel Selection */}
        {selectedMethod === "ewallet" && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm font-medium mb-2">Pilih E-Wallet</p>
            <div className="grid grid-cols-2 gap-2">
              {EWALLET_CHANNELS.map((channel) => (
                <button
                  key={channel.code}
                  onClick={() => setSelectedEWalletChannel(channel.code)}
                  disabled={isProcessing}
                  className={cn(
                    "p-2 border rounded-lg text-center transition-colors",
                    selectedEWalletChannel === channel.code
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                    isProcessing && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <p className="font-medium text-sm">{channel.label}</p>
                </button>
              ))}
            </div>

            {/* Mobile Number Input for OVO */}
            {selectedEWalletChannel === "OVO" && (
              <div className="mt-3">
                <label htmlFor="mobileNumber" className="text-sm text-muted-foreground mb-1 block">
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
                    "w-full p-3 border rounded-lg bg-background text-foreground",
                    "placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                    isProcessing && "opacity-50 cursor-not-allowed"
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Notifikasi pembayaran akan dikirim ke aplikasi OVO
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary & Pay Button */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground">Total Pembayaran</span>
          <span className="text-xl font-semibold">{selectedAmount.label}</span>
        </div>
        <div className="flex items-center justify-between mb-4 text-sm">
          <span className="text-muted-foreground">Saldo setelah top up</span>
          <span className="font-medium">
            Rp {(currentBalance + selectedAmount.amount).toLocaleString("id-ID")}
          </span>
        </div>
        <button
          onClick={handleTopUp}
          disabled={isProcessing}
          className={cn(
            "w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Memproses...
            </>
          ) : selectedMethod === "ewallet" ? (
            <>
              <ExternalLink className="h-4 w-4" />
              Lanjut ke {selectedEWalletChannel}
            </>
          ) : (
            "Bayar Sekarang"
          )}
        </button>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Pembayaran diproses oleh Xendit. Aman dan terenkripsi.
        </p>
      </div>
    </div>
  )
}
