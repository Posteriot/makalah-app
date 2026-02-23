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
        return "rounded-badge border border-[color:var(--chat-destructive)] bg-[var(--chat-destructive)] text-[var(--chat-destructive-foreground)]"
      case "warning":
        return "rounded-badge border border-[color:var(--chat-warning)] bg-[var(--chat-warning)] text-[var(--chat-warning-foreground)]"
      case "info":
      default:
        return "rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] text-[var(--chat-secondary-foreground)]"
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
    <div className="rounded-action border border-[color:var(--chat-border)] p-2.5 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`${getSeverityClassName()} px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide`}>
          {getSeverityLabel()}
        </span>
        <span className="text-[10px] font-mono text-[var(--chat-muted-foreground)]">
          {getTypeLabel()}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-[var(--chat-foreground)]">
        {message}
      </p>

      {suggestion && (
        <p className="text-xs font-mono text-[var(--chat-muted-foreground)]">
          → {suggestion}
        </p>
      )}
    </div>
  )
}
