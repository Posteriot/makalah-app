"use client"

import type { Id } from "@convex/_generated/dataModel"

interface EmailBrandSettingsEditorProps {
  userId: Id<"users">
}

export function EmailBrandSettingsEditor({ userId }: EmailBrandSettingsEditorProps) {
  return (
    <div className="text-interface text-sm text-muted-foreground">
      Brand Settings Editor (Task 10)
    </div>
  )
}
