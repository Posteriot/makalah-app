"use client"

import type { Id } from "@convex/_generated/dataModel"

interface EmailTemplateEditorProps {
  templateType: string
  userId: Id<"users">
  onBack: () => void
}

export function EmailTemplateEditor({ templateType, onBack }: EmailTemplateEditorProps) {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-interface text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Kembali
      </button>
      <div className="text-interface text-sm text-muted-foreground">
        Template Editor &mdash; {templateType} (Task 13)
      </div>
    </div>
  )
}
