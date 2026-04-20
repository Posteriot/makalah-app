"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Lock, RefreshDouble } from "iconoir-react"
import { signIn } from "@/lib/auth-client"
import {
  getPending2FA,
  clearPending2FA,
  sendOtp,
  verifyOtp,
  verifyBackupCode,
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
    "/"
  )
  const signInHref = redirectTarget
    ? `/sign-in?${new URLSearchParams({ redirect_url: redirectTarget }).toString()}`
    : "/sign-in"

  const OTP_LENGTH = 6
  type VerificationMethod = "otp" | "backup"
  const [method, setMethod] = useState<VerificationMethod>("otp")
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""))
  const [code, setCode] = useState("")
  const [backupCode, setBackupCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
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

  function resetBackupInput() {
    setBackupCode("")
  }

  function handleMethodChange(nextMethod: VerificationMethod) {
    if (method === nextMethod) return
    setMethod(nextMethod)
    setError("")
    setIsLoading(false)
    if (nextMethod === "otp") {
      resetBackupInput()
      setTimeout(() => boxRefs.current[0]?.focus(), 0)
      return
    }
    setDigits(Array(OTP_LENGTH).fill(""))
    setCode("")
  }

  // Redirect if no pending 2FA
  useEffect(() => {
    const pending = getPending2FA()
    if (!pending) {
      router.replace(signInHref)
    }
  }, [router, signInHref])

  // Reset submit guard when page is restored from bfcache (browser back button)
  useEffect(() => {
    const handlePageShow = () => { isSubmitting.current = false }
    window.addEventListener("pageshow", handlePageShow)
    return () => window.removeEventListener("pageshow", handlePageShow)
  }, [])

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

  async function continueSignInWithBypassToken(
    pending: { email: string; password: string; redirectUrl?: string },
    bypassTokenValue: string
  ) {
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
      return false
    }

    clearPending2FA()
    const data = signInResult.data as Record<string, unknown>
    if (data?.redirect && data?.token) {
      const url = new URL(data.url as string)
      url.searchParams.set("ott", data.token as string)
      window.location.href = url.toString()
      return true
    }

    window.location.href = callbackURL
    return true
  }

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

      const isSignInSuccess = await continueSignInWithBypassToken(
        pending,
        otpResult.bypassToken
      )
      if (!isSignInSuccess) {
        resetOtpBoxes()
        setIsLoading(false)
        isSubmitting.current = false
        return
      }
    } catch {
      toast.error("Terjadi kesalahan. Silakan coba lagi.")
      resetOtpBoxes()
      setIsLoading(false)
      isSubmitting.current = false
    }
  }

  async function submitBackupCode(inputCode: string) {
    if (isSubmitting.current) return
    isSubmitting.current = true
    setError("")

    const pending = getPending2FA()
    if (!pending) {
      router.replace(signInHref)
      return
    }

    if (!inputCode) {
      setError("Masukkan backup code.")
      isSubmitting.current = false
      return
    }

    setIsLoading(true)
    try {
      const backupResult = await verifyBackupCode(pending.email, inputCode)
      if (!backupResult.status || !backupResult.bypassToken) {
        setError(backupResult.error ?? "Backup code tidak valid.")
        resetBackupInput()
        setIsLoading(false)
        isSubmitting.current = false
        return
      }

      const isSignInSuccess = await continueSignInWithBypassToken(
        pending,
        backupResult.bypassToken
      )
      if (!isSignInSuccess) {
        resetBackupInput()
        setIsLoading(false)
        isSubmitting.current = false
        return
      }
    } catch {
      toast.error("Terjadi kesalahan. Silakan coba lagi.")
      resetBackupInput()
      setIsLoading(false)
      isSubmitting.current = false
    }
  }

  function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (method === "otp") {
      submitOtp(code.trim())
      return
    }
    submitBackupCode(backupCode.trim())
  }

  function handleCancel() {
    clearPending2FA()
    router.replace(signInHref)
  }

  return (
    <AuthWideCard
      title="Verifikasi 2FA"
      subtitle="Masukkan kode verifikasi 6 digit dari email. Jika email OTP tidak tersedia, gunakan backup code."
      showBackButton
      onBackClick={handleCancel}
    >
      <div className="w-full space-y-5">
        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <span className="auth-icon-badge">
              <Lock className="h-6 w-6" />
            </span>
            {isSending && method === "otp" ? (
              <p className="auth-link text-center">
                Mengirim kode verifikasi...
              </p>
            ) : null}
          </div>

          <div className="w-full max-w-[22rem] mx-auto space-y-5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleMethodChange("otp")}
                aria-pressed={method === "otp"}
                className={`rounded-badge border px-3 py-2 text-xs font-mono transition-colors ${
                  method === "otp"
                    ? "border-foreground text-foreground"
                    : "border-muted-foreground/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                Kode OTP
              </button>
              <button
                type="button"
                onClick={() => handleMethodChange("backup")}
                aria-pressed={method === "backup"}
                className={`rounded-badge border px-3 py-2 text-xs font-mono transition-colors ${
                  method === "backup"
                    ? "border-foreground text-foreground"
                    : "border-muted-foreground/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                Backup code
              </button>
            </div>

            <div>
              {method === "otp" ? (
                <>
                  <label htmlFor="otp-digit-0" className="sr-only">Kode OTP</label>
                  <div className="grid grid-cols-6 gap-2.5" onPaste={handleBoxPaste}>
                    {digits.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-digit-${i}`}
                        aria-label={`Digit ${i + 1} dari 6`}
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
                        className="auth-otp-input"
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <label className="sr-only" htmlFor="backup-code-input">Backup code</label>
                  <input
                    id="backup-code-input"
                    type="text"
                    placeholder="Contoh: DX1va-73eL5"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value)}
                    className="h-11 w-full rounded-badge border border-muted-foreground/40 bg-transparent px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
                  />
                </>
              )}
            </div>

            {error && (
              <div className="auth-feedback-error" role="alert">
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (method === "otp" ? code.length !== 6 : backupCode.trim().length === 0)}
              className="group auth-cta relative mt-2 inline-flex w-full items-center justify-center gap-2 overflow-hidden px-4 auth-focus-ring disabled:cursor-not-allowed"
            >
              <span
                className="auth-btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                aria-hidden="true"
              />
              <span className="relative z-10 inline-flex items-center gap-2">
                {isLoading ? (
                  <RefreshDouble className="h-4 w-4 animate-spin" />
                ) : null}
                VERIFIKASI
              </span>
            </button>

            {method === "otp" ? (
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isSending}
                  className="auth-link disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resendCooldown > 0
                    ? `Kirim ulang (${resendCooldown}s)`
                    : "Kirim ulang kode"}
                </button>
              </div>
            ) : null}
          </div>
        </form>

        <button
          type="button"
          onClick={handleCancel}
          className="auth-link w-full text-center"
        >
          Batalkan dan kembali ke halaman masuk
        </button>
      </div>
    </AuthWideCard>
  )
}
