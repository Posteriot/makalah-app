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
        return "rounded-badge border border-[var(--ds-state-danger-border)] bg-[var(--ds-state-danger-bg)] text-[var(--ds-state-danger-fg)]"
      case "warning":
        return "rounded-badge border border-[var(--ds-state-warning-border)] bg-[var(--ds-state-warning-bg)] text-[var(--ds-state-warning-fg)]"
      case "info":
      default:
        return "rounded-badge border border-[var(--ds-artifact-chip-border)] bg-[var(--ds-artifact-chip-bg)] text-[var(--ds-artifact-chip-fg)]"
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
    <div className="rounded-action border border-[var(--ds-artifact-chip-border)] p-2.5 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`${getSeverityClassName()} px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide`}>
          {getSeverityLabel()}
        </span>
        <span className="text-[10px] font-mono text-[var(--ds-artifact-text-muted)]">
          {getTypeLabel()}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-[var(--ds-artifact-text-primary)]">
        {message}
      </p>

      {suggestion && (
        <p className="text-xs font-mono text-[var(--ds-artifact-text-muted)]">
          → {suggestion}
        </p>
      )}
    </div>
  )
}
