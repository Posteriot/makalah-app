"use client"

import { LightBulb } from "iconoir-react"

type ToolGroup = {
  name: string
  total: number
  failures: number
  successRate: number
}

type AiSummaryNarrativeProps = {
  successRate: number
  totalRequests: number
  failureCount: number
  avgLatencyMs: number
  failoverCount: number
  failoverAllSuccess: boolean
  toolGroups: ToolGroup[]
}

export function AiSummaryNarrative({
  successRate,
  totalRequests,
  failureCount,
  avgLatencyMs,
  failoverCount,
  failoverAllSuccess,
  toolGroups,
}: AiSummaryNarrativeProps) {
  const parts: string[] = []

  // Main health assessment
  if (successRate >= 99) {
    parts.push(
      `Sistem AI berjalan sangat baik dalam 7 hari terakhir dengan tingkat keberhasilan ${successRate.toFixed(1)}% dari ${totalRequests.toLocaleString("id-ID")} permintaan.`
    )
  } else if (successRate >= 95) {
    parts.push(
      `Sistem AI berjalan baik secara keseluruhan dengan tingkat keberhasilan ${successRate.toFixed(1)}%.`
    )
  } else if (successRate >= 80) {
    parts.push(
      `Sistem AI mengalami beberapa gangguan — ${failureCount} dari ${totalRequests.toLocaleString("id-ID")} permintaan gagal (tingkat keberhasilan ${successRate.toFixed(1)}%).`
    )
  } else {
    parts.push(
      `⚠ Sistem AI mengalami gangguan serius — ${failureCount} dari ${totalRequests.toLocaleString("id-ID")} permintaan gagal (tingkat keberhasilan ${successRate.toFixed(1)}%).`
    )
  }

  // Tool-specific context
  const searchTool = toolGroups.find(
    (t) => t.name === "Pencarian Web" && t.failures > 0
  )
  if (searchTool) {
    parts.push(
      `Pencarian web sempat mengalami gangguan ringan (${searchTool.failures} kegagalan dari ${searchTool.total} permintaan).`
    )
  }

  const paperTool = toolGroups.find(
    (t) => t.name === "Penulisan Paper" && t.failures > 0
  )
  if (paperTool) {
    parts.push(
      `Penulisan paper mengalami ${paperTool.failures} kegagalan dari ${paperTool.total} permintaan.`
    )
  }

  // Failover context
  if (failoverCount > 0) {
    if (failoverAllSuccess) {
      parts.push(
        `Terjadi ${failoverCount} kali perpindahan ke server cadangan, namun semua berhasil ditangani.`
      )
    } else {
      parts.push(
        `Terjadi ${failoverCount} kali perpindahan ke server cadangan, dan beberapa di antaranya juga mengalami masalah.`
      )
    }
  }

  // Latency assessment
  if (avgLatencyMs < 1000) {
    parts.push("Kecepatan respons sangat cepat.")
  } else if (avgLatencyMs < 3000) {
    parts.push("Kecepatan respons normal.")
  } else {
    parts.push("Kecepatan respons lambat, perlu diperhatikan.")
  }

  return (
    <div className="flex gap-3 rounded-action border border-border bg-slate-50 px-4 py-3 dark:bg-slate-900/70">
      <LightBulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <p className="text-narrative text-xs leading-relaxed text-muted-foreground">
        {parts.join(" ")}
      </p>
    </div>
  )
}
