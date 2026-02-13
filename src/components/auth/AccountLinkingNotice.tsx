"use client"

import { useEffect, useRef } from "react"
import { useUser } from "@clerk/nextjs"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { toast } from "sonner"
import { InfoCircle } from "iconoir-react"

export function AccountLinkingNotice() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser()
  const { user: convexUser, isLoading: isConvexLoading } = useCurrentUser()
  const markSeen = useMutation(api.users.markLinkingNoticeSeen)
  const hasShownRef = useRef(false)

  useEffect(() => {
    // Guard: wait for both data sources to load
    if (!isClerkLoaded || isConvexLoading) return
    if (!clerkUser || !convexUser) return

    // Guard: only show once per session
    if (hasShownRef.current) return

    // Guard: already seen
    if (convexUser.hasSeenLinkingNotice) return

    // Detection: user has BOTH password and external OAuth account
    const hasPassword = clerkUser.passwordEnabled
    const hasOAuth = clerkUser.externalAccounts.length > 0

    if (!hasPassword || !hasOAuth) return

    hasShownRef.current = true

    toast(
      <div className="flex gap-3">
        <InfoCircle className="h-4 w-4 text-info shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-sans text-xs font-semibold">
            Akun terhubung dengan Google
          </p>
          <p className="font-sans text-xs text-muted-foreground leading-relaxed">
            Anda sekarang bisa masuk pakai Google atau password — keduanya
            terhubung ke akun yang sama. Kelola di{" "}
            <a href="/settings" className="underline text-info hover:text-info/80">
              Pengaturan Profil
            </a>.
          </p>
        </div>
      </div>,
      {
        duration: Infinity,
        className: "!border !border-info/40",
        onDismiss: () => {
          markSeen().catch(console.error)
        },
      }
    )
  }, [isClerkLoaded, isConvexLoading, clerkUser, convexUser, markSeen])

  return null
}
