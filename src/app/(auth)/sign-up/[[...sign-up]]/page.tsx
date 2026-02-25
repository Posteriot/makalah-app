"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Eye, EyeClosed, Mail, RefreshDouble } from "iconoir-react"
import { signIn, signUp } from "@/lib/auth-client"
import { AuthWideCard } from "@/components/auth/AuthWideCard"
import { getRedirectUrl } from "@/lib/utils/redirectAfterAuth"

type SignUpMode = "sign-up" | "verify-email"

export default function SignUpPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirectParam =
    searchParams.get("redirect_url") ?? searchParams.get("redirect")
  const signInHref = redirectParam
    ? `/sign-in?${new URLSearchParams({ redirect_url: redirectParam }).toString()}`
    : "/sign-in"
  const callbackURL = getRedirectUrl(searchParams, "/")

  const [mode, setMode] = useState<SignUpMode>("sign-up")
  const [firstName, setFirstName] = useState(searchParams.get("firstName") ?? "")
  const [lastName, setLastName] = useState(searchParams.get("lastName") ?? "")
  const [email, setEmail] = useState(searchParams.get("email") ?? "")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isClientReady, setIsClientReady] = useState(false)

  useEffect(() => {
    setIsClientReady(true)
  }, [])

  function clearError() {
    if (error) setError("")
  }

  async function handleGoogleSignUp() {
    clearError()
    setIsLoading(true)
    try {
      await signIn.social({
        provider: "google",
        callbackURL,
        requestSignUp: true,
      })
      // Navigates away
    } catch {
      toast.error("Gagal mendaftar dengan Google. Silakan coba lagi.")
      setIsLoading(false)
    }
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault()
    clearError()

    if (!firstName.trim()) {
      setError("Nama depan wajib diisi.")
      return
    }
    if (!email.trim()) {
      setError("Email wajib diisi.")
      return
    }
    if (!password) {
      setError("Password wajib diisi.")
      return
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter.")
      return
    }

    setIsLoading(true)
    try {
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ")
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const verifiedCallbackURL = `${origin}/sign-in?verified_email=${encodeURIComponent(email.trim())}`
      const result = await signUp.email({
        email: email.trim(),
        password,
        name: fullName,
        callbackURL: verifiedCallbackURL,
      })
      if (result.error) {
        setError(result.error.message || "Terjadi kesalahan.")
      } else if (result.data) {
        // Cross-domain plugin adds `redirect`, `url`, `token` at runtime
        // but these aren't in signUp.email() type definitions.
        const data = result.data as Record<string, unknown>
        if (data.redirect && data.token) {
          // OTT redirect (when email verification is not required)
          const url = new URL(data.url as string)
          url.searchParams.set("ott", data.token as string)
          window.location.href = url.toString()
          return
        }
        // Email verification required — show "Cek Email" UI
        setMode("verify-email")
      } else {
        // Email verification required — show "Cek Email" UI
        setMode("verify-email")
      }
    } catch {
      toast.error("Terjadi kesalahan. Silakan coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }

  // --- Sign-Up Form ---
  function renderSignUpForm() {
    return (
      <div className="w-full space-y-5">
        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
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
            DAFTAR DENGAN GOOGLE
          </span>
        </button>

        {/* Divider */}
        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-label">atau</span>
          <div className="auth-divider-line" />
        </div>

        {/* Email + Password Form */}
        <form onSubmit={handleEmailSignUp} className="space-y-4">
          {/* First name */}
          <div>
            <label htmlFor="sign-up-first-name" className="sr-only">Nama depan</label>
            <input
              id="sign-up-first-name"
              type="text"
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); clearError() }}
              placeholder="Nama depan"
              autoComplete="given-name"
              className="auth-input"
            />
          </div>

          {/* Last name */}
          <div>
            <label htmlFor="sign-up-last-name" className="sr-only">Nama belakang</label>
            <input
              id="sign-up-last-name"
              type="text"
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); clearError() }}
              placeholder="Nama belakang"
              autoComplete="family-name"
              className="auth-input"
            />
          </div>

          <div>
            <label htmlFor="sign-up-email" className="sr-only">Email</label>
            <input
              id="sign-up-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError() }}
              placeholder="Email"
              autoComplete="email"
              className="auth-input"
            />
          </div>

          <div>
            <label htmlFor="sign-up-password" className="sr-only">Password</label>
            <div className="relative flex items-center">
              <input
                id="sign-up-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError() }}
                placeholder="Password"
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

          {error && (
            <div className="auth-feedback-error" role="alert">
              {error}
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
              DAFTAR
            </span>
          </button>
        </form>

        {/* Footer */}
        <p className="text-muted-foreground text-xs font-sans text-center mt-4">
          Sudah punya akun?{" "}
          <Link href={signInHref} className="auth-link-strong">
            Masuk
          </Link>
        </p>

      </div>
    )
  }

  // --- Verify Email Mode ---
  function renderVerifyEmail() {
    return (
      <div className="text-center space-y-4 w-full">
        <div className="mx-auto flex justify-center">
          <span className="auth-icon-badge">
            <Mail className="h-6 w-6" />
          </span>
        </div>
        <h3 className="text-narrative text-lg font-medium">Cek Email Kamu</h3>
        <p className="text-sm text-muted-foreground">
          Link verifikasi sudah dikirim ke{" "}
          <span className="font-mono text-foreground">{email}</span>
          . Kalau email belum masuk dalam 3-5 menit, cek folder Spam/Junk/Promosi.
        </p>
        <p className="text-xs text-muted-foreground">
          Klik link di email untuk mengaktifkan akun kamu.
        </p>
        <Link
          href={signInHref}
          className="auth-link"
        >
          Kembali ke masuk
        </Link>
      </div>
    )
  }

  if (!isClientReady) {
    return (
      <AuthWideCard
        title="Ayo bergabung!"
        subtitle="Kolaborasi dengan AI, menyusun paper bermutu & akuntable"
        showBackButton
        onBackClick={() => router.back()}
      >
        <div className="w-full space-y-5" aria-hidden="true">
          <div className="auth-cta opacity-80" />
          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span className="auth-divider-label">atau</span>
            <div className="auth-divider-line" />
          </div>
          <div className="space-y-4">
            <div className="auth-input opacity-65" />
            <div className="auth-input opacity-65" />
            <div className="auth-input opacity-65" />
            <div className="auth-input opacity-65" />
            <div className="auth-cta opacity-80" />
          </div>
          <div className="h-4 opacity-0" />
        </div>
      </AuthWideCard>
    )
  }

  return (
    <AuthWideCard
      title="Ayo bergabung!"
      subtitle="Kolaborasi dengan AI, menyusun paper bermutu & akuntable"
      showBackButton
      onBackClick={() => router.back()}
    >
      {mode === "verify-email" ? renderVerifyEmail() : renderSignUpForm()}
    </AuthWideCard>
  )
}
