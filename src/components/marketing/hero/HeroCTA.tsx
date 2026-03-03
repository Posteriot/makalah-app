"use client"

import { useSession } from "@/lib/auth-client"
import { useWaitlistMode } from "@/lib/hooks/useWaitlistMode"
import { resolveChatEntryHref } from "@/lib/utils/chatEntryRouting"
import { SectionCTA } from "@/components/ui/section-cta"

type HeroCTAProps = {
  ctaText?: string
}

export function HeroCTA({ ctaText = "AYO MULAI" }: HeroCTAProps) {
  const { data: session, isPending: isSessionPending } = useSession()
  const { isWaitlistMode, subtitle: waitlistSubtitle, ctaText: waitlistCtaText } = useWaitlistMode()

  const isSignedIn = !!session
  const chatEntryHref = resolveChatEntryHref(isSignedIn)

  const getHref = (): string => {
    if (isWaitlistMode) return "/waitinglist"
    return chatEntryHref
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
        <SectionCTA
          href={isLoading ? undefined : getHref()}
          target="_blank"
          rel="noopener noreferrer"
          isLoading={isLoading}
        >
          {isWaitlistMode ? waitlistCtaText : ctaText}
        </SectionCTA>
      </div>
    </div>
  )
}
