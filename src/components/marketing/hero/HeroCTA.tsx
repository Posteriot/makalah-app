"use client"

import { useSession } from "@/lib/auth-client"
import { useWaitlistMode } from "@/lib/hooks/useWaitlistMode"
import { SectionCTA } from "@/components/ui/section-cta"

type HeroCTAProps = {
  ctaText?: string
  signedOutHref?: string
}

function toSafeSignedOutHref(path?: string): string {
  if (!path) return "/sign-up"
  if (!path.startsWith("/") || path.startsWith("//")) return "/sign-up"
  return path
}

export function HeroCTA({ ctaText = "AYO MULAI", signedOutHref = "/sign-up" }: HeroCTAProps) {
  const { data: session, isPending: isSessionPending } = useSession()
  const { isWaitlistMode, subtitle: waitlistSubtitle, ctaText: waitlistCtaText } = useWaitlistMode()

  const isSignedIn = !!session
  const resolvedSignedOutHref = toSafeSignedOutHref(signedOutHref)

  const getHref = (): string => {
    if (isWaitlistMode) return "/waitinglist"
    if (!isSignedIn) return resolvedSignedOutHref
    return "/chat"
  }

  const isLoading = isSessionPending

  return (
    <div className="flex flex-col items-center lg:items-start w-full mt-4 gap-3">
      {isWaitlistMode && (
        <p className="text-interface text-base text-foreground text-center lg:text-left max-w-md">
          {waitlistSubtitle}
        </p>
      )}
      <div
        className={`flex w-full justify-center lg:justify-start ${
          isWaitlistMode ? "mt-3 md:mt-4" : ""
        }`}
      >
        <SectionCTA href={isLoading ? undefined : getHref()} isLoading={isLoading}>
          {isWaitlistMode ? waitlistCtaText : ctaText}
        </SectionCTA>
      </div>
    </div>
  )
}
