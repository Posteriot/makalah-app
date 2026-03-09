"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { useState } from "react"
import { TEMPLATE_LABELS } from "@convex/emailTemplates"
import { Skeleton } from "@/components/ui/skeleton"
import { EmailTemplateEditor } from "./EmailTemplateEditor"

interface EmailTemplateListProps {
  userId: Id<"users">
  group: "auth" | "payment" | "notification"
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function EmailTemplateList({ userId, group }: EmailTemplateListProps) {
  const [selectedTemplateType, setSelectedTemplateType] = useState<string | null>(null)

  const templates = useQuery(api.emailTemplates.getTemplatesByGroup, {
    requestorId: userId,
    group,
  })

  // Drill-down view
  if (selectedTemplateType) {
    return (
      <EmailTemplateEditor
        templateType={selectedTemplateType}
        userId={userId}
        onBack={() => setSelectedTemplateType(null)}
      />
    )
  }

  // Loading state
  if (templates === undefined) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-shell" />
        ))}
      </div>
    )
  }

  // Empty state
  if (templates.length === 0) {
    return (
      <div className="text-interface text-sm text-muted-foreground">
        Belum ada template untuk grup ini.
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-3">
      {templates.map((template) => (
        <button
          key={template._id}
          type="button"
          onClick={() => setSelectedTemplateType(template.templateType)}
          className="w-full rounded-shell border border-border bg-card/60 p-4 text-left transition-colors hover:bg-card/80 cursor-pointer"
        >
          <div className="space-y-2">
            <h3 className="text-interface text-sm font-medium text-foreground">
              {TEMPLATE_LABELS[template.templateType] ?? template.templateType}
            </h3>

            <p className="text-interface font-mono text-xs text-muted-foreground truncate">
              Subject: {template.subject}
            </p>

            <div className="flex items-center gap-3">
              {template.isActive ? (
                <span className="text-signal rounded-badge border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                  AKTIF
                </span>
              ) : (
                <span className="text-signal rounded-badge border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  NONAKTIF
                </span>
              )}

              <span className="text-interface text-xs text-muted-foreground">
                Version {template.version}
                {template.updatedAt && ` \u2022 ${formatDate(template.updatedAt)}`}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
