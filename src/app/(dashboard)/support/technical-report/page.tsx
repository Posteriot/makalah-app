"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { TechnicalReportForm } from "@/components/technical-report"
import type { TechnicalReportSource } from "@/lib/hooks/useTechnicalReport"

const allowedSources = new Set<TechnicalReportSource>([
  "chat-inline",
  "footer-link",
  "support-page",
])

export default function TechnicalReportPage() {
  const searchParams = useSearchParams()
  const source = useMemo<TechnicalReportSource>(() => {
    const candidate = searchParams.get("source")
    if (!candidate) return "support-page"
    return allowedSources.has(candidate as TechnicalReportSource)
      ? (candidate as TechnicalReportSource)
      : "support-page"
  }, [searchParams])

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Lapor Masalah Chat</h1>
        <p className="text-sm text-muted-foreground">
          Gunakan form ini untuk melapor kalau ada kendala saat chat atau paper session.
        </p>
      </div>

      <TechnicalReportForm source={source} />
    </div>
  )
}
