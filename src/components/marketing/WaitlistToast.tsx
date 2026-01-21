"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

export function WaitlistToast() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const waitlist = searchParams.get("waitlist")

    if (waitlist === "success") {
      toast.success("Berhasil terdaftar di waiting list!", {
        description: "Kami akan menghubungi kamu saat akses dibuka.",
        duration: 5000,
      })

      // Remove URL parameter
      const url = new URL(window.location.href)
      url.searchParams.delete("waitlist")
      window.history.replaceState({}, "", url.toString())
    }
  }, [searchParams])

  return null
}
