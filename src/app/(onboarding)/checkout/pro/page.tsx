"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { Crown, Tools } from "iconoir-react"
import { useOnboardingStatus } from "@/lib/hooks/useOnboardingStatus"

const PRO_FEATURES = [
  "2000 kredit per bulan",
  "Menyusun sampai 5 paper (~75 halaman)",
  "Full 13 tahap workflow",
  "Draft hingga paper utuh",
  "Diskusi tak terbatas",
  "Export Word & PDF",
]

export default function CheckoutPROPage() {
  const { hasCompletedOnboarding, completeOnboarding } = useOnboardingStatus()
  const onboardingCompletedRef = useRef(false)

  // Auto-complete onboarding when user lands on checkout page
  // This handles the case where user came from /pricing → /sign-up?redirect=/checkout/pro
  useEffect(() => {
    if (!hasCompletedOnboarding && !onboardingCompletedRef.current) {
      onboardingCompletedRef.current = true
      completeOnboarding()
    }
  }, [hasCompletedOnboarding, completeOnboarding])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <Crown className="h-6 w-6 text-amber-500" />
          <h1 className="text-xl font-semibold">Langganan PRO</h1>
        </div>
        <p className="text-2xl font-bold">Rp 200.000 / bulan</p>
      </div>

      {/* Features Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-medium mb-4">YANG KAMU DAPAT:</h2>
        <ul className="space-y-2">
          {PRO_FEATURES.map((feature, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-6 text-center">
        <Tools className="h-8 w-8 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
        <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
          SEGERA HADIR
        </h3>
        <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
          Fitur langganan PRO sedang dalam pengembangan.
          <br />
          Sementara, kamu bisa gunakan paket Bayar Per Paper.
        </p>
        <Link
          href="/checkout/bpp"
          className="inline-block border border-amber-600 dark:border-amber-400 text-amber-900 dark:text-amber-100 px-6 py-2 rounded-lg text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
        >
          Coba Bayar Per Paper
        </Link>
      </div>
    </div>
  )
}
