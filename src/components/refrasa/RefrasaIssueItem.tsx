"use client"

import type { RefrasaIssue } from "@/lib/refrasa/types"

interface RefrasaIssueItemProps {
  issue: RefrasaIssue
}

export function RefrasaIssueItem({ issue }: RefrasaIssueItemProps) {
  const { type, message, severity, suggestion } = issue

  const getSeverityClassName = function(): string {
    switch (severity) {
      case "critical":
        return "rounded-badge border border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300"
      case "warning":
        return "rounded-badge border border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      case "info":
      default:
        return "rounded-badge border border-slate-300/80 bg-slate-200/80 text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100"
    }
  }

  const getSeverityLabel = function(): string {
    switch (severity) {
      case "critical":
        return "KRITIS"
      case "warning":
        return "PERINGATAN"
      case "info":
      default:
        return "INFO"
    }
  }

  const getTypeLabel = function(): string {
    const labels: Record<string, string> = {
      vocabulary_repetition: "Pengulangan Kosa Kata",
      sentence_pattern: "Pola Kalimat",
      paragraph_rhythm: "Ritme Paragraf",
      hedging_balance: "Hedging Akademik",
      burstiness: "Variasi Kompleksitas",
      style_violation: "Pelanggaran Gaya",
    }
    return labels[type] || type
  }

  return (
    <div className="rounded-action border border-slate-300/80 p-2.5 space-y-1.5 dark:border-slate-700/70">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`${getSeverityClassName()} px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide`}>
          {getSeverityLabel()}
        </span>
        <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
          {getTypeLabel()}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-slate-900 dark:text-slate-100">
        {message}
      </p>

      {suggestion && (
        <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
          → {suggestion}
        </p>
      )}
    </div>
  )
}
