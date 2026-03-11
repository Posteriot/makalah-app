"use client"

import type { Id } from "@convex/_generated/dataModel"
import { EmailBrandSettingsEditor } from "./EmailBrandSettingsEditor"
import { EmailTemplateList } from "./EmailTemplateList"

type ActiveView = "brand" | "auth" | "payment" | "notification"

interface EmailTemplatesManagerProps {
  userId: Id<"users">
  activeView: ActiveView
}

export function EmailTemplatesManager({ userId, activeView }: EmailTemplatesManagerProps) {
  if (activeView === "brand") {
    return <EmailBrandSettingsEditor userId={userId} />
  }
  return <EmailTemplateList userId={userId} group={activeView} />
}
