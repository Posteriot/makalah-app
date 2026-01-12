"use client"

import { useState, useCallback } from "react"
import type { RefrasaResponse, RefrasaIssue } from "@/lib/refrasa/types"

interface UseRefrasaState {
  isLoading: boolean
  result: RefrasaResponse | null
  error: string | null
}

interface UseRefrasaReturn extends UseRefrasaState {
  /** Analyze and refrasa the content */
  analyzeAndRefrasa: (content: string, artifactId?: string) => Promise<void>
  /** Reset state */
  reset: () => void
  /** Get issue count (for UI indicator) */
  issueCount: number
  /** Get issues grouped by category */
  issuesByCategory: {
    naturalness: RefrasaIssue[]
    style: RefrasaIssue[]
  }
}

/**
 * useRefrasa - Hook for managing Refrasa API calls
 *
 * Handles:
 * - Loading state
 * - Error handling
 * - Result storage
 * - Issue count for UI indicator
 */
export function useRefrasa(): UseRefrasaReturn {
  const [state, setState] = useState<UseRefrasaState>({
    isLoading: false,
    result: null,
    error: null,
  })

  const analyzeAndRefrasa = useCallback(
    async (content: string, artifactId?: string) => {
      setState({ isLoading: true, result: null, error: null })

      try {
        const response = await fetch("/api/refrasa", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content, artifactId }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.error || `Request failed with status ${response.status}`
          )
        }

        const data: RefrasaResponse = await response.json()
        setState({ isLoading: false, result: data, error: null })
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Terjadi kesalahan saat memproses"
        setState({ isLoading: false, result: null, error: errorMessage })
      }
    },
    []
  )

  const reset = useCallback(() => {
    setState({ isLoading: false, result: null, error: null })
  }, [])

  // Computed values
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
