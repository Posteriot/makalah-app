"use client"

import { useState, useEffect, useRef } from "react"
import type { BrandSettings, EmailSection } from "@/lib/email/template-renderer"
import { Skeleton } from "@/components/ui/skeleton"

interface EmailPreviewPanelProps {
  sections: EmailSection[]
  brandSettings: BrandSettings | null
  subject: string
}

export function EmailPreviewPanel({ sections, brandSettings, subject }: EmailPreviewPanelProps) {
  const [html, setHtml] = useState("")
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>(null)

  useEffect(() => {
    if (!brandSettings) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/admin/email-templates/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sections, brandSettings, subject }),
        })
        if (res.ok) {
          const data = await res.json()
          setHtml(data.html)
        }
      } catch (e) {
        console.error("Preview error:", e)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [sections, brandSettings, subject])

  if (!brandSettings) return <Skeleton className="h-96" />

  return (
    <div className="rounded-shell border border-border bg-white overflow-hidden">
      <div className="border-b border-border px-3 py-2">
        <span className="text-signal text-[10px] font-bold">PREVIEW</span>
      </div>
      {loading ? (
        <Skeleton className="h-96" />
      ) : (
        <iframe
          srcDoc={html}
          sandbox="allow-same-origin"
          className="w-full min-h-[500px] border-0"
          title="Email Preview"
        />
      )}
    </div>
  )
}
