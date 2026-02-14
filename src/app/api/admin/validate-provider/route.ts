import { NextRequest, NextResponse } from "next/server"
import { isAuthenticated, getToken } from "@/lib/auth-server"
import { createOpenAI } from "@ai-sdk/openai"
import { createGateway } from "@ai-sdk/gateway"
import { generateText } from "ai"
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"

/**
 * POST /api/admin/validate-provider
 * Test AI provider connection before saving config
 * Admin/superadmin only
 */
export async function POST(request: NextRequest) {
  // Auth check via BetterAuth
  const isAuthed = await isAuthenticated()
  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const convexToken = await getToken()
  if (!convexToken) {
    return NextResponse.json({ error: "Convex token missing" }, { status: 500 })
  }
  const convexOptions = { token: convexToken }

  // Permission check (admin only)

  try {
    const convexUser = await fetchQuery(api.users.getMyUser, {}, convexOptions)

    if (
      !convexUser ||
      (convexUser.role !== "admin" && convexUser.role !== "superadmin")
    ) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }
  } catch (error) {
    console.error("[ValidateProvider] Error checking user permissions:", error)
    return NextResponse.json({ error: "Permission check failed" }, { status: 500 })
  }

  // Parse request body
  let provider: string
  let model: string
  let apiKey: string | undefined

  try {
    const body = await request.json()
    provider = body.provider
    model = body.model
    apiKey = body.apiKey

    if (!provider || !model) {
      return NextResponse.json(
        { error: "Field wajib: provider, model" },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Validate provider configuration
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let testModel: any

    if (provider === "vercel-gateway") {
      // Vercel AI Gateway: Use model ID as string
      if (!model || typeof model !== "string") {
        throw new Error("Invalid model ID format")
      }

      const resolvedApiKey =
        apiKey?.trim() || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY

      if (!resolvedApiKey) {
        return NextResponse.json(
          { error: "API key ENV tidak ditemukan untuk Vercel AI Gateway" },
          { status: 400 }
        )
      }

      const gateway = createGateway({ apiKey: resolvedApiKey })
      const targetModel =
        model.includes("gemini") && !model.includes("/") ? `google/${model}` : model
      testModel = gateway(targetModel)
    } else if (provider === "openrouter") {
      // OpenRouter: Test with provided API key
      const resolvedApiKey = apiKey?.trim() || process.env.OPENROUTER_API_KEY

      if (!resolvedApiKey) {
        return NextResponse.json(
          { error: "API key ENV tidak ditemukan untuk OpenRouter" },
          { status: 400 }
        )
      }

      const openRouterOpenAI = createOpenAI({
        apiKey: resolvedApiKey,
        baseURL: "https://openrouter.ai/api/v1",
        headers: {
          "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
          "X-Title": "Makalah App - Config Validation",
        },
      })

      testModel = openRouterOpenAI(model)
    } else {
      return NextResponse.json(
        { error: `Unknown provider: ${provider}. Supported: vercel-gateway, openrouter` },
        { status: 400 }
      )
    }

    // Send test prompt to validate connection
    const result = await generateText({
      model: testModel,
      prompt: "Say 'OK' if you can read this.",
      temperature: 0.3,
    })

    return NextResponse.json({
      success: true,
      message: "Provider berhasil divalidasi",
      response: result.text,
      provider,
      model,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("[ValidateProvider] Validation failed:", error)

    // Extract useful error message
    let errorMessage = "Validation failed"
    if (error.message) {
      errorMessage = error.message
    } else if (error.cause?.message) {
      errorMessage = error.cause.message
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        provider,
        model,
      },
      { status: 400 }
    )
  }
}
