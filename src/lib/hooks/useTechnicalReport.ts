"use client"

import { useCallback, useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"

export type TechnicalReportSource = "chat-inline" | "footer-link" | "support-page"

export type SubmitTechnicalReportInput = {
  source: TechnicalReportSource
  description: string
  issueCategory?: string
  conversationId?: Id<"conversations">
  paperSessionId?: Id<"paperSessions">
  contextSnapshot?: Record<string, unknown>
}

export type TechnicalReportChatContext = {
  conversationId: Id<"conversations">
  title: string
  lastMessageAt?: number
  paperSessionId: Id<"paperSessions"> | null
  currentStage: string | null
}

export function useTechnicalReport() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useCurrentUser()
  const conversations = useQuery(
    api.conversations.listConversations,
    user?._id ? { userId: user._id } : "skip"
  )
  const submitMutation = useMutation(api.technicalReports.submitTechnicalReport)

  const contexts = useMemo<TechnicalReportChatContext[]>(
    () =>
      (conversations ?? []).slice(0, 5).map((conversation) => ({
        conversationId: conversation._id,
        title: conversation.title || "Percakapan tanpa judul",
        lastMessageAt: conversation.lastMessageAt,
        paperSessionId: null,
        currentStage: null,
      })),
    [conversations]
  )

  const submitReport = useCallback(
    async (input: SubmitTechnicalReportInput) => {
      setIsSubmitting(true)
      try {
        return await submitMutation(input)
      } finally {
        setIsSubmitting(false)
      }
    },
    [submitMutation]
  )

  return {
    contexts,
    submitReport,
    isSubmitting,
  }
}
