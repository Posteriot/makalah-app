"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"
import { Eye, EyeClosed, WarningCircle, CheckCircle, Mail, RefreshDouble } from "iconoir-react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { signIn, signUp } from "@/lib/auth-client"
import { AuthWideCard } from "@/components/auth/AuthWideCard"
import { getRedirectUrl } from "@/lib/utils/redirectAfterAuth"

// Custom left content for invited users
function InvitedUserLeftContent({ email }: { email: string }) {
  return (
    <div className="flex flex-col justify-between h-full">
      <div className="flex flex-col">
        <Link href="/" className="inline-flex items-center gap-2 group w-fit">
          {/* Logo Icon */}
          <Image
            src="/logo/makalah_logo_light.svg"
            alt=""
            width={28}
            height={28}
            className="transition-transform group-hover:scale-105"
          />
          {/* Brand Text - for dark mode */}
          <Image
            src="/logo-makalah-ai-white.svg"
            alt="Makalah"
            width={80}
            height={20}
            className="hidden dark:block transition-transform group-hover:scale-105"
          />
          {/* Brand Text - for light mode */}
          <Image
            src="/logo-makalah-ai-black.svg"
            alt="Makalah"
            width={80}
            height={20}
            className="block dark:hidden transition-transform group-hover:scale-105"
          />
        </Link>
      </div>

      <div className="space-y-4 mt-auto">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle className="h-5 w-5" />
          <span className="font-mono text-xs font-bold uppercase tracking-widest">UNDANGAN VALID</span>
        </div>
        <h1 className="font-mono text-2xl md:text-3xl font-bold tracking-tighter text-foreground leading-[1.1]">
          Selamat datang!
        </h1>
        <p className="text-sm text-muted-foreground">
          Kamu diundang untuk bergabung dengan Makalah App.
        </p>
        <div className="flex items-center gap-2 bg-muted/50 rounded-action px-3 py-2 border border-hairline">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">{email}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Gunakan email di atas untuk mendaftar.
        </p>
      </div>
    </div>
  )
}

// Error content for invalid/expired token
function InvalidTokenContent({ error }: { error: string }) {
  return (
    <div className="w-full flex flex-col items-center justify-center py-8 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <WarningCircle className="w-8 h-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Link Tidak Valid
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        {error}
      </p>
      <Link
        href="/waiting-list"
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-action font-mono text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
      >
        DAFTAR WAITING LIST
      </Link>
    </div>
  )
}

type SignUpMode = "sign-up" | "verify-email"

export default function SignUpPage() {
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get("invite")
  const callbackURL = getRedirectUrl(searchParams)

  const [mode, setMode] = useState<SignUpMode>("sign-up")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Only validate invite token if present
  const tokenValidation = useQuery(
    api.waitlist.getByToken,
    inviteToken ? { token: inviteToken } : "skip"
  )

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
      const result = await signUp.email({
        email: email.trim(),
        password,
        name: fullName,
        callbackURL,
      })
      if (result.error) {
        setError(result.error.message ?? "Terjadi kesalahan.")
      } else if (result.data?.redirect && result.data?.token) {
        // Cross-domain: OTT redirect (when email verification is not required)
        const url = new URL(result.data.url as string)
        url.searchParams.set("ott", result.data.token as string)
        window.location.href = url.toString()
        return
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

  // --- Sign-Up Form (shared between invite and non-invite) ---
  function renderSignUpForm() {
    return (
      <div className="w-full space-y-5">
        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
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
            DAFTAR DENGAN GOOGLE
          </span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full">
          <div className="h-[0.5px] flex-1 bg-slate-400" />
          <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider">atau</span>
          <div className="h-[0.5px] flex-1 bg-slate-400" />
        </div>

        {/* Email + Password Form */}
        <form onSubmit={handleEmailSignUp} className="space-y-4">
          {/* First + Last name row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="sign-up-first-name" className="sr-only">Nama depan</label>
              <input
                id="sign-up-first-name"
                type="text"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); clearError() }}
                placeholder="Nama depan"
                autoComplete="given-name"
                className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="sign-up-last-name" className="sr-only">Nama belakang</label>
              <input
                id="sign-up-last-name"
                type="text"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); clearError() }}
                placeholder="Nama belakang"
                autoComplete="family-name"
                className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
              />
            </div>
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
              className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
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

          {error && (
            <div className="rounded-action border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive font-mono">
              {error}
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
              DAFTAR
            </span>
          </button>
        </form>

        {/* Footer */}
        <p className="text-muted-foreground text-xs font-sans text-center mt-4">
          Sudah punya akun?{" "}
          <Link href="/sign-in" className="text-slate-50 hover:text-slate-300 font-bold">
            Masuk
          </Link>
        </p>

        <p className="text-muted-foreground text-[10px] font-sans mt-3 text-center leading-relaxed">
          Akun Anda akan terhubung otomatis dengan Google,
          <br />
          jika masuk menggunakan alamat email yang sama.
        </p>
      </div>
    )
  }

  // --- Verify Email Mode ---
  function renderVerifyEmail() {
    return (
      <div className="text-center space-y-4 w-full">
        <Mail className="h-12 w-12 text-primary mx-auto" />
        <h3 className="text-narrative text-lg font-medium">Cek Email Kamu</h3>
        <p className="text-sm text-muted-foreground">
          Link verifikasi sudah dikirim ke{" "}
          <span className="font-mono text-foreground">{email}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Klik link di email untuk mengaktifkan akun kamu.
        </p>
        <Link
          href="/sign-in"
          className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          Kembali ke masuk
        </Link>
      </div>
    )
  }

  // --- Invite token flow ---
  if (inviteToken) {
    // Loading state
    if (tokenValidation === undefined) {
      return (
        <AuthWideCard
          title="Memvalidasi..."
          subtitle="Sedang memeriksa undangan kamu"
        >
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded-md" />
            <div className="h-10 bg-muted rounded-md" />
            <div className="h-10 bg-muted rounded-md" />
          </div>
        </AuthWideCard>
      )
    }

    // Invalid token
    if (!tokenValidation.valid) {
      return (
        <AuthWideCard
          title="Link Tidak Valid"
          subtitle="Token undangan tidak dapat digunakan"
        >
          <InvalidTokenContent error={tokenValidation.error ?? "Token tidak valid"} />
        </AuthWideCard>
      )
    }

    // Valid token - show special welcome with email hint
    return (
      <AuthWideCard
        title="Selamat datang!"
        subtitle="Kamu diundang untuk bergabung"
        customLeftContent={<InvitedUserLeftContent email={tokenValidation.email!} />}
      >
        {mode === "verify-email" ? renderVerifyEmail() : renderSignUpForm()}
      </AuthWideCard>
    )
  }

  // --- Default sign-up (no invite token) ---
  return (
    <AuthWideCard
      title="Ayo bergabung!"
      subtitle="Kolaborasi dengan AI, menyusun paper bermutu & akuntable"
    >
      {mode === "verify-email" ? renderVerifyEmail() : renderSignUpForm()}
    </AuthWideCard>
  )
}
