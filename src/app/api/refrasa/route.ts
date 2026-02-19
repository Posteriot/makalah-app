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
 * Analyze and improve text using Refrasa constitution.
 * Constitution is optional — if none active, basic naturalness rules apply.
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
    const isAuthed = await isAuthenticated()
    if (!isAuthed) {
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

    // 3. Fetch active constitution
    let constitutionContent: string | null = null

    try {
      const activeConstitution = await fetchQuery(api.styleConstitutions.getActive)
      if (activeConstitution?.content) {
        constitutionContent = activeConstitution.content
      }
    } catch (error) {
      console.error("[Refrasa API] Failed to fetch constitution:", error)
      // Continue without constitution
    }

    // 4. Build prompt (split: system instructions + user input)
    const { system, prompt } = buildRefrasaPrompt(content, constitutionContent)

    // 5. Call LLM with generateObject
    // system = constitution + instructions (highest LLM compliance)
    // prompt = user text input
    // Primary: Gateway, Fallback: OpenRouter
    let result: RefrasaResponse

    try {
      // Try primary provider (Gateway)
      const primaryModel = await getGatewayModel()

      const { object } = await generateObject({
        model: primaryModel,
        schema: RefrasaOutputSchema,
        system,
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
          system,
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
