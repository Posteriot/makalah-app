"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import {
  ArrowUpCircle,
  Check,
  Sparkles,
  Zap,
  Shield,
  HeadphonesIcon,
  Loader2,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"

const PRO_FEATURES = [
  {
    icon: Zap,
    title: "5 Juta Tokens/Bulan",
    description: "Kuota besar untuk kebutuhan intensif",
  },
  {
    icon: Sparkles,
    title: "Unlimited Papers",
    description: "Buat paper sebanyak yang Anda butuhkan",
  },
  {
    icon: Shield,
    title: "Priority Access",
    description: "Akses prioritas saat traffic tinggi",
  },
  {
    icon: HeadphonesIcon,
    title: "Priority Support",
    description: "Dukungan prioritas via email",
  },
]

const COMPARISON = [
  { feature: "Token Bulanan", gratis: "100K", pro: "5 Juta" },
  { feature: "Paper per Bulan", gratis: "2 draft", pro: "Unlimited" },
  { feature: "Web Search", gratis: "Terbatas", pro: "Unlimited" },
  { feature: "Export", gratis: "Watermark", pro: "Tanpa Watermark" },
  { feature: "Support", gratis: "Standard", pro: "Priority" },
]

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(timestamp))
}

export default function UpgradePage() {
  const { user, isLoading: userLoading } = useCurrentUser()

  // Check subscription status
  const subscriptionStatus = useQuery(
    api.billing.subscriptions.checkSubscriptionStatus,
    user?._id ? { userId: user._id } : "skip"
  )

  // Loading state
  if (userLoading || subscriptionStatus === undefined) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  const currentTier = user?.subscriptionStatus || "free"
  const isAlreadyPro = currentTier === "pro" || subscriptionStatus.hasSubscription
  const isPendingCancel = subscriptionStatus.isPendingCancel

  const handleUpgrade = async () => {
    // TODO: Integrate with Xendit subscription
    alert("Fitur upgrade ke Pro belum tersedia. Akan diintegrasikan dengan Xendit.")
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <ArrowUpCircle className="h-5 w-5 text-primary" />
          Upgrade ke Pro
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dapatkan akses penuh tanpa batas
        </p>
      </div>

      {/* Already Pro Message */}
      {isAlreadyPro && !isPendingCancel && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <p className="font-medium text-green-800 dark:text-green-200">
              Anda sudah berlangganan Pro
            </p>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            Nikmati semua fitur premium tanpa batas.
          </p>
          {subscriptionStatus.currentPeriodEnd && (
            <div className="flex items-center gap-2 mt-3 text-sm text-green-600 dark:text-green-400">
              <Calendar className="h-4 w-4" />
              <span>
                Berlaku hingga: {formatDate(subscriptionStatus.currentPeriodEnd)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Pending Cancellation Notice */}
      {isPendingCancel && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-600" />
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Langganan akan berakhir
            </p>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Akses Pro Anda aktif hingga {subscriptionStatus.currentPeriodEnd ? formatDate(subscriptionStatus.currentPeriodEnd) : "-"}.
            Setelah itu, Anda akan kembali ke tier Gratis.
          </p>
          <button
            onClick={() => alert("Fitur reaktivasi langganan belum tersedia.")}
            className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline"
          >
            Batalkan pembatalan & tetap Pro
          </button>
        </div>
      )}

      {/* Pro Card */}
      {!isAlreadyPro && (
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">
              REKOMENDASI
            </span>
          </div>
          <h2 className="text-2xl font-bold">Pro Plan</h2>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-bold">Rp 99.000</span>
            <span className="text-muted-foreground">/bulan</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Atau Rp 990.000/tahun (hemat 2 bulan)
          </p>

          <button
            onClick={handleUpgrade}
            className={cn(
              "w-full mt-6 py-3 rounded-lg font-medium transition-colors",
              "bg-[var(--success)] text-white hover:bg-[oklch(0.65_0.181_125.2)]"
            )}
          >
            Upgrade Sekarang
          </button>
        </div>
      )}

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PRO_FEATURES.map((feature) => {
          const Icon = feature.icon
          return (
            <div
              key={feature.title}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-md">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Comparison Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-medium">Perbandingan Fitur</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-2 font-medium">Fitur</th>
                <th className="text-center px-4 py-2 font-medium">Gratis</th>
                <th className="text-center px-4 py-2 font-medium text-primary">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COMPARISON.map((row) => (
                <tr key={row.feature} className="hover:bg-muted/30">
                  <td className="px-4 py-3">{row.feature}</td>
                  <td className="text-center px-4 py-3 text-muted-foreground">
                    {row.gratis}
                  </td>
                  <td className="text-center px-4 py-3 font-medium">
                    {row.pro}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <h3 className="font-medium mb-3">Pertanyaan Umum</h3>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium">Bisa batal kapan saja?</p>
            <p className="text-muted-foreground">
              Ya, Anda bisa membatalkan langganan kapan saja. Akses Pro akan
              tetap aktif hingga akhir periode billing.
            </p>
          </div>
          <div>
            <p className="font-medium">Metode pembayaran apa saja?</p>
            <p className="text-muted-foreground">
              QRIS, Virtual Account (BCA, Mandiri, BNI, BRI), dan E-Wallet
              (OVO, DANA, ShopeePay).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
