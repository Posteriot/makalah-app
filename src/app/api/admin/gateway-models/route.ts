import { NextResponse } from "next/server"
import { isAuthenticated, getToken } from "@/lib/auth-server"
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"

const GATEWAY_MODELS_URL = "https://ai-gateway.vercel.sh/v1/models"

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
    // Show integer if whole, otherwise 1 decimal
    return millions === Math.floor(millions)
      ? `${millions}M`
      : `${parseFloat(millions.toFixed(1))}M`
  }
  // Round to nearest K
  const thousands = Math.round(n / 1_000)
  return `${thousands}K`
}

/**
 * Build display label: "Gemini 2.5 Flash -- 1M ctx / 66K out"
 */
function buildLabel(name: string, contextWindow: number, maxTokens: number): string {
  return `${name} \u2014 ${formatTokenCount(contextWindow)} ctx / ${formatTokenCount(maxTokens)} out`
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
 * GET /api/admin/gateway-models
 * Fetch available models from Vercel AI Gateway API.
 * Filters to language models with vision + tool-use support.
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

  // Fetch models from Gateway API
  try {
    const response = await fetch(GATEWAY_MODELS_URL)

    if (!response.ok) {
      console.error(`[GatewayModels] Gateway API returned ${response.status}`)
      return NextResponse.json(
        { error: "Failed to fetch models from Gateway API" },
        { status: 502 }
      )
    }

    const json = await response.json()
    const data: GatewayModel[] = json.data ?? []

    // Filter: language models with vision AND tool-use
    const filtered = data.filter(
      (m) =>
        m.type === "language" &&
        m.tags.includes("vision") &&
        m.tags.includes("tool-use")
    )

    // Sort: owned_by alphabetical, then context_window descending
    filtered.sort((a, b) => {
      const providerCmp = a.owned_by.localeCompare(b.owned_by)
      if (providerCmp !== 0) return providerCmp
      return b.context_window - a.context_window
    })

    // Transform to ModelOption arrays
    const gatewayModels: ModelOption[] = filtered.map((m) => ({
      value: stripProviderPrefix(m.id),
      label: buildLabel(m.name, m.context_window, m.max_tokens),
      context: m.context_window,
      maxOutput: m.max_tokens,
      tags: m.tags,
      provider: m.owned_by,
    }))

    const openrouterModels: ModelOption[] = filtered.map((m) => ({
      value: m.id,
      label: buildLabel(m.name, m.context_window, m.max_tokens),
      context: m.context_window,
      maxOutput: m.max_tokens,
      tags: m.tags,
      provider: m.owned_by,
    }))

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
      { error: "Failed to fetch models from Gateway API" },
      { status: 502 }
    )
  }
}
