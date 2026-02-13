"use client"

import { useEffect, useRef, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useSession, authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { InfoCircle, Xmark } from "iconoir-react"

interface LinkedAccount {
  id: string
  provider: string
}

export function AccountLinkingNotice() {
  const { data: session, isPending: isSessionLoading } = useSession()
  const { user: convexUser, isLoading: isConvexLoading } = useCurrentUser()
  const markSeen = useMutation(api.users.markLinkingNoticeSeen)
  const hasShownRef = useRef(false)
  const [accounts, setAccounts] = useState<LinkedAccount[] | null>(null)

  // Fetch linked accounts once session is ready
  useEffect(() => {
    if (isSessionLoading || !session) return

    let cancelled = false
    async function fetchAccounts() {
      try {
        const result = await authClient.listAccounts()
        if (!cancelled) {
          setAccounts((result.data ?? []) as LinkedAccount[])
        }
      } catch (err) {
        console.error("[AccountLinkingNotice] listAccounts failed:", err)
      }
    }

    fetchAccounts()
    return () => { cancelled = true }
  }, [isSessionLoading, session])

  useEffect(() => {
    // Guard: wait for all data sources to load
    if (isSessionLoading || isConvexLoading || accounts === null) return
    if (!session || !convexUser) return

    // Guard: only show once per session
    if (hasShownRef.current) return

    // Guard: already seen
    if (convexUser.hasSeenLinkingNotice) return

    // Detection: user has BOTH password (credential) and external OAuth account
    const hasPassword = accounts.some((a) => a.provider === "credential")
    const hasOAuth = accounts.some((a) => a.provider !== "credential")

    if (!hasPassword || !hasOAuth) return

    hasShownRef.current = true

    const toastId = toast(
      <div className="flex gap-3 w-full">
        <InfoCircle className="h-4 w-4 text-info shrink-0 mt-0.5" />
        <div className="space-y-1 flex-1">
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
        <button
          type="button"
          onClick={() => toast.dismiss(toastId)}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors -mt-0.5 -mr-1"
          aria-label="Tutup"
        >
          <Xmark className="h-4 w-4" />
        </button>
      </div>,
      {
        duration: Infinity,
        className: "!border !border-info/40",
        onDismiss: () => {
          markSeen().catch(console.error)
        },
      }
    )
  }, [isSessionLoading, isConvexLoading, session, convexUser, accounts, markSeen])

  return null
}
