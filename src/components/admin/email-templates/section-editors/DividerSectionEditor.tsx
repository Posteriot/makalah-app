"use client"

import { Trash } from "iconoir-react"
import type { EmailSection } from "@/lib/email/template-renderer"

interface SectionEditorProps {
  section: EmailSection
  onChange: (updated: EmailSection) => void
  onDelete: () => void
}

export function DividerSectionEditor({
  section: _section,
  onChange: _onChange,
  onDelete,
}: SectionEditorProps) {
  return (
    <div className="rounded-action border border-border bg-card/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground cursor-grab">≡</span>
          <span className="text-signal rounded-badge bg-muted/50 px-1.5 py-0.5 text-[9px] font-bold">
            DIVIDER
          </span>
        </div>
        <button
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 py-1">
        <hr className="flex-1 border-border" />
        <span className="text-[10px] text-muted-foreground">
          Garis Pemisah
        </span>
        <hr className="flex-1 border-border" />
      </div>
    </div>
  )
}
