"use client"

import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { useOnboardingStatus } from "@/lib/hooks/useOnboardingStatus"

const GRATIS_FEATURES = [
  "50 kredit",
  "Menggunakan 13 tahap workflow",
  "Diskusi dan menyusun draft",
  "Pemakaian harian terbatas",
]

const BPP_FEATURES = [
  "300 kredit (~15 halaman)",
  "Full 13 tahap workflow",
  "Export Word & PDF",
]

const PRO_FEATURES = [
  "2000 kredit (~5 paper)",
  "Diskusi tak terbatas",
  "Export Word & PDF",
]

export default function GetStartedPage() {
  const router = useRouter()
  const { completeOnboarding } = useOnboardingStatus()

  const handleSkip = async () => {
    await completeOnboarding()
    router.push("/chat")
  }

  const handleUpgradeBPP = async () => {
    await completeOnboarding()
    router.push("/checkout/bpp")
  }

  const handleUpgradePRO = async () => {
    await completeOnboarding()
    router.push("/checkout/pro")
  }

  return (
    <div className="text-center space-y-8">
      {/* Welcome Header */}
      <div className="space-y-2">
        <div className="text-4xl">🎉</div>
        <h1 className="text-2xl font-semibold">
          Selamat datang di
          <br />
          Makalah AI!
        </h1>
      </div>

      {/* Current Tier Card */}
      <div className="bg-card border border-border rounded-xl p-6 text-left">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="font-medium">Kamu sekarang di paket GRATIS</span>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {GRATIS_FEATURES.map((feature, i) => (
            <li key={i}>• {feature}</li>
          ))}
        </ul>
      </div>

      {/* Upgrade Section */}
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          ──── Mau lebih? Upgrade sekarang ────
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* BPP Card */}
          <div className="bg-card border border-border rounded-xl p-5 text-left">
            <h3 className="font-semibold">BAYAR PER PAPER</h3>
            <p className="text-lg font-bold mt-1">Rp 80.000</p>
            <div className="border-t border-border my-3" />
            <ul className="space-y-1 text-sm text-muted-foreground mb-4">
              {BPP_FEATURES.map((feature, i) => (
                <li key={i}>• {feature}</li>
              ))}
            </ul>
            <button
              onClick={handleUpgradeBPP}
              className="w-full onboarding-btn-primary py-2.5 rounded-lg text-sm font-medium"
            >
              Beli Kredit
            </button>
          </div>

          {/* PRO Card */}
          <div className="bg-card border border-border rounded-xl p-5 text-left">
            <h3 className="font-semibold">PRO</h3>
            <p className="text-lg font-bold mt-1">
              Rp 200.000 <span className="text-sm font-normal text-muted-foreground">/bulan</span>
            </p>
            <div className="border-t border-border my-3" />
            <ul className="space-y-1 text-sm text-muted-foreground mb-4">
              {PRO_FEATURES.map((feature, i) => (
                <li key={i}>• {feature}</li>
              ))}
            </ul>
            <button
              disabled
              onClick={handleUpgradePRO}
              className="w-full onboarding-btn-disabled py-2.5 rounded-lg text-sm font-medium"
            >
              Segera Hadir
            </button>
          </div>
        </div>
      </div>

      {/* Skip Link */}
      <button
        onClick={handleSkip}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Nanti saja - Langsung Mulai →
      </button>
    </div>
  )
}
