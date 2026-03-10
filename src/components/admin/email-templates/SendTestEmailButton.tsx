"use client"

import { useState } from "react"
import { Send } from "iconoir-react"
import { toast } from "sonner"
import type { BrandSettings, EmailSection } from "@/lib/email/template-renderer"

interface SendTestEmailButtonProps {
  templateType: string
  sections: EmailSection[]
  brandSettings: BrandSettings | null
  subject: string
  availablePlaceholders: { key: string; description: string; example: string }[]
  adminEmail: string
  disabled?: boolean
}

export function SendTestEmailButton(props: SendTestEmailButtonProps) {
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!props.brandSettings || sending) return
    setSending(true)
    try {
      const res = await fetch("/api/admin/email-templates/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType: props.templateType,
          sections: props.sections,
          brandSettings: props.brandSettings,
          subject: props.subject,
          availablePlaceholders: props.availablePlaceholders,
          adminEmail: props.adminEmail,
        }),
      })
      if (res.ok) {
        toast.success(`Email test terkirim ke ${props.adminEmail}`)
      } else {
        const data = await res.json()
        toast.error(data.error || "Gagal mengirim email test")
      }
    } catch {
      toast.error("Gagal mengirim email test")
    } finally {
      setSending(false)
    }
  }

  return (
    <button
      onClick={handleSend}
      disabled={sending || !props.brandSettings || props.disabled}
      className="flex items-center gap-1.5 rounded-action border border-border px-3 py-2 text-interface text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
    >
      <Send className="h-3.5 w-3.5" />
      {sending ? "Mengirim..." : "Kirim Test"}
    </button>
  )
}
