"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Mail, User, CheckCircle } from "iconoir-react"
import { toast } from "sonner"
import { sendConfirmationEmail } from "@/app/(auth)/waiting-list/actions"

type FormState = "idle" | "loading" | "success"

export function WaitlistForm() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [formState, setFormState] = useState<FormState>("idle")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

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
      sendConfirmationEmail(email).catch((err) => {
        console.error("Failed to send confirmation email:", err)
      })

      setFormState("success")

      // Show success toast
      toast.success("Berhasil terdaftar!", {
        description: "Cek email kamu untuk konfirmasi. Kalau belum masuk dalam 3-5 menit, cek folder Spam/Junk/Promosi.",
      })

      // Redirect after short delay
      setTimeout(() => {
        router.push("/?waitlist=success")
      }, 1500)
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
      <div className="w-full flex flex-col items-center justify-center py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h3 className="text-lg font-mono font-bold text-foreground mb-2 tracking-tight">
          Pendaftaran Berhasil!
        </h3>
        <p className="text-sm text-muted-foreground">
          Mengalihkan ke halaman utama...
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="space-y-2">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Nama depan"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value)
              setError(null)
            }}
            disabled={formState === "loading"}
            className="pl-10 h-10 rounded-action border-border bg-background font-mono text-sm focus:ring-primary focus:border-primary"
            required
          />
        </div>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Nama belakang"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value)
              setError(null)
            }}
            disabled={formState === "loading"}
            className="pl-10 h-10 rounded-action border-border bg-background font-mono text-sm focus:ring-primary focus:border-primary"
            required
          />
        </div>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder="Masukkan email kamu"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            disabled={formState === "loading"}
            className="pl-10 h-10 rounded-action border-border bg-background font-mono text-sm focus:ring-primary focus:border-primary"
            aria-invalid={!!error}
            required
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={formState === "loading" || !firstName.trim() || !lastName.trim() || !email}
        className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-mono font-bold text-xs uppercase tracking-widest rounded-action hover-slash"
      >
        {formState === "loading" ? (
          <>
            <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>MENDAFTAR...</span>
          </>
        ) : (
          <span>DAFTAR WAITING LIST</span>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground font-sans">
        Dengan mendaftar, kamu akan menerima email undangan saat giliran kamu tiba.
      </p>
    </form>
  )
}
