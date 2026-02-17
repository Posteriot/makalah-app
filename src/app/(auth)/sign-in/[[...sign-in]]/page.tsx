"use client"

import { useCallback, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Eye, EyeClosed, Mail, Lock, RefreshDouble } from "iconoir-react"
import { signIn, authClient } from "@/lib/auth-client"
import { setPending2FA } from "@/lib/auth-2fa"
import { AuthWideCard } from "@/components/auth/AuthWideCard"
import { TurnstileWidget } from "@/components/auth/TurnstileWidget"
import { getRedirectUrl } from "@/lib/utils/redirectAfterAuth"

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
  const callbackURL = getRedirectUrl(searchParams, "/chat")
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""
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
  const [email, setEmail] = useState("")
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

    if (requiresRecoveryCaptcha && !magicLinkCaptchaToken) {
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

    if (requiresRecoveryCaptcha && !forgotPasswordCaptchaToken) {
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

  return (
    <AuthWideCard
      title={title}
      subtitle={subtitle}
      showBackButton
      onBackClick={() => router.back()}
    >
      {/* --- Sign In Mode (default) --- */}
      {mode === "sign-in" && (
        <div className="w-full space-y-5">
          {/* Google OAuth */}
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
          <div className="flex items-center gap-4 w-full">
            <div className="h-[0.5px] flex-1 bg-slate-400" />
            <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider">atau</span>
            <div className="h-[0.5px] flex-1 bg-slate-400" />
          </div>

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
                className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
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
                  className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 pr-10 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 inline-flex h-7 w-7 items-center justify-center text-muted-foreground dark:text-slate-300 transition-colors hover:text-foreground dark:hover:text-slate-100 focus:outline-none"
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
                className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                Lupa password?
              </button>
              <button
                type="button"
                onClick={() => switchMode("magic-link")}
                className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                Masuk via Magic Link
              </button>
            </div>

            {error && (
              <div className="rounded-action border border-destructive/40 bg-destructive/60 px-3 py-2 text-xs text-slate-100 font-mono">
                {errorCode === SIGNUP_DISABLED_ERROR_CODE ? (
                  <p className="whitespace-pre-line">
                    Akun Google ini belum terdaftar di Makalah.
                    {"\n"}
                    Silakan{" "}
                    <Link
                      href={signUpHref}
                      className="underline underline-offset-2 hover:text-slate-300 transition-colors"
                    >
                      daftar
                    </Link>{" "}
                    dulu, lalu masuk kembali.
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
              className="group relative overflow-hidden inline-flex w-full items-center justify-center gap-2 rounded-action h-10 px-4 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span
                className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                aria-hidden="true"
              />
              <span className="relative z-10 inline-flex items-center gap-2">
                {isLoading ? <RefreshDouble className="h-4 w-4 animate-spin" /> : null}
                MASUK
              </span>
            </button>
          </form>

          {/* Footer */}
          <p className="text-muted-foreground text-xs font-sans text-center mt-4">
            Belum punya akun?{" "}
            <Link href={signUpHref} className="text-slate-50 hover:text-slate-300 font-bold">
              Daftar
            </Link>
          </p>

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
                className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
              />
            </div>

            {requiresRecoveryCaptcha ? (
              <div className="space-y-2">
                <p className="text-[11px] font-mono text-muted-foreground">
                  Verifikasi keamanan diperlukan sebelum kirim magic link.
                </p>
                <TurnstileWidget
                  siteKey={turnstileSiteKey}
                  onTokenChange={setMagicLinkCaptchaToken}
                  resetCounter={magicLinkCaptchaResetCounter}
                  className="mt-2 w-full"
                />
              </div>
            ) : null}

            {error && (
              <div className="rounded-action border border-destructive/40 bg-destructive/60 px-3 py-2 text-xs text-slate-100 font-mono">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group relative overflow-hidden inline-flex w-full items-center justify-center gap-2 rounded-action h-10 px-4 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span
                className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
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
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors w-full text-center"
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
                className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
              />
            </div>

            {requiresRecoveryCaptcha ? (
              <div className="space-y-2">
                <p className="text-[11px] font-mono text-muted-foreground">
                  Verifikasi keamanan diperlukan sebelum kirim link reset.
                </p>
                <TurnstileWidget
                  siteKey={turnstileSiteKey}
                  onTokenChange={setForgotPasswordCaptchaToken}
                  resetCounter={forgotPasswordCaptchaResetCounter}
                  className="mt-2 w-full"
                />
              </div>
            ) : null}

            {error && (
              <div className="rounded-action border border-destructive/40 bg-destructive/60 px-3 py-2 text-xs text-slate-100 font-mono">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group relative overflow-hidden inline-flex w-full items-center justify-center gap-2 rounded-action h-10 px-4 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span
                className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
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
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors w-full text-center"
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
                  className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 pr-10 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 inline-flex h-7 w-7 items-center justify-center text-muted-foreground dark:text-slate-300 transition-colors hover:text-foreground dark:hover:text-slate-100 focus:outline-none"
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
                className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
              />
            </div>

            {error && (
              <div className="rounded-action border border-destructive/40 bg-destructive/60 px-3 py-2 text-xs text-slate-100 font-mono">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group relative overflow-hidden inline-flex w-full items-center justify-center gap-2 rounded-action h-10 px-4 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span
                className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
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
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors w-full text-center"
          >
            Kembali ke masuk
          </button>
        </div>
      )}

      {/* --- Magic Link Sent --- */}
      {mode === "magic-link-sent" && (
        <div className="text-center space-y-4 w-full">
          <Mail className="h-12 w-12 text-primary mx-auto" />
          <h3 className="text-narrative text-lg font-medium">Cek Email Kamu</h3>
          <p className="text-sm text-muted-foreground">
            Link masuk sudah dikirim ke{" "}
            <span className="font-mono text-foreground">{email}</span>
            . Kalau email belum masuk dalam 3-5 menit, cek folder Spam/Junk/Promosi.
          </p>
          <button
            type="button"
            onClick={() => switchMode("sign-in")}
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            Kembali ke masuk
          </button>
        </div>
      )}

      {/* --- Reset Sent --- */}
      {mode === "reset-sent" && (
        <div className="text-center space-y-4 w-full">
          <Mail className="h-12 w-12 text-primary mx-auto" />
          <h3 className="text-narrative text-lg font-medium">Cek Email Kamu</h3>
          <p className="text-sm text-muted-foreground">
            Link reset password sudah dikirim ke{" "}
            <span className="font-mono text-foreground">{email}</span>
            . Kalau email belum masuk dalam 3-5 menit, cek folder Spam/Junk/Promosi.
          </p>
          <button
            type="button"
            onClick={() => switchMode("sign-in")}
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            Kembali ke masuk
          </button>
        </div>
      )}

      {/* --- Reset Success --- */}
      {mode === "reset-success" && (
        <div className="text-center space-y-4 w-full">
          <Lock className="h-12 w-12 text-success mx-auto" />
          <h3 className="text-narrative text-lg font-medium">Password Berhasil Diatur</h3>
          <p className="text-sm text-muted-foreground">
            Kamu sekarang bisa masuk dengan password baru.
          </p>
          <button
            type="button"
            onClick={() => switchMode("sign-in")}
            className="group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action h-10 px-6 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring"
          >
            <span
              className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
              aria-hidden="true"
            />
            <span className="relative z-10">MASUK SEKARANG</span>
          </button>
        </div>
      )}
    </AuthWideCard>
  )
}
