"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "@/lib/auth-client"
import { AuthWideCard } from "@/components/auth/AuthWideCard"
import { toast } from "sonner"
import { RefreshDouble } from "iconoir-react"
import { getRedirectUrl } from "@/lib/utils/redirectAfterAuth"

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const callbackURL = getRedirectUrl(searchParams, "/dashboard")

  async function handleGoogleSignIn() {
    setIsLoading(true)
    try {
      await signIn.social({
        provider: "google",
        callbackURL,
      })
    } catch {
      toast.error("Gagal masuk dengan Google. Silakan coba lagi.")
      setIsLoading(false)
    }
  }

  return (
    <AuthWideCard
      title="Admin Login"
      subtitle="Halaman ini khusus untuk administrator"
      showBackButton
      onBackClick={() => router.back()}
    >
      <div className="w-full space-y-5">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="group relative overflow-hidden inline-flex w-full items-center justify-center gap-2 rounded-action h-10 px-4 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span
            className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
            aria-hidden="true"
          />
          <span className="relative z-10 inline-flex items-center gap-2">
            {isLoading ? <RefreshDouble className="h-4 w-4 animate-spin" /> : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            MASUK DENGAN GOOGLE
          </span>
        </button>

        <p className="text-xs text-center text-muted-foreground font-mono">
          Jika kamu bukan administrator, silakan kembali ke{" "}
          <button
            type="button"
            onClick={() => router.push("/sign-in")}
            className="text-foreground hover:underline"
          >
            halaman masuk
          </button>
          .
        </p>
      </div>
    </AuthWideCard>
  )
}
