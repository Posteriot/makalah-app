"use client"

import { useSession } from "@/lib/auth-client"
import { useOnboardingStatus } from "@/lib/hooks/useOnboardingStatus"
import { useWaitlistMode } from "@/lib/hooks/useWaitlistMode"
import { SectionCTA } from "@/components/ui/section-cta"

export function HeroCTA() {
  const { data: session, isPending: isSessionPending } = useSession()
  const isSignedIn = !!session
  const { hasCompletedOnboarding, isLoading: isOnboardingLoading } = useOnboardingStatus()
  const { isWaitlistMode } = useWaitlistMode()

  const getHref = (): string => {
    if (isWaitlistMode) return "/waitinglist"
    if (!isSignedIn) return "/sign-up"
    if (hasCompletedOnboarding) return "/chat"
    return "/get-started"
  }

  const isLoading = isSessionPending || (!isWaitlistMode && isSignedIn && isOnboardingLoading)

  return (
    <div className="flex flex-col items-center lg:items-start w-full mt-4 gap-3">
      {isWaitlistMode && (
        <p className="text-interface text-base text-slate-50 text-center lg:text-left max-w-md">
          Jadilah 100 orang pertama pengguna Makalah AI. Daftarkan email, lalu tunggu undangan kami
        </p>
      )}
      <div className="flex justify-center lg:justify-start w-full">
        <SectionCTA href={getHref()} isLoading={isLoading}>
          {isWaitlistMode ? "IKUT DAFTAR TUNGGU" : "AYO MULAI"}
        </SectionCTA>
      </div>
    </div>
  )
}
