"use client"

import { useCallback, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"

export type TechnicalReportSource = "chat-inline" | "footer-link" | "support-page"

export type SubmitTechnicalReportInput = {
  source: TechnicalReportSource
  description: string
  issueCategory?: string
  conversationId?: Id<"conversations">
  paperSessionId?: Id<"paperSessions">
  contextSnapshot?: Record<string, unknown>
}

export function useTechnicalReport() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const contexts = useQuery(api.technicalReports.listRecentChatContexts)
  const submitMutation = useMutation(api.technicalReports.submitTechnicalReport)

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
    contexts: contexts ?? [],
    submitReport,
    isSubmitting,
  }
}
