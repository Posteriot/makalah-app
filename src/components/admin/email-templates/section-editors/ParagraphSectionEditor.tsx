"use client"

import { Textarea } from "@/components/ui/textarea"
import { Trash } from "iconoir-react"
import type { EmailSection } from "@/lib/email/template-renderer"

interface SectionEditorProps {
  section: EmailSection
  onChange: (updated: EmailSection) => void
  onDelete: () => void
}

export function ParagraphSectionEditor({
  section,
  onChange,
  onDelete,
}: SectionEditorProps) {
  const hasPlaceholder = section.content?.includes("{{")

  return (
    <div className="rounded-action border border-border bg-card/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground cursor-grab">≡</span>
          <span className="text-signal rounded-badge bg-muted/50 px-1.5 py-0.5 text-[9px] font-bold">
            PARAGRAPH
          </span>
        </div>
        <button
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash className="h-3.5 w-3.5" />
        </button>
      </div>
      <Textarea
        value={section.content ?? ""}
        onChange={(e) => onChange({ ...section, content: e.target.value })}
        placeholder="Teks paragraf..."
        rows={4}
      />
      {hasPlaceholder && (
        <p className="text-[10px] text-muted-foreground font-mono">
          Mengandung placeholder dinamis
        </p>
      )}
    </div>
  )
}
