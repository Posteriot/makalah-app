import { NextResponse } from "next/server"
import { isAuthenticated, getToken } from "@/lib/auth-server"
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"

const GATEWAY_MODELS_URL = "https://ai-gateway.vercel.sh/v1/models"
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"

interface GatewayModel {
  id: string
  owned_by: string
  name: string
  context_window: number
  max_tokens: number
  type: string
  tags: string[]
  pricing: { input: string; output: string }
}

interface OpenRouterModel {
  id: string
  name: string
  context_length: number
  top_provider?: { max_completion_tokens?: number }
  architecture?: { modality?: string }
}

interface ModelOption {
  value: string
  label: string
  context: number
  maxOutput: number
  tags: string[]
  provider: string
}

/**
 * Format large numbers as human-readable strings.
 * 1048576 -> "1M", 262144 -> "262K", 65536 -> "66K"
 */
function formatTokenCount(n: number): string {
  if (n >= 1_000_000) {
    const millions = n / 1_000_000
    return millions === Math.floor(millions)
      ? `${millions}M`
      : `${parseFloat(millions.toFixed(1))}M`
  }
  const thousands = Math.round(n / 1_000)
  return `${thousands}K`
}

/**
 * Build display label: "Gemini 2.5 Flash — 1M ctx / 66K out"
 */
function buildLabel(name: string, contextWindow: number, maxTokens: number): string {
  if (!contextWindow && !maxTokens) return name
  return `${name} \u2014 ${formatTokenCount(contextWindow || 0)} ctx / ${formatTokenCount(maxTokens || 0)} out`
}

/**
 * Strip provider prefix from model ID.
 * "google/gemini-2.5-flash" -> "gemini-2.5-flash"
 */
function stripProviderPrefix(id: string): string {
  const slashIndex = id.indexOf("/")
  return slashIndex !== -1 ? id.slice(slashIndex + 1) : id
}

/**
 * Extract provider name from OpenRouter model ID.
 * "openai/gpt-5.1" -> "openai"
 */
function extractProvider(id: string): string {
  const slashIndex = id.indexOf("/")
  return slashIndex !== -1 ? id.slice(0, slashIndex) : ""
}

/**
 * GET /api/admin/gateway-models
 * Fetch models from TWO sources:
 *  - Vercel AI Gateway API → for primary provider dropdown
 *  - OpenRouter API → for fallback provider dropdown
 * No filtering — admin chooses the appropriate model.
 * Admin/superadmin only.
 */
export async function GET() {
  // Auth check
  const isAuthed = await isAuthenticated()
  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const convexToken = await getToken()
  if (!convexToken) {
    return NextResponse.json({ error: "Convex token missing" }, { status: 500 })
  }

  // Permission check (admin only)
  try {
    const convexUser = await fetchQuery(api.users.getMyUser, {}, { token: convexToken })

    if (
      !convexUser ||
      (convexUser.role !== "admin" && convexUser.role !== "superadmin")
    ) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }
  } catch (error) {
    console.error("[GatewayModels] Error checking user permissions:", error)
    return NextResponse.json({ error: "Permission check failed" }, { status: 500 })
  }

  // Fetch from both APIs in parallel
  try {
    const [gatewayRes, openrouterRes] = await Promise.all([
      fetch(GATEWAY_MODELS_URL),
      fetch(OPENROUTER_MODELS_URL),
    ])

    // --- Gateway models (primary dropdown) ---
    let gatewayModels: ModelOption[] = []
    if (gatewayRes.ok) {
      const gatewayJson = await gatewayRes.json()
      const gatewayData: GatewayModel[] = Array.isArray(gatewayJson.data) ? gatewayJson.data : []

      gatewayData.sort((a, b) => {
        const providerCmp = (a.owned_by ?? "").localeCompare(b.owned_by ?? "")
        if (providerCmp !== 0) return providerCmp
        return (b.context_window ?? 0) - (a.context_window ?? 0)
      })

      gatewayModels = gatewayData.map((m) => ({
        value: stripProviderPrefix(m.id),
        label: buildLabel(m.name, m.context_window, m.max_tokens),
        context: m.context_window ?? 0,
        maxOutput: m.max_tokens ?? 0,
        tags: Array.isArray(m.tags) ? m.tags : [],
        provider: m.owned_by ?? "",
      }))
    } else {
      console.error(`[GatewayModels] Gateway API returned ${gatewayRes.status}`)
    }

    // --- OpenRouter models (fallback dropdown) ---
    let openrouterModels: ModelOption[] = []
    if (openrouterRes.ok) {
      const openrouterJson = await openrouterRes.json()
      const openrouterData: OpenRouterModel[] = Array.isArray(openrouterJson.data) ? openrouterJson.data : []

      openrouterData.sort((a, b) => {
        const providerCmpA = extractProvider(a.id)
        const providerCmpB = extractProvider(b.id)
        const providerCmp = providerCmpA.localeCompare(providerCmpB)
        if (providerCmp !== 0) return providerCmp
        return (b.context_length ?? 0) - (a.context_length ?? 0)
      })

      openrouterModels = openrouterData.map((m) => ({
        value: m.id,
        label: buildLabel(
          m.name,
          m.context_length ?? 0,
          m.top_provider?.max_completion_tokens ?? 0
        ),
        context: m.context_length ?? 0,
        maxOutput: m.top_provider?.max_completion_tokens ?? 0,
        tags: [],
        provider: extractProvider(m.id),
      }))
    } else {
      console.error(`[GatewayModels] OpenRouter API returned ${openrouterRes.status}`)
    }

    // If both APIs failed, return 502
    if (gatewayModels.length === 0 && openrouterModels.length === 0) {
      return NextResponse.json(
        { error: "Failed to fetch models from both APIs" },
        { status: 502 }
      )
    }

    return NextResponse.json(
      {
        gatewayModels,
        openrouterModels,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=7200",
        },
      }
    )
  } catch (error) {
    console.error("[GatewayModels] Failed to fetch models:", error)
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 502 }
    )
  }
}
