"use client"

import React from "react"
import { Page } from "iconoir-react"
import { STAGE_ORDER } from "../../../convex/paperSessions/constants"
import { cn } from "@/lib/utils"

interface PaperSessionBadgeProps {
  stageNumber: number
  totalStages?: number
  className?: string
}

/**
 * Small badge indicating conversation has paper session.
 * Shows current stage number (e.g., "2/13")
 */
export const PaperSessionBadge: React.FC<PaperSessionBadgeProps> = ({
  stageNumber,
  totalStages = STAGE_ORDER.length,
  className,
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-badge border border-[var(--ds-state-success-border)] bg-[var(--ds-status-progress-success)] px-1.5 py-0.5 text-[10px] font-mono font-bold tracking-wide text-[var(--ds-sidebar-cta-fg)]",
        className
      )}
      title={`Paper mode: Tahap ${stageNumber} dari ${totalStages}`}
    >
      <Page className="h-2.5 w-2.5" />
      {stageNumber}/{totalStages}
    </span>
  )
}
