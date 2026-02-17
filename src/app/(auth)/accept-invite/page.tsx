"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { AuthWideCard } from "@/components/auth/AuthWideCard"
import { RefreshDouble, WarningCircle, CheckCircle } from "iconoir-react"
import Link from "next/link"

type PageState = "validating" | "valid" | "error"

export default function AcceptInvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [state, setState] = useState<PageState>("validating")
  const [error, setError] = useState<string | null>(null)

  // Validate token via Convex query (real-time)
  const tokenResult = useQuery(
    api.waitlist.getByToken,
    token ? { token } : "skip"
  )

  useEffect(() => {
    if (!token) {
      setState("error")
      setError("Token undangan tidak ditemukan.")
      return
    }

    if (tokenResult === undefined) return // Still loading

    if (!tokenResult.valid) {
      setState("error")
      setError(tokenResult.error || "Token tidak valid")
      return
    }

    // Token valid — redirect to sign-up with invite token
    setState("valid")
    setTimeout(() => {
      router.push(`/sign-up?invite=${encodeURIComponent(token)}`)
    }, 1500)
  }, [token, tokenResult, router])

  if (!token) {
    return (
      <AuthWideCard
        title="Link Tidak Valid"
        subtitle="Token undangan tidak ditemukan."
      >
        <div className="text-center space-y-4 w-full">
          <WarningCircle className="h-12 w-12 text-destructive mx-auto" />
          <Link
            href="/"
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            Kembali ke beranda
          </Link>
        </div>
      </AuthWideCard>
    )
  }

  const titles: Record<PageState, { title: string; subtitle: string }> = {
    validating: {
      title: "Memvalidasi Undangan",
      subtitle: "Memeriksa token undangan...",
    },
    valid: {
      title: "Undangan Valid!",
      subtitle: "Mengalihkan ke halaman pendaftaran...",
    },
    error: {
      title: "Undangan Tidak Valid",
      subtitle: error || "Terjadi kesalahan",
    },
  }

  const { title, subtitle } = titles[state]

  return (
    <AuthWideCard title={title} subtitle={subtitle}>
      <div className="text-center space-y-4 w-full">
        {state === "validating" && (
          <RefreshDouble className="h-12 w-12 text-primary mx-auto animate-spin" />
        )}

        {state === "valid" && (
          <>
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
            <p className="text-xs font-mono text-muted-foreground">
              Halo, {tokenResult?.firstName}! Mengalihkan ke halaman pendaftaran...
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <WarningCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-xs font-mono text-muted-foreground">
              Hubungi administrator untuk mendapatkan undangan baru.
            </p>
            <Link
              href="/"
              className="text-xs font-mono text-foreground hover:underline"
            >
              Kembali ke beranda
            </Link>
          </>
        )}
      </div>
    </AuthWideCard>
  )
}
