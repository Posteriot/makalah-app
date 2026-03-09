"use client"

import type { Id } from "@convex/_generated/dataModel"

type ActiveView = "brand" | "auth" | "payment" | "notification"

interface EmailTemplatesManagerProps {
  userId: Id<"users">
  activeView: ActiveView
}

export function EmailTemplatesManager({ activeView }: EmailTemplatesManagerProps) {
  return (
    <div className="text-interface text-sm text-muted-foreground">
      Email Templates — {activeView} (coming soon)
    </div>
  )
}
