"use client"

import { useState, useEffect } from "react"

export interface ModelOption {
  value: string
  label: string
  context: number
  maxOutput: number
  tags: string[]
  provider: string
}

// Custom option — always appended to both arrays
const CUSTOM_OPTION: ModelOption = {
  value: "custom",
  label: "Custom (input manual)",
  context: 0,
  maxOutput: 0,
  tags: [],
  provider: "",
}

// Fallback when API fails (no context/output specs since offline)
const FALLBACK_GATEWAY_MODELS: ModelOption[] = [
  { value: "gemini-2.5-flash", label: "gemini-2.5-flash", context: 0, maxOutput: 0, tags: [], provider: "google" },
  { value: "gemini-2.5-flash-lite", label: "gemini-2.5-flash-lite", context: 0, maxOutput: 0, tags: [], provider: "google" },
  { value: "gemini-2.5-pro", label: "gemini-2.5-pro", context: 0, maxOutput: 0, tags: [], provider: "google" },
  { value: "gpt-4o", label: "gpt-4o", context: 0, maxOutput: 0, tags: [], provider: "openai" },
  { value: "gpt-4.1", label: "gpt-4.1", context: 0, maxOutput: 0, tags: [], provider: "openai" },
  { value: "claude-sonnet-4", label: "claude-sonnet-4", context: 0, maxOutput: 0, tags: [], provider: "anthropic" },
  { value: "claude-3.5-haiku", label: "claude-3.5-haiku", context: 0, maxOutput: 0, tags: [], provider: "anthropic" },
  CUSTOM_OPTION,
]

const FALLBACK_OPENROUTER_MODELS: ModelOption[] = [
  { value: "google/gemini-2.5-flash", label: "google/gemini-2.5-flash", context: 0, maxOutput: 0, tags: [], provider: "google" },
  { value: "google/gemini-2.5-flash-lite", label: "google/gemini-2.5-flash-lite", context: 0, maxOutput: 0, tags: [], provider: "google" },
  { value: "google/gemini-2.5-pro", label: "google/gemini-2.5-pro", context: 0, maxOutput: 0, tags: [], provider: "google" },
  { value: "openai/gpt-5.1", label: "openai/gpt-5.1", context: 0, maxOutput: 0, tags: [], provider: "openai" },
  { value: "openai/gpt-4o", label: "openai/gpt-4o", context: 0, maxOutput: 0, tags: [], provider: "openai" },
  { value: "anthropic/claude-sonnet-4", label: "anthropic/claude-sonnet-4", context: 0, maxOutput: 0, tags: [], provider: "anthropic" },
  { value: "anthropic/claude-3.5-haiku", label: "anthropic/claude-3.5-haiku", context: 0, maxOutput: 0, tags: [], provider: "anthropic" },
  CUSTOM_OPTION,
]

interface GatewayModelsResponse {
  gatewayModels: ModelOption[]
  openrouterModels: ModelOption[]
  fetchedAt: string
}

/**
 * Fetch available AI models from Gateway API.
 * Falls back to hardcoded list if fetch fails.
 * Fetches once on mount, caches in state.
 */
export function useGatewayModels() {
  const [gatewayModels, setGatewayModels] = useState<ModelOption[]>(FALLBACK_GATEWAY_MODELS)
  const [openrouterModels, setOpenrouterModels] = useState<ModelOption[]>(FALLBACK_OPENROUTER_MODELS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchModels() {
      try {
        const res = await fetch("/api/admin/gateway-models", {
          cache: "no-store",
        })

        if (!res.ok) {
          throw new Error(`Gateway models API returned ${res.status}`)
        }

        const data: GatewayModelsResponse = await res.json()

        if (cancelled) return

        console.log(`[useGatewayModels] Fetched ${data.gatewayModels.length} gateway models, ${data.openrouterModels.length} openrouter models`)

        // Append custom option to dynamic results
        setGatewayModels([...data.gatewayModels, CUSTOM_OPTION])
        setOpenrouterModels([...data.openrouterModels, CUSTOM_OPTION])
        setError(null)
      } catch (err) {
        if (cancelled) return

        const message = err instanceof Error ? err.message : "Failed to fetch models"
        console.warn("[useGatewayModels] Fetch failed, using fallback:", message)
        setError(message)
        // Keep fallback values (already set as initial state)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchModels()

    return () => {
      cancelled = true
    }
  }, [])

  return { gatewayModels, openrouterModels, isLoading, error }
}
