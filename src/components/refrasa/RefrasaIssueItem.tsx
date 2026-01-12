"use client"

import { Badge } from "@/components/ui/badge"
import type { RefrasaIssue } from "@/lib/refrasa/types"

interface RefrasaIssueItemProps {
  issue: RefrasaIssue
}

/**
 * RefrasaIssueItem - Display a single issue from Refrasa analysis
 *
 * Shows:
 * - Category badge (naturalness=purple, style=teal)
 * - Severity badge (info=blue, warning=yellow, critical=red)
 * - Message
 * - Suggestion (if exists)
 */
export function RefrasaIssueItem({ issue }: RefrasaIssueItemProps) {
  const { type, category, message, severity, suggestion } = issue

  // Severity badge colors (info=blue, warning=yellow, critical=red)
  const getSeverityClassName = () => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900 dark:text-red-300"
      case "warning":
        return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300"
      case "info":
      default:
        return "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300"
    }
  }

  const getSeverityLabel = () => {
    switch (severity) {
      case "critical":
        return "Kritis"
      case "warning":
        return "Peringatan"
      case "info":
      default:
        return "Info"
    }
  }

  // Category badge colors using custom classes
  const getCategoryClassName = () => {
    if (category === "naturalness") {
      return "bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900 dark:text-purple-300"
    }
    // style
    return "bg-teal-100 text-teal-700 hover:bg-teal-100 dark:bg-teal-900 dark:text-teal-300"
  }

  const getCategoryLabel = () => {
    return category === "naturalness" ? "Naturalness" : "Style"
  }

  // Type label mapping
  const getTypeLabel = () => {
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
    <div className="rounded-md border p-3 space-y-2">
      {/* Header with badges */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category badge */}
        <Badge variant="outline" className={getCategoryClassName()}>
          {getCategoryLabel()}
        </Badge>

        {/* Severity badge */}
        <Badge variant="outline" className={getSeverityClassName()}>
          {getSeverityLabel()}
        </Badge>

        {/* Type label */}
        <span className="text-xs text-muted-foreground">
          {getTypeLabel()}
        </span>
      </div>

      {/* Message */}
      <p className="text-sm">{message}</p>

      {/* Suggestion (if exists) */}
      {suggestion && (
        <p className="text-sm text-muted-foreground italic">
          Saran: {suggestion}
        </p>
      )}
    </div>
  )
}
