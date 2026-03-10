"use client"

import { Input } from "@/components/ui/input"
import { Trash } from "iconoir-react"
import type { EmailSection } from "@/lib/email/template-renderer"

interface SectionEditorProps {
  section: EmailSection
  onChange: (updated: EmailSection) => void
  onDelete: () => void
}

export function ButtonSectionEditor({
  section,
  onChange,
  onDelete,
}: SectionEditorProps) {
  return (
    <div className="rounded-action border border-border bg-card/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground cursor-grab">≡</span>
          <span className="text-signal rounded-badge bg-muted/50 px-1.5 py-0.5 text-[9px] font-bold">
            BUTTON
          </span>
        </div>
        <button
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-1.5">
        <label className="text-interface text-xs font-medium text-muted-foreground">
          Label
        </label>
        <Input
          value={section.label ?? ""}
          onChange={(e) => onChange({ ...section, label: e.target.value })}
          placeholder="Teks tombol..."
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-interface text-xs font-medium text-muted-foreground">
          URL
        </label>
        <Input
          value={section.url ?? ""}
          onChange={(e) => onChange({ ...section, url: e.target.value })}
          placeholder="https://..."
          className="font-mono text-xs"
        />
      </div>
    </div>
  )
}
