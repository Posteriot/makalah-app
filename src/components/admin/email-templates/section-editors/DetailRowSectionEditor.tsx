"use client"

import { Input } from "@/components/ui/input"
import { Trash, Plus, Minus } from "iconoir-react"
import type { EmailSection } from "@/lib/email/template-renderer"

interface SectionEditorProps {
  section: EmailSection
  onChange: (updated: EmailSection) => void
  onDelete: () => void
}

export function DetailRowSectionEditor({
  section,
  onChange,
  onDelete,
}: SectionEditorProps) {
  const rows = section.rows ?? []

  function updateRow(
    index: number,
    field: "label" | "value",
    newValue: string,
  ) {
    const updated = rows.map((row, i) =>
      i === index ? { ...row, [field]: newValue } : row,
    )
    onChange({ ...section, rows: updated })
  }

  function addRow() {
    onChange({ ...section, rows: [...rows, { label: "", value: "" }] })
  }

  function removeRow(index: number) {
    onChange({ ...section, rows: rows.filter((_, i) => i !== index) })
  }

  return (
    <div className="rounded-action border border-border bg-card/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground cursor-grab">≡</span>
          <span className="text-signal rounded-badge bg-muted/50 px-1.5 py-0.5 text-[9px] font-bold">
            DETAIL ROW
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
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <Input
              value={row.label}
              onChange={(e) => updateRow(index, "label", e.target.value)}
              placeholder="Label"
              className="flex-1 text-xs"
            />
            <Input
              value={row.value}
              onChange={(e) => updateRow(index, "value", e.target.value)}
              placeholder="Value"
              className="flex-1 text-xs"
            />
            <button
              onClick={() => removeRow(index)}
              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addRow}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Tambah baris</span>
      </button>
    </div>
  )
}
