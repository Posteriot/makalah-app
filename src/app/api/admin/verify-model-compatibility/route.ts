import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createOpenAI } from "@ai-sdk/openai"
import { generateText, generateObject, tool } from "ai"
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { z } from "zod"

/**
 * POST /api/admin/verify-model-compatibility
 *
 * Comprehensive model compatibility verification for OpenRouter fallback.
 * Tests: basic generation, tool calling, structured output (generateObject)
 *
 * Admin/superadmin only
 */

// Test schemas for verification
const SimpleToolSchema = z.object({
  title: z.string().min(1).max(100),
  type: z.enum(["note", "task", "reminder"]),
})

const ComplexToolSchema = z.object({
  items: z.array(z.object({
    name: z.string(),
    priority: z.enum(["low", "medium", "high"]),
    completed: z.boolean().optional(),
  })),
  summary: z.string(),
})

const StructuredOutputSchema = z.object({
  analysis: z.string().min(10),
  confidence: z.number().min(0).max(1),
  tags: z.array(z.string()),
})

interface VerificationResult {
  test: string
  passed: boolean
  duration: number
  error?: string
  details?: string
}

export async function POST(request: NextRequest) {
  // Auth check via Clerk
  const { userId, getToken } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const convexToken = await getToken({ template: "convex" })
  if (!convexToken) {
    return NextResponse.json({ error: "Convex token missing" }, { status: 500 })
  }
  const convexOptions = { token: convexToken }

  // Permission check (admin only)
  try {
    const convexUser = await fetchQuery(api.users.getUserByClerkId, {
      clerkUserId: userId,
    }, convexOptions)

    if (
      !convexUser ||
      (convexUser.role !== "admin" && convexUser.role !== "superadmin")
    ) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }
  } catch (error) {
    console.error("[VerifyModelCompatibility] Error checking user permissions:", error)
    return NextResponse.json({ error: "Permission check failed" }, { status: 500 })
  }

  // Parse request body
  let model: string
  let apiKey: string | undefined

  try {
    const body = await request.json()
    model = body.model
    apiKey = body.apiKey

    if (!model) {
      return NextResponse.json(
        { error: "Field wajib: model" },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const resolvedApiKey = apiKey?.trim() || process.env.OPENROUTER_API_KEY

  if (!resolvedApiKey) {
    return NextResponse.json(
      { error: "API key ENV tidak ditemukan untuk OpenRouter" },
      { status: 400 }
    )
  }

  // Create OpenRouter model instance
  const openRouterClient = createOpenAI({
    apiKey: resolvedApiKey,
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
      "X-Title": "Makalah App - Model Compatibility Verification",
    },
  })

  const testModel = openRouterClient(model)
  const results: VerificationResult[] = []

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 1: Basic Text Generation
  // ═══════════════════════════════════════════════════════════════════════════
  const test1Start = Date.now()
  try {
    const result = await generateText({
      model: testModel,
      prompt: "Respond with exactly: VERIFICATION_OK",
      temperature: 0.1,
    })

    results.push({
      test: "basic_generation",
      passed: result.text.includes("VERIFICATION_OK") || result.text.length > 0,
      duration: Date.now() - test1Start,
      details: `Response: "${result.text.substring(0, 100)}"`,
    })
  } catch (error) {
    results.push({
      test: "basic_generation",
      passed: false,
      duration: Date.now() - test1Start,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 2: Simple Tool Calling
  // ═══════════════════════════════════════════════════════════════════════════
  const test2Start = Date.now()
  try {
    const result = await generateText({
      model: testModel,
      prompt: "Create a note with title 'Test Note' and type 'note'. Use the createItem tool.",
      tools: {
        createItem: tool({
          description: "Create an item with a title and type",
          inputSchema: SimpleToolSchema,
          execute: async ({ title, type }) => {
            return { success: true, created: { title, type } }
          },
        }),
      },
      toolChoice: "required",
    })

    const toolCalled = result.toolCalls && result.toolCalls.length > 0
    results.push({
      test: "simple_tool_calling",
      passed: toolCalled,
      duration: Date.now() - test2Start,
      details: toolCalled
        ? `Tool called: ${result.toolCalls[0].toolName}`
        : "No tool was called",
    })
  } catch (error) {
    results.push({
      test: "simple_tool_calling",
      passed: false,
      duration: Date.now() - test2Start,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 3: Complex Tool Calling (nested arrays, enums)
  // ═══════════════════════════════════════════════════════════════════════════
  const test3Start = Date.now()
  try {
    const result = await generateText({
      model: testModel,
      prompt: `Create a task list with 2 items:
1. "Buy groceries" with priority "high"
2. "Call mom" with priority "medium" and completed=true
Include a summary. Use the createTaskList tool.`,
      tools: {
        createTaskList: tool({
          description: "Create a task list with multiple items",
          inputSchema: ComplexToolSchema,
          execute: async ({ items, summary }) => {
            return { success: true, created: { items, summary } }
          },
        }),
      },
      toolChoice: "required",
    })

    const toolCalled = result.toolCalls && result.toolCalls.length > 0
    let hasCorrectStructure = false

    if (toolCalled && result.toolResults && result.toolResults.length > 0) {
      const toolResult = result.toolResults[0]
      if (toolResult && typeof toolResult === 'object' && 'result' in toolResult) {
        const resultObj = toolResult.result as { created?: { items?: unknown[] } }
        hasCorrectStructure = Array.isArray(resultObj?.created?.items)
      }
    }

    results.push({
      test: "complex_tool_calling",
      passed: toolCalled && hasCorrectStructure,
      duration: Date.now() - test3Start,
      details: toolCalled
        ? `Tool called with ${hasCorrectStructure ? 'correct' : 'incorrect'} structure`
        : "No tool was called",
    })
  } catch (error) {
    results.push({
      test: "complex_tool_calling",
      passed: false,
      duration: Date.now() - test3Start,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 4: Structured Output (generateObject)
  // ═══════════════════════════════════════════════════════════════════════════
  const test4Start = Date.now()
  try {
    const result = await generateObject({
      model: testModel,
      schema: StructuredOutputSchema,
      prompt: "Analyze the word 'hello'. Provide analysis, confidence (0-1), and relevant tags.",
      temperature: 0.3,
    })

    const hasValidStructure =
      typeof result.object.analysis === 'string' &&
      typeof result.object.confidence === 'number' &&
      Array.isArray(result.object.tags)

    results.push({
      test: "structured_output",
      passed: hasValidStructure,
      duration: Date.now() - test4Start,
      details: `Generated object with ${result.object.tags?.length || 0} tags`,
    })
  } catch (error) {
    results.push({
      test: "structured_output",
      passed: false,
      duration: Date.now() - test4Start,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AGGREGATE RESULTS
  // ═══════════════════════════════════════════════════════════════════════════
  const allPassed = results.every(r => r.passed)
  const criticalPassed = results
    .filter(r => ["basic_generation", "simple_tool_calling"].includes(r.test))
    .every(r => r.passed)

  const compatibility = {
    full: allPassed,
    minimal: criticalPassed,
    level: allPassed ? "full" : criticalPassed ? "partial" : "incompatible",
  }

  // Determine which features are supported
  const supportedFeatures = {
    chat: results.find(r => r.test === "basic_generation")?.passed ?? false,
    simpleTool: results.find(r => r.test === "simple_tool_calling")?.passed ?? false,
    complexTool: results.find(r => r.test === "complex_tool_calling")?.passed ?? false,
    structuredOutput: results.find(r => r.test === "structured_output")?.passed ?? false,
  }

  // Feature mapping to codebase features
  const featureSupport = {
    "Chat Streaming": supportedFeatures.chat,
    "Title Generation": supportedFeatures.chat,
    "createArtifact Tool": supportedFeatures.simpleTool,
    "updateArtifact Tool": supportedFeatures.simpleTool,
    "renameConversationTitle Tool": supportedFeatures.simpleTool,
    "Paper Tools (complex)": supportedFeatures.complexTool,
    "Refrasa (generateObject)": supportedFeatures.structuredOutput,
  }

  return NextResponse.json({
    success: true,
    model,
    provider: "openrouter",
    compatibility,
    results,
    supportedFeatures,
    featureSupport,
    recommendation: allPassed
      ? "Model fully compatible for fallback use"
      : criticalPassed
        ? "Model partially compatible - some features may not work"
        : "Model NOT recommended for fallback use",
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
  })
}
