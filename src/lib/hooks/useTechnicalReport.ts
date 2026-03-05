"use client"

import { useCallback, useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import {
  isMissingConvexFunctionError,
  toUserFriendlyTechnicalReportError,
} from "@/lib/technical-report/submitFallback"

export type TechnicalReportSource = "chat-inline" | "footer-link" | "support-page"

export type SubmitTechnicalReportInput = {
  source: TechnicalReportSource
  description: string
  issueCategory?: string
  conversationId?: Id<"conversations">
  paperSessionId?: Id<"paperSessions">
  contextSnapshot?: Record<string, unknown>
}

type SubmitTechnicalReportResult = {
  reportId: string
  status: "open"
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
        return (await submitMutation(input)) as SubmitTechnicalReportResult
      } catch (error) {
        if (isMissingConvexFunctionError(error, "technicalReports:submitTechnicalReport")) {
          const response = await fetch("/api/support/technical-report", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...input,
              reporterUserId: user?._id ? String(user._id) : undefined,
              reporterEmail: user?.email,
              reporterName: [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || undefined,
            }),
          })

          if (!response.ok) {
            const fallbackError = await response.json().catch(() => null) as { error?: string } | null
            throw new Error(
              fallbackError?.error || "Laporan teknis belum dapat dikirim. Silakan coba beberapa saat lagi."
            )
          }

          return (await response.json()) as SubmitTechnicalReportResult
        }

        throw new Error(toUserFriendlyTechnicalReportError(error))
      } finally {
        setIsSubmitting(false)
      }
    },
    [submitMutation, user?._id, user?.email, user?.firstName, user?.lastName]
  )

  return {
    contexts,
    submitReport,
    isSubmitting,
  }
}
