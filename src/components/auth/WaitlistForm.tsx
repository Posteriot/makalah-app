"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { Mail, User, CheckCircle, WarningTriangle } from "iconoir-react"
import { sendConfirmationEmail } from "@/app/(auth)/waitinglist/actions"

type FormState = "idle" | "loading" | "success"

export function WaitlistForm() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [formState, setFormState] = useState<FormState>("idle")
  const [error, setError] = useState<string | null>(null)

  const registerMutation = useMutation(api.waitlist.register)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Basic name validation
    if (!firstName.trim() || !lastName.trim()) {
      setError("Nama depan dan nama belakang wajib diisi")
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Format email tidak valid")
      return
    }

    setFormState("loading")

    try {
      // Register to waitlist
      await registerMutation({ firstName, lastName, email })

      // Send confirmation email (fire-and-forget)
      void sendConfirmationEmail(email, firstName).catch(() => undefined)

      setFormState("success")
    } catch (err) {
      setFormState("idle")
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Terjadi kesalahan. Silakan coba lagi.")
      }
    }
  }

  if (formState === "success") {
    return (
      <div className="w-full flex flex-col items-center justify-center py-6 text-center">
        <span className="auth-icon-badge auth-icon-badge-success mb-4 h-14 w-14 rounded-full">
          <CheckCircle className="w-7 h-7" />
        </span>

        <h3 className="text-lg font-mono font-bold text-foreground mb-1 tracking-tight">
          Pendaftaran Berhasil!
        </h3>

        <p className="text-interface text-xs text-muted-foreground mb-5">
          {email}
        </p>

        <p className="text-narrative text-sm leading-relaxed text-foreground mb-5">
          Email konfirmasi sudah dikirim. Saat giliran kamu tiba, tim kami akan mengirim email undangan berisi link pendaftaran.
        </p>

        <div className="auth-feedback-warning w-full flex items-start gap-2.5 text-left">
          <WarningTriangle className="h-4 w-4 min-w-4 mt-0.5" />
          <p className="text-interface text-xs leading-relaxed text-foreground">
            Periksa folder <span className="font-bold">Inbox/Primary</span>, <span className="font-bold">Spam</span>, <span className="font-bold">Update</span>, atau <span className="font-bold">Promosi</span> — email kami bisa masuk ke folder mana saja.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="space-y-2">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Nama depan"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value)
              setError(null)
            }}
            disabled={formState === "loading"}
            className="auth-input pl-10"
            required
          />
        </div>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Nama belakang"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value)
              setError(null)
            }}
            disabled={formState === "loading"}
            className="auth-input pl-10"
            required
          />
        </div>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="email"
            placeholder="Masukkan email kamu"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            disabled={formState === "loading"}
            className="auth-input pl-10"
            aria-invalid={!!error}
            required
          />
        </div>
        {error && (
          <p className="auth-feedback-error" role="alert">{error}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={formState === "loading"}
        className="group auth-cta relative inline-flex w-full items-center justify-center gap-2 overflow-hidden px-4 auth-focus-ring disabled:cursor-not-allowed"
      >
        <span
          className="auth-btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
          aria-hidden="true"
        />
        <span className="relative z-10">
        {formState === "loading" ? "MENDAFTAR..." : "DAFTAR WAITING LIST"}
        </span>
      </button>

      <p className="text-xs text-center text-muted-foreground font-sans">
        Dengan mendaftar, kamu akan menerima email undangan saat giliran kamu tiba.
      </p>
    </form>
  )
}
