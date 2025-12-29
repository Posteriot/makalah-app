import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"

/**
 * POST /api/admin/validate-provider
 * Test AI provider connection before saving config
 * Admin/superadmin only
 */
export async function POST(request: NextRequest) {
  // Auth check via Clerk
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Permission check (admin only)

  try {
    const convexUser = await fetchQuery(api.users.getUserByClerkId, {
      clerkUserId: userId,
    })

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
  let apiKey: string

  try {
    const body = await request.json()
    provider = body.provider
    model = body.model
    apiKey = body.apiKey

    if (!provider || !model || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields: provider, model, apiKey" },
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
      // Note: Cannot set custom API key for gateway, uses VERCEL_AI_GATEWAY_API_KEY from env
      // This validation just checks if model ID is valid format
      if (!model || typeof model !== "string") {
        throw new Error("Invalid model ID format")
      }

      // For gateway, we use the model ID directly (AI SDK handles routing)
      testModel = model

      console.log(`[ValidateProvider] Testing Vercel AI Gateway with model: ${model}`)
    } else if (provider === "openrouter") {
      // OpenRouter: Test with provided API key
      const openRouterOpenAI = createOpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        headers: {
          "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
          "X-Title": "Makalah App - Config Validation",
        },
      })

      testModel = openRouterOpenAI(model)

      console.log(`[ValidateProvider] Testing OpenRouter with model: ${model}`)
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

    console.log(`[ValidateProvider] Success! Response: ${result.text}`)

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
