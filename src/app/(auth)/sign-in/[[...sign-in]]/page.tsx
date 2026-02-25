"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { Eye, EyeClosed, Mail, Lock, RefreshDouble } from "iconoir-react"
import { signIn, authClient } from "@/lib/auth-client"
import { setPending2FA } from "@/lib/auth-2fa"
import { AuthWideCard } from "@/components/auth/AuthWideCard"
import { TurnstileWidget } from "@/components/auth/TurnstileWidget"
import { getRedirectUrl } from "@/lib/utils/redirectAfterAuth"
import { useWaitlistMode } from "@/lib/hooks/useWaitlistMode"

type SignInMode =
  | "sign-in"
  | "magic-link"
  | "forgot-password"
  | "reset-password"
  | "magic-link-sent"
  | "reset-sent"
  | "reset-success"

type RecoveryIntent = "magic-link" | "forgot-password"

type RecoveryPrecheckResponse =
  | { ok: true; status: "registered" }
  | {
      ok: false
      code:
        | "EMAIL_NOT_REGISTERED"
        | "RATE_LIMITED"
        | "CAPTCHA_FAILED"
        | "SERVICE_UNAVAILABLE"
        | "INVALID_REQUEST"
    }

type RecoveryPrecheckErrorCode = Extract<
  RecoveryPrecheckResponse,
  { ok: false }
>["code"]
const RECOVERY_PRECHECK_ERROR_CODES: RecoveryPrecheckErrorCode[] = [
  "EMAIL_NOT_REGISTERED",
  "RATE_LIMITED",
  "CAPTCHA_FAILED",
  "SERVICE_UNAVAILABLE",
  "INVALID_REQUEST",
]

const SIGNUP_DISABLED_ERROR_CODE = "signup_disabled"
const SIGNUP_DISABLED_ERROR_MESSAGE =
  "Akun Google ini belum terdaftar di Makalah."

function getOAuthErrorMessage(errorCode: string | null) {
  if (errorCode === SIGNUP_DISABLED_ERROR_CODE) {
    return SIGNUP_DISABLED_ERROR_MESSAGE
  }
  return ""
}

export default function SignInPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isWaitlistMode } = useWaitlistMode()
  const verifiedEmail = searchParams.get("verified_email")
  const resetToken = searchParams.get("token")
  const oauthErrorCode = searchParams.get("error")
  const redirectParam =
    searchParams.get("redirect_url") ?? searchParams.get("redirect")
  const signUpHref = redirectParam
    ? `/sign-up?${new URLSearchParams({ redirect_url: redirectParam }).toString()}`
    : "/sign-up"
  const verify2FAHref = redirectParam
    ? `/verify-2fa?${new URLSearchParams({ redirect_url: redirectParam }).toString()}`
    : "/verify-2fa"
  const callbackURL = getRedirectUrl(searchParams, "/")
  const { resolvedTheme } = useTheme()
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""
  const turnstileTheme = resolvedTheme === "light" ? "light" : "dark"
  const requiresRecoveryCaptcha = Boolean(turnstileSiteKey)
  const initialOAuthErrorMessage =
    !resetToken ? getOAuthErrorMessage(oauthErrorCode) : ""
  const initialOAuthErrorCode =
    initialOAuthErrorMessage && oauthErrorCode
      ? oauthErrorCode
      : null

  const [mode, setMode] = useState<SignInMode>(() =>
    resetToken ? "reset-password" : "sign-in"
  )
  const [email, setEmail] = useState(verifiedEmail ?? "")
  const [password, setPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(initialOAuthErrorMessage)
  const [errorCode, setErrorCode] = useState<string | null>(initialOAuthErrorCode)
  const [magicLinkCaptchaToken, setMagicLinkCaptchaToken] = useState<string | null>(null)
  const [forgotPasswordCaptchaToken, setForgotPasswordCaptchaToken] = useState<string | null>(null)
  const [magicLinkCaptchaResetCounter, setMagicLinkCaptchaResetCounter] = useState(0)
  const [forgotPasswordCaptchaResetCounter, setForgotPasswordCaptchaResetCounter] = useState(0)
  const [isClientReady, setIsClientReady] = useState(false)

  useEffect(() => {
    setIsClientReady(true)
  }, [])

  useEffect(() => {
    if (verifiedEmail) {
      toast.success("Email berhasil diverifikasi! Silakan masuk.")
      const url = new URL(window.location.href)
      url.searchParams.delete("verified_email")
      window.history.replaceState({}, "", url.toString())
    }
  }, [verifiedEmail])

  function clearError() {
    if (error || errorCode) {
      setError("")
      setErrorCode(null)
    }
  }

  const resetMagicLinkCaptcha = useCallback(() => {
    setMagicLinkCaptchaToken(null)
    setMagicLinkCaptchaResetCounter((counter) => counter + 1)
  }, [])

  const resetForgotPasswordCaptcha = useCallback(() => {
    setForgotPasswordCaptchaToken(null)
    setForgotPasswordCaptchaResetCounter((counter) => counter + 1)
  }, [])

  async function runRecoveryPrecheck(
    inputEmail: string,
    intent: RecoveryIntent,
    captchaToken: string | null
  ): Promise<RecoveryPrecheckResponse> {
    try {
      const response = await fetch("/api/auth/email-recovery-precheck", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: inputEmail,
          intent,
          captchaToken: captchaToken ?? "",
        }),
      })

      const payload = (await response.json()) as
        | RecoveryPrecheckResponse
        | { ok?: boolean; status?: string; code?: string }

      if (payload.ok === true && payload.status === "registered") {
        return { ok: true, status: "registered" }
      }

      if (
        payload.ok === false &&
        typeof payload.code === "string" &&
        RECOVERY_PRECHECK_ERROR_CODES.includes(
          payload.code as RecoveryPrecheckErrorCode
        )
      ) {
        return {
          ok: false,
          code: payload.code as RecoveryPrecheckErrorCode,
        }
      }

      if (!response.ok) {
        return { ok: false, code: "INVALID_REQUEST" }
      }
    } catch {
      return { ok: false, code: "INVALID_REQUEST" }
    }

    return { ok: false, code: "INVALID_REQUEST" }
  }

  function mapRecoveryErrorCodeToMessage(code: RecoveryPrecheckErrorCode) {
    if (code === "EMAIL_NOT_REGISTERED") {
      return "Email belum terdaftar. Cek lagi penulisan email atau daftar akun terlebih dahulu."
    }
    if (code === "RATE_LIMITED") {
      return "Terlalu banyak percobaan. Coba lagi dalam beberapa menit."
    }
    if (code === "CAPTCHA_FAILED") {
      return "Verifikasi keamanan gagal. Coba lagi."
    }
    if (code === "SERVICE_UNAVAILABLE") {
      return "Layanan verifikasi keamanan sedang tidak tersedia. Coba lagi sebentar."
    }
    return "Terjadi kesalahan. Silakan coba lagi."
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    clearError()

    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi.")
      return
    }

    setIsLoading(true)
    try {
      const result = await signIn.email({
        email: email.trim(),
        password,
        callbackURL,
      })
      if (result.error) {
        const msg = result.error.message ?? ""
        const isCredentialError = /invalid (email|password|credentials)/i.test(msg)
          || /incorrect (email|password|credentials)/i.test(msg)
        if (isCredentialError) {
          setError("Email atau password tidak cocok.\nCoba gunakan fitur \"Lupa password?\" atau \"Magic Link\" untuk masuk.")
        } else {
          setError(msg || "Terjadi kesalahan.")
        }
      } else if (result.data) {
        // Cross-domain plugin adds `redirect`, `url`, `token` at runtime
        // but these aren't in signIn.email() type definitions.
        const data = result.data as Record<string, unknown>

        // 2FA redirect: twoFactor plugin returned twoFactorRedirect
        if (data.twoFactorRedirect) {
          setPending2FA({
            email: email.trim(),
            password,
            redirectUrl: redirectParam ?? undefined,
          })
          router.push(verify2FAHref)
          return
        }

        if (data.redirect && data.token) {
          // OTT: server returns one-time token instead of setting cookies.
          // Navigate to target URL with ?ott= so ConvexBetterAuthProvider
          // can exchange the OTT for a real session on the frontend.
          const url = new URL(data.url as string)
          url.searchParams.set("ott", data.token as string)
          window.location.href = url.toString()
          return
        }
        // Non cross-domain fallback
        window.location.href = callbackURL
        return
      }
    } catch {
      toast.error("Terjadi kesalahan. Silakan coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    clearError()
    setIsLoading(true)
    try {
      const errorParams = new URLSearchParams()
      if (redirectParam) {
        errorParams.set("redirect_url", redirectParam)
      }
      const errorCallbackURL = `${window.location.origin}/sign-in${errorParams.size > 0 ? `?${errorParams.toString()}` : ""}`

      await signIn.social({
        provider: "google",
        callbackURL,
        errorCallbackURL,
      })
      // Navigates away — no need to setIsLoading(false)
    } catch {
      toast.error("Gagal masuk dengan Google. Silakan coba lagi.")
      setIsLoading(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    clearError()

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError("Email wajib diisi.")
      return
    }

    if (!requiresRecoveryCaptcha) {
      setError(mapRecoveryErrorCodeToMessage("SERVICE_UNAVAILABLE"))
      return
    }

    if (!magicLinkCaptchaToken) {
      setError("Selesaikan verifikasi keamanan terlebih dahulu.")
      return
    }

    setIsLoading(true)
    try {
      const precheck = await runRecoveryPrecheck(
        trimmedEmail,
        "magic-link",
        magicLinkCaptchaToken
      )
      resetMagicLinkCaptcha()

      if (!precheck.ok) {
        setError(mapRecoveryErrorCodeToMessage(precheck.code))
        return
      }

      const { error: apiError } = await signIn.magicLink({
        email: trimmedEmail,
        callbackURL,
      })
      if (apiError) {
        setError(apiError.message ?? "Terjadi kesalahan.")
      } else {
        setMode("magic-link-sent")
      }
    } catch {
      toast.error("Terjadi kesalahan. Silakan coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    clearError()

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError("Email wajib diisi.")
      return
    }

    if (!requiresRecoveryCaptcha) {
      setError(mapRecoveryErrorCodeToMessage("SERVICE_UNAVAILABLE"))
      return
    }

    if (!forgotPasswordCaptchaToken) {
      setError("Selesaikan verifikasi keamanan terlebih dahulu.")
      return
    }

    setIsLoading(true)
    try {
      const precheck = await runRecoveryPrecheck(
        trimmedEmail,
        "forgot-password",
        forgotPasswordCaptchaToken
      )
      resetForgotPasswordCaptcha()

      if (!precheck.ok) {
        setError(mapRecoveryErrorCodeToMessage(precheck.code))
        return
      }

      const { error: apiError } = await authClient.requestPasswordReset({
        email: trimmedEmail,
        redirectTo: `${window.location.origin}/sign-in`,
      })
      if (apiError) {
        setError(apiError.message ?? "Terjadi kesalahan.")
      } else {
        setMode("reset-sent")
      }
    } catch {
      toast.error("Terjadi kesalahan. Silakan coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    clearError()

    if (!newPassword || !confirmPassword) {
      setError("Semua field wajib diisi.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Password tidak cocok.")
      return
    }
    if (newPassword.length < 8) {
      setError("Password minimal 8 karakter.")
      return
    }

    setIsLoading(true)
    try {
      const { error: apiError } = await authClient.resetPassword({
        newPassword,
        token: resetToken!,
      })
      if (apiError) {
        setError(apiError.message ?? "Terjadi kesalahan.")
      } else {
        setMode("reset-success")
      }
    } catch {
      toast.error("Terjadi kesalahan. Silakan coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }

  function switchMode(newMode: SignInMode) {
    setError("")
    if (newMode !== "magic-link") {
      resetMagicLinkCaptcha()
    }
    if (newMode !== "forgot-password") {
      resetForgotPasswordCaptcha()
    }
    setMode(newMode)
  }

  // --- Title and subtitle per mode ---
  const titles: Record<SignInMode, { title: string; subtitle: string }> = {
    "sign-in": {
      title: "Silakan masuk!",
      subtitle: "Susun Paper terbaikmu, tanpa ribet, tinggal ngobrol!",
    },
    "magic-link": {
      title: "Magic Link",
      subtitle: "Masuk tanpa password, langsung dari email kamu",
    },
    "forgot-password": {
      title: "Lupa Password",
      subtitle: "Masukkan email untuk reset password kamu",
    },
    "reset-password": {
      title: "Reset Password",
      subtitle: "Buat password baru untuk akun kamu",
    },
    "magic-link-sent": {
      title: "Cek Email Kamu",
      subtitle: "Link masuk sudah dikirim. Jika belum masuk dalam 3-5 menit, cek folder Spam/Junk/Promosi.",
    },
    "reset-sent": {
      title: "Cek Email Kamu",
      subtitle: "Link reset password sudah dikirim. Jika belum masuk dalam 3-5 menit, cek folder Spam/Junk/Promosi.",
    },
    "reset-success": {
      title: "Password Berhasil Diatur",
      subtitle: "Kamu sekarang bisa masuk dengan password baru.",
    },
  }

  const { title, subtitle } = titles[mode]

  if (!isClientReady) {
    return (
      <AuthWideCard
        title={title}
        subtitle={subtitle}
        showBackButton
      >
        <div className="w-full space-y-5" aria-hidden="true">
          {!isWaitlistMode ? (
            <>
              <div className="auth-cta opacity-80" />
              <div className="auth-divider">
                <div className="auth-divider-line" />
                <span className="auth-divider-label">atau</span>
                <div className="auth-divider-line" />
              </div>
            </>
          ) : null}
          <div className="space-y-4">
            <div className="auth-input opacity-65" />
            <div className="auth-input opacity-65" />
            <div className="auth-cta opacity-80" />
          </div>
          {!isWaitlistMode ? <div className="h-4 opacity-0" /> : null}
        </div>
      </AuthWideCard>
    )
  }

  return (
    <AuthWideCard
      title={title}
      subtitle={subtitle}
      showBackButton
    >
      {/* --- Sign In Mode (default) --- */}
      {mode === "sign-in" && (
        <div className="w-full space-y-5">
          {/* Google OAuth — hidden in waitlist mode */}
          {!isWaitlistMode && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="group auth-cta relative inline-flex w-full items-center justify-center gap-2 overflow-hidden px-4 auth-focus-ring disabled:cursor-not-allowed"
              >
                <span
                  className="auth-btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                  aria-hidden="true"
                />
                <span className="relative z-10 inline-flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  MASUK DENGAN GOOGLE
                </span>
              </button>

              {/* Divider */}
              <div className="auth-divider">
                <div className="auth-divider-line" />
                <span className="auth-divider-label">atau</span>
                <div className="auth-divider-line" />
              </div>
            </>
          )}

          {/* Email + Password Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label htmlFor="sign-in-email" className="sr-only">Email</label>
              <input
                id="sign-in-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError() }}
                placeholder="Email"
                autoComplete="email"
                className="auth-input"
              />
            </div>

            <div>
              <label htmlFor="sign-in-password" className="sr-only">Password</label>
              <div className="relative flex items-center">
                <input
                  id="sign-in-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError() }}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="auth-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-input-toggle"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeClosed className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Forgot password + Magic link row */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => switchMode("forgot-password")}
                className="auth-link"
              >
                Lupa password?
              </button>
              <button
                type="button"
                onClick={() => switchMode("magic-link")}
                className="auth-link"
              >
                Masuk via Magic Link
              </button>
            </div>

            {error && (
              <div className="auth-feedback-error" role="alert">
                {errorCode === SIGNUP_DISABLED_ERROR_CODE ? (
                  <p className="whitespace-pre-line">
                    Akun Google ini belum terdaftar di Makalah.
                    {"\n"}
                    {isWaitlistMode ? (
                      <>
                        Silakan{" "}
                        <Link
                          href="/waitinglist"
                          className="auth-link-on-feedback"
                        >
                          daftar waiting list
                        </Link>{" "}
                        untuk mendapatkan akses.
                      </>
                    ) : (
                      <>
                        Silakan{" "}
                        <Link
                          href={signUpHref}
                          className="auth-link-on-feedback"
                        >
                          daftar
                        </Link>{" "}
                        dulu, lalu masuk kembali.
                      </>
                    )}
                  </p>
                ) : (
                  <p className="whitespace-pre-line">{error}</p>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="group auth-cta relative inline-flex w-full items-center justify-center gap-2 overflow-hidden px-4 auth-focus-ring disabled:cursor-not-allowed"
            >
              <span
                className="auth-btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                aria-hidden="true"
              />
              <span className="relative z-10 inline-flex items-center gap-2">
                {isLoading ? <RefreshDouble className="h-4 w-4 animate-spin" /> : null}
                MASUK
              </span>
            </button>
          </form>

          {/* Footer (hidden in waitlist mode) */}
          {!isWaitlistMode && (
            <p className="text-muted-foreground text-xs font-sans text-center mt-4">
              Belum punya akun?{" "}
              <Link href={signUpHref} className="auth-link-strong">
                Daftar
              </Link>
            </p>
          )}

        </div>
      )}

      {/* --- Magic Link Mode --- */}
      {mode === "magic-link" && (
        <div className="w-full space-y-5">
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div>
              <label htmlFor="magic-link-email" className="sr-only">Email</label>
              <input
                id="magic-link-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError() }}
                placeholder="Email"
                autoComplete="email"
                className="auth-input"
              />
            </div>

            {requiresRecoveryCaptcha ? (
              <div className="space-y-2">
                <p className="auth-note">
                  Verifikasi keamanan diperlukan sebelum kirim magic link.
                </p>
                <TurnstileWidget
                  siteKey={turnstileSiteKey}
                  onTokenChange={setMagicLinkCaptchaToken}
                  resetCounter={magicLinkCaptchaResetCounter}
                  theme={turnstileTheme}
                  className="mt-2 w-full"
                />
              </div>
            ) : null}

            {error && (
              <div className="auth-feedback-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group auth-cta relative inline-flex w-full items-center justify-center gap-2 overflow-hidden px-4 auth-focus-ring disabled:cursor-not-allowed"
            >
              <span
                className="auth-btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                aria-hidden="true"
              />
              <span className="relative z-10 inline-flex items-center gap-2">
                {isLoading ? <RefreshDouble className="h-4 w-4 animate-spin" /> : null}
                KIRIM MAGIC LINK
              </span>
            </button>
          </form>

          <button
            type="button"
            onClick={() => switchMode("sign-in")}
            className="auth-link w-full text-center"
          >
            Kembali ke masuk
          </button>
        </div>
      )}

      {/* --- Forgot Password Mode --- */}
      {mode === "forgot-password" && (
        <div className="w-full space-y-5">
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="sr-only">Email</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError() }}
                placeholder="Email"
                autoComplete="email"
                className="auth-input"
              />
            </div>

            {requiresRecoveryCaptcha ? (
              <div className="space-y-2">
                <p className="auth-note">
                  Verifikasi keamanan diperlukan sebelum kirim link reset.
                </p>
                <TurnstileWidget
                  siteKey={turnstileSiteKey}
                  onTokenChange={setForgotPasswordCaptchaToken}
                  resetCounter={forgotPasswordCaptchaResetCounter}
                  theme={turnstileTheme}
                  className="mt-2 w-full"
                />
              </div>
            ) : null}

            {error && (
              <div className="auth-feedback-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group auth-cta relative inline-flex w-full items-center justify-center gap-2 overflow-hidden px-4 auth-focus-ring disabled:cursor-not-allowed"
            >
              <span
                className="auth-btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                aria-hidden="true"
              />
              <span className="relative z-10 inline-flex items-center gap-2">
                {isLoading ? <RefreshDouble className="h-4 w-4 animate-spin" /> : null}
                KIRIM LINK RESET
              </span>
            </button>
          </form>

          <button
            type="button"
            onClick={() => switchMode("sign-in")}
            className="auth-link w-full text-center"
          >
            Kembali ke masuk
          </button>
        </div>
      )}

      {/* --- Reset Password Mode --- */}
      {mode === "reset-password" && (
        <div className="w-full space-y-5">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="sr-only">Password baru</label>
              <div className="relative flex items-center">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); clearError() }}
                  placeholder="Password baru"
                  autoComplete="new-password"
                  className="auth-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-input-toggle"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeClosed className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="sr-only">Konfirmasi password</label>
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); clearError() }}
                placeholder="Konfirmasi password baru"
                autoComplete="new-password"
                className="auth-input"
              />
            </div>

            {error && (
              <div className="auth-feedback-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group auth-cta relative inline-flex w-full items-center justify-center gap-2 overflow-hidden px-4 auth-focus-ring disabled:cursor-not-allowed"
            >
              <span
                className="auth-btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                aria-hidden="true"
              />
              <span className="relative z-10 inline-flex items-center gap-2">
                {isLoading ? <RefreshDouble className="h-4 w-4 animate-spin" /> : null}
                RESET PASSWORD
              </span>
            </button>
          </form>

          <button
            type="button"
            onClick={() => switchMode("sign-in")}
            className="auth-link w-full text-center"
          >
            Kembali ke masuk
          </button>
        </div>
      )}

      {/* --- Magic Link Sent --- */}
      {mode === "magic-link-sent" && (
        <div className="text-center space-y-4 w-full">
          <div className="mx-auto flex justify-center">
            <span className="auth-icon-badge">
              <Mail className="h-6 w-6" />
            </span>
          </div>
          <h3 className="text-narrative text-lg font-medium">Cek Email Kamu</h3>
          <p className="text-sm text-muted-foreground">
            Link masuk sudah dikirim ke{" "}
            <span className="font-mono text-foreground">{email}</span>
            . Kalau email belum masuk dalam 3-5 menit, cek folder Spam/Junk/Promosi.
          </p>
          <button
            type="button"
            onClick={() => switchMode("sign-in")}
            className="auth-link"
          >
            Kembali ke masuk
          </button>
        </div>
      )}

      {/* --- Reset Sent --- */}
      {mode === "reset-sent" && (
        <div className="text-center space-y-4 w-full">
          <div className="mx-auto flex justify-center">
            <span className="auth-icon-badge">
              <Mail className="h-6 w-6" />
            </span>
          </div>
          <h3 className="text-narrative text-lg font-medium">Cek Email Kamu</h3>
          <p className="text-sm text-muted-foreground">
            Link reset password sudah dikirim ke{" "}
            <span className="font-mono text-foreground">{email}</span>
            . Kalau email belum masuk dalam 3-5 menit, cek folder Spam/Junk/Promosi.
          </p>
          <button
            type="button"
            onClick={() => switchMode("sign-in")}
            className="auth-link"
          >
            Kembali ke masuk
          </button>
        </div>
      )}

      {/* --- Reset Success --- */}
      {mode === "reset-success" && (
        <div className="text-center space-y-4 w-full">
          <div className="mx-auto flex justify-center">
            <span className="auth-icon-badge auth-icon-badge-success">
              <Lock className="h-6 w-6" />
            </span>
          </div>
          <h3 className="text-narrative text-lg font-medium">Password Berhasil Diatur</h3>
          <p className="text-sm text-muted-foreground">
            Kamu sekarang bisa masuk dengan password baru.
          </p>
          <button
            type="button"
            onClick={() => switchMode("sign-in")}
            className="group auth-cta relative inline-flex items-center justify-center gap-2 overflow-hidden px-6 auth-focus-ring"
          >
            <span
              className="auth-btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
              aria-hidden="true"
            />
            <span className="relative z-10">MASUK SEKARANG</span>
          </button>
        </div>
      )}
    </AuthWideCard>
  )
}
