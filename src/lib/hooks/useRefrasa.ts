"use client"

import { useState, useCallback } from "react"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import type { RefrasaResponse, RefrasaIssue } from "@/lib/refrasa/types"

interface UseRefrasaState {
  isLoading: boolean
  result: RefrasaResponse | null
  error: string | null
}

interface UseRefrasaOptions {
  conversationId: Id<"conversations"> | null
  userId: Id<"users"> | null
  onArtifactCreated?: (artifactId: Id<"artifacts">, title: string) => void
}

interface UseRefrasaReturn extends UseRefrasaState {
  analyzeAndRefrasa: (content: string, sourceArtifactId: Id<"artifacts">, sourceTitle: string) => Promise<void>
  reset: () => void
  issueCount: number
  issuesByCategory: {
    naturalness: RefrasaIssue[]
    style: RefrasaIssue[]
  }
}

export function useRefrasa(options: UseRefrasaOptions): UseRefrasaReturn {
  const [state, setState] = useState<UseRefrasaState>({
    isLoading: false,
    result: null,
    error: null,
  })

  const createRefrasaMutation = useMutation(api.artifacts.createRefrasa)

  const analyzeAndRefrasa = useCallback(
    async (content: string, sourceArtifactId: Id<"artifacts">, sourceTitle: string) => {
      if (!options.conversationId || !options.userId) return
      setState({ isLoading: true, result: null, error: null })

      try {
        const response = await fetch("/api/refrasa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, artifactId: sourceArtifactId }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.error || `Request failed with status ${response.status}`
          )
        }

        const data: RefrasaResponse = await response.json()

        // Persist to DB
        const { artifactId } = await createRefrasaMutation({
          conversationId: options.conversationId,
          userId: options.userId,
          sourceArtifactId,
          content: data.refrasedText,
          refrasaIssues: data.issues,
        })

        setState({ isLoading: false, result: data, error: null })

        // Notify caller to open tab
        options.onArtifactCreated?.(artifactId, sourceTitle)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Terjadi kesalahan saat memproses"
        setState({ isLoading: false, result: null, error: errorMessage })
      }
    },
    [options.conversationId, options.userId, createRefrasaMutation, options.onArtifactCreated]
  )

  const reset = useCallback(() => {
    setState({ isLoading: false, result: null, error: null })
  }, [])

  const issueCount = state.result?.issues.length ?? 0

  const issuesByCategory = {
    naturalness: state.result?.issues.filter((i) => i.category === "naturalness") ?? [],
    style: state.result?.issues.filter((i) => i.category === "style") ?? [],
  }

  return {
    ...state,
    analyzeAndRefrasa,
    reset,
    issueCount,
    issuesByCategory,
  }
}
