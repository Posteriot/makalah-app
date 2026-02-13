import { isAuthenticated } from "@/lib/auth-server"
import { generateObject } from "ai"
import { fetchQuery } from "convex/nextjs"
import { NextResponse } from "next/server"

import { api } from "../../../../convex/_generated/api"
import { buildRefrasaPrompt } from "@/lib/refrasa/prompt-builder"
import { RefrasaOutputSchema, RequestBodySchema } from "@/lib/refrasa/schemas"
import type { RefrasaResponse } from "@/lib/refrasa/types"
import { getGatewayModel, getOpenRouterModel } from "@/lib/ai/streaming"

/**
 * Set maxDuration for Vercel Functions
 * Refrasa analysis can take time for long documents
 */
export const maxDuration = 300

/**
 * POST /api/refrasa
 *
 * Analyze and improve text using two-layer architecture:
 * - Layer 1: Core Naturalness Criteria (hardcoded)
 * - Layer 2: Style Constitution (from database, optional)
 *
 * Request body:
 * - content: string (min 50 chars) - Text to analyze
 * - artifactId?: string - Optional artifact ID for tracking
 *
 * Response:
 * - issues: RefrasaIssue[] - List of issues found and fixed
 * - refrasedText: string - Improved text
 */
export async function POST(req: Request) {
  try {
    // 1. Authenticate with BetterAuth
    const session = await isAuthenticated()
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 2. Parse and validate request body
    const body = await req.json()
    const validationResult = RequestBodySchema.safeParse(body)

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ")
      return NextResponse.json(
        { error: `Validation error: ${errorMessage}` },
        { status: 400 }
      )
    }

    const { content } = validationResult.data

    // 3. Fetch active Style Constitution (Layer 2)
    // If no active constitution, proceed with Layer 1 only
    let constitutionContent: string | null = null
    try {
      const activeConstitution = await fetchQuery(
        api.styleConstitutions.getActive
      )
      if (activeConstitution?.content) {
        constitutionContent = activeConstitution.content
      }
    } catch (error) {
      console.error("[Refrasa API] Failed to fetch Style Constitution:", error)
      // Continue with Layer 1 only
    }

    // 4. Build two-layer prompt
    const prompt = buildRefrasaPrompt(content, constitutionContent)

    // 5. Call LLM with generateObject
    // Primary: Gateway, Fallback: OpenRouter
    let result: RefrasaResponse

    try {
      // Try primary provider (Gateway)
      const primaryModel = await getGatewayModel()

      const { object } = await generateObject({
        model: primaryModel,
        schema: RefrasaOutputSchema,
        prompt,
        temperature: 0.7,
      })

      result = {
        issues: object.issues,
        refrasedText: object.refrasedText,
      }
    } catch (primaryError) {
      // Fallback to OpenRouter
      console.error("[Refrasa API] Primary provider failed:", primaryError)

      try {
        const fallbackModel = await getOpenRouterModel()

        const { object } = await generateObject({
          model: fallbackModel,
          schema: RefrasaOutputSchema,
          prompt,
          temperature: 0.7,
        })

        result = {
          issues: object.issues,
          refrasedText: object.refrasedText,
        }
      } catch (fallbackError) {
        console.error("[Refrasa API] Fallback provider also failed:", fallbackError)
        return NextResponse.json(
          { error: "Failed to process text. Please try again later." },
          { status: 500 }
        )
      }
    }

    // 6. Return structured response
    return NextResponse.json(result)
  } catch (error) {
    console.error("[Refrasa API] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
