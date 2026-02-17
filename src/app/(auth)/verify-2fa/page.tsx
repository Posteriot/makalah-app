"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Lock, RefreshDouble, Key } from "iconoir-react"
import { signIn } from "@/lib/auth-client"
import {
  getPending2FA,
  clearPending2FA,
  sendOtp,
  verifyOtp,
} from "@/lib/auth-2fa"
import { AuthWideCard } from "@/components/auth/AuthWideCard"
import { getRedirectUrl } from "@/lib/utils/redirectAfterAuth"

export default function Verify2FAPageWrapper() {
  return (
    <Suspense>
      <Verify2FAPage />
    </Suspense>
  )
}

function Verify2FAPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam =
    searchParams.get("redirect_url") ?? searchParams.get("redirect")
  const pendingRedirect = getPending2FA()?.redirectUrl ?? null
  const redirectTarget = redirectParam ?? pendingRedirect
  const callbackURL = getRedirectUrl(
    redirectTarget
      ? new URLSearchParams({ redirect_url: redirectTarget })
      : searchParams,
    "/chat"
  )
  const signInHref = redirectTarget
    ? `/sign-in?${new URLSearchParams({ redirect_url: redirectTarget }).toString()}`
    : "/sign-in"

  const OTP_LENGTH = 6
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""))
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const [mode, setMode] = useState<"otp" | "backup">("otp")
  const hasSentInitialOtp = useRef(false)
  const boxRefs = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null))

  function updateDigits(newDigits: string[]) {
    setDigits(newDigits)
    setCode(newDigits.join(""))
    if (error) setError("")
  }

  function handleBoxChange(index: number, value: string) {
    // Only allow single digit
    const digit = value.replace(/\D/g, "").slice(-1)
    const newDigits = [...digits]
    newDigits[index] = digit
    updateDigits(newDigits)

    // Auto-submit when all 6 digits filled
    const fullCode = newDigits.join("")
    if (fullCode.length === OTP_LENGTH) {
      submitOtp(fullCode)
      return
    }

    // Auto-focus next box
    if (digit && index < OTP_LENGTH - 1) {
      boxRefs.current[index + 1]?.focus()
    }
  }

  function handleBoxKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Empty box + backspace → move to previous
        const newDigits = [...digits]
        newDigits[index - 1] = ""
        updateDigits(newDigits)
        boxRefs.current[index - 1]?.focus()
        e.preventDefault()
      } else {
        // Clear current box
        const newDigits = [...digits]
        newDigits[index] = ""
        updateDigits(newDigits)
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      boxRefs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      boxRefs.current[index + 1]?.focus()
    }
  }

  function handleBoxPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH)
    if (!pasted) return
    const newDigits = Array(OTP_LENGTH).fill("")
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i]
    }
    updateDigits(newDigits)

    // Auto-submit when all 6 digits pasted
    const fullCode = newDigits.join("")
    if (fullCode.length === OTP_LENGTH) {
      submitOtp(fullCode)
      return
    }

    // Focus last filled box or the next empty one
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1)
    boxRefs.current[focusIndex]?.focus()
  }

  function resetOtpBoxes() {
    setDigits(Array(OTP_LENGTH).fill(""))
    setCode("")
    boxRefs.current[0]?.focus()
  }

  // Redirect if no pending 2FA
  useEffect(() => {
    const pending = getPending2FA()
    if (!pending) {
      router.replace(signInHref)
    }
  }, [router, signInHref])

  const startResendCooldown = useCallback(() => {
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  // Auto-send OTP on mount
  useEffect(() => {
    if (hasSentInitialOtp.current) return
    hasSentInitialOtp.current = true

    const pending = getPending2FA()
    if (!pending) return

    setIsSending(true)
    sendOtp(pending.email)
      .then((result) => {
        if (!result.status && result.error) {
          setError(result.error)
        } else {
          startResendCooldown()
        }
      })
      .finally(() => setIsSending(false))
  }, [startResendCooldown])

  async function handleResendOtp() {
    const pending = getPending2FA()
    if (!pending || resendCooldown > 0) return

    setIsSending(true)
    setError("")
    try {
      const result = await sendOtp(pending.email)
      if (!result.status && result.error) {
        setError(result.error)
      } else {
        toast.success("Kode OTP baru sudah dikirim ke email kamu.")
        startResendCooldown()
      }
    } finally {
      setIsSending(false)
    }
  }

  const isSubmitting = useRef(false)

  async function submitOtp(otpCode: string) {
    if (isSubmitting.current) return
    isSubmitting.current = true
    setError("")

    const pending = getPending2FA()
    if (!pending) {
      router.replace(signInHref)
      return
    }

    if (otpCode.length !== 6) {
      setError("Masukkan 6 digit kode verifikasi.")
      isSubmitting.current = false
      return
    }

    setIsLoading(true)
    try {
      // Step 1: Verify OTP via custom endpoint → get bypass token
      const otpResult = await verifyOtp(pending.email, otpCode)

      if (!otpResult.status || !otpResult.bypassToken) {
        setError(otpResult.error ?? "Kode tidak valid.")
        resetOtpBoxes()
        setIsLoading(false)
        isSubmitting.current = false
        return
      }

      // Step 2: Re-sign-in with bypass token header
      const bypassTokenValue = otpResult.bypassToken
      const signInResult = await signIn.email(
        {
          email: pending.email,
          password: pending.password,
          callbackURL,
        },
        {
          onRequest(ctx) {
            ctx.headers.set("X-2FA-Bypass-Token", bypassTokenValue)
            return ctx
          },
        }
      )

      if (signInResult.error) {
        setError(
          signInResult.error.message ?? "Gagal masuk. Silakan coba lagi."
        )
        resetOtpBoxes()
        setIsLoading(false)
        isSubmitting.current = false
        return
      }

      // Step 3: Handle OTT redirect (same as normal sign-in)
      clearPending2FA()
      const data = signInResult.data as Record<string, unknown>
      if (data?.redirect && data?.token) {
        const url = new URL(data.url as string)
        url.searchParams.set("ott", data.token as string)
        window.location.href = url.toString()
        return
      }

      // Non cross-domain fallback
      window.location.href = callbackURL
    } catch {
      toast.error("Terjadi kesalahan. Silakan coba lagi.")
      resetOtpBoxes()
      setIsLoading(false)
      isSubmitting.current = false
    }
  }

  function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    submitOtp(code.trim())
  }

  async function handleBackupCode(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    const pending = getPending2FA()
    if (!pending) {
      router.replace(signInHref)
      return
    }

    const trimmedCode = code.trim()
    if (!trimmedCode) {
      setError("Masukkan backup code.")
      return
    }

    setIsLoading(true)
    try {
      // Use BetterAuth's built-in backup code verification via twoFactor.verifyBackupCode
      // This requires a sign-in first to get trustDevice token, but since cross-domain
      // is broken for this flow, we use the bypass approach with backup code as well.
      // For now, backup codes go through the same OTP verify endpoint pattern.
      // TODO: Implement backup code verification if needed
      setError("Backup code belum didukung. Gunakan kode OTP dari email.")
      setIsLoading(false)
    } catch {
      toast.error("Terjadi kesalahan.")
      setIsLoading(false)
    }
  }

  function handleCancel() {
    clearPending2FA()
    router.replace(signInHref)
  }

  return (
    <AuthWideCard
      title="Verifikasi 2FA"
      subtitle="Masukkan kode verifikasi 6 digit yang terkirim ke email kamu. Jika tidak terdapat di inbox, periksa folder spam."
      showBackButton
      onBackClick={handleCancel}
    >
      <div className="w-full space-y-5">
        {mode === "otp" ? (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 rounded-action bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <Lock className="h-6 w-6 text-foreground" />
              </div>
              {isSending ? (
                <p className="text-xs font-mono text-muted-foreground text-center">
                  Mengirim kode verifikasi...
                </p>
              ) : null}
            </div>

            <div className="w-full max-w-[22rem] mx-auto space-y-5">
              <div>
                <label className="sr-only">Kode OTP</label>
                <div className="grid grid-cols-6 gap-2.5" onPaste={handleBoxPaste}>
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { boxRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleBoxChange(i, e.target.value)}
                      onKeyDown={(e) => handleBoxKeyDown(i, e)}
                      onFocus={(e) => e.target.select()}
                      autoFocus={i === 0}
                      autoComplete={i === 0 ? "one-time-code" : "off"}
                      className="h-12 w-full rounded-action border border-slate-300 dark:border-slate-600 bg-background dark:bg-slate-900 font-mono text-xl text-center text-foreground dark:text-slate-100 transition-all focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 dark:focus:ring-sky-500/40 dark:focus:border-sky-500"
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-action border border-destructive/40 bg-destructive/60 px-3 py-2 text-xs text-slate-100 font-mono">
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="group relative overflow-hidden inline-flex w-full items-center justify-center gap-2 rounded-action h-10 px-4 mt-2 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span
                  className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                  aria-hidden="true"
                />
                <span className="relative z-10 inline-flex items-center gap-2">
                  {isLoading ? (
                    <RefreshDouble className="h-4 w-4 animate-spin" />
                  ) : null}
                  VERIFIKASI
                </span>
              </button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isSending}
                  className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? `Kirim ulang (${resendCooldown}s)`
                    : "Kirim ulang kode"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetOtpBoxes()
                    setError("")
                    setMode("backup")
                  }}
                  className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                  Gunakan backup code
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBackupCode} className="space-y-4">
            <div className="flex flex-col items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-action bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <Key className="h-6 w-6 text-foreground" />
              </div>
              <p className="text-xs font-mono text-muted-foreground text-center">
                Masukkan salah satu backup code yang kamu simpan.
              </p>
            </div>

            <div>
              <label htmlFor="backup-code" className="sr-only">
                Backup Code
              </label>
              <input
                id="backup-code"
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  if (error) setError("")
                }}
                placeholder="Backup code"
                autoFocus
                className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 font-mono text-sm text-foreground dark:text-slate-100 placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
              />
            </div>

            {error && (
              <div className="rounded-action border border-destructive/40 bg-destructive/60 px-3 py-2 text-xs text-slate-100 font-mono">
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !code.trim()}
              className="group relative overflow-hidden inline-flex w-full items-center justify-center gap-2 rounded-action h-10 px-4 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span
                className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                aria-hidden="true"
              />
              <span className="relative z-10 inline-flex items-center gap-2">
                {isLoading ? (
                  <RefreshDouble className="h-4 w-4 animate-spin" />
                ) : null}
                VERIFIKASI
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                resetOtpBoxes()
                setError("")
                setMode("otp")
              }}
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors w-full text-center"
            >
              Kembali ke kode OTP
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={handleCancel}
          className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors w-full text-center"
        >
          Batalkan dan kembali ke halaman masuk
        </button>
      </div>
    </AuthWideCard>
  )
}
