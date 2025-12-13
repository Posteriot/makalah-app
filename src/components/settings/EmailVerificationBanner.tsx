"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useClerk } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { toast } from "sonner"

export function EmailVerificationBanner() {
  const { user } = useClerk()
  const [isSending, setIsSending] = useState(false)

  const handleResend = async () => {
    if (!user) return

    setIsSending(true)
    try {
      const emailAddress = user.primaryEmailAddress
      if (emailAddress) {
        await emailAddress.prepareVerification({ strategy: "email_code" })
        toast.success("Email verifikasi telah dikirim. Silakan cek inbox Anda.")
      }
    } catch {
      toast.error("Gagal mengirim email verifikasi. Silakan coba lagi.")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Email Belum Diverifikasi</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          Silakan verifikasi email Anda untuk mengakses semua fitur aplikasi.
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResend}
          disabled={isSending}
          className="ml-4"
        >
          {isSending ? "Mengirim..." : "Kirim Ulang"}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
