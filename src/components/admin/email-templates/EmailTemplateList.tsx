"use client"

import type { Id } from "@convex/_generated/dataModel"

interface EmailTemplateListProps {
  userId: Id<"users">
  group: "auth" | "payment" | "notification"
}

export function EmailTemplateList({ userId, group }: EmailTemplateListProps) {
  return (
    <div className="text-interface text-sm text-muted-foreground">
      Template List — {group} (Task 11)
    </div>
  )
}
