import { internalMutationGeneric } from "convex/server"

/**
 * Migration: Seed default AI provider config from environment variables
 *
 * Run with: npx convex run migrations:seedDefaultAIConfig
 *
 * This creates the initial config based on existing .env.local settings,
 * allowing smooth migration from hardcoded config to database-driven config.
 */
export const seedDefaultAIConfig = internalMutationGeneric({
  args: {},
  handler: async ({ db }) => {
    console.log("[Migration] Starting seedDefaultAIConfig...")

    // Check if any config already exists
    const existing = await db
      .query("aiProviderConfigs")
      .withIndex("by_active")
      .first()

    if (existing) {
      console.log("[Migration] AI config already exists, skipping seed")
      return {
        success: false,
        message: "Config already exists, migration skipped",
      }
    }

    // Find first superadmin to use as creator
    const superadmin = await db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "superadmin"))
      .first()

    if (!superadmin) {
      throw new Error(
        "No superadmin found. Create a superadmin user first before running this migration."
      )
    }

    // Get API keys from environment variables
    const gatewayKey = process.env.VERCEL_AI_GATEWAY_API_KEY
    const openrouterKey = process.env.OPENROUTER_API_KEY

    if (!gatewayKey || !openrouterKey) {
      throw new Error(
        "API keys not found in environment. Required: VERCEL_AI_GATEWAY_API_KEY, OPENROUTER_API_KEY"
      )
    }

    const now = Date.now()

    console.log("[Migration] Creating default config...")

    // Create default config matching current hardcoded settings
    const configId = await db.insert("aiProviderConfigs", {
      name: "Default Production Config",
      description: "Auto-generated from environment variables. Primary: Vercel AI Gateway, Fallback: OpenRouter",

      // Primary: Vercel AI Gateway
      primaryProvider: "vercel-gateway",
      primaryModel: "gemini-2.5-flash",
      // Fallback: OpenRouter
      fallbackProvider: "openrouter",
      fallbackModel: "openai/gpt-5.1",
      gatewayApiKey: gatewayKey,
      openrouterApiKey: openrouterKey,
      // Legacy slot-based keys (kept for compatibility)
      primaryApiKey: gatewayKey,
      fallbackApiKey: openrouterKey,

      // AI settings
      temperature: 0.7,
      topP: undefined,

      // Versioning
      version: 1,
      isActive: true, // Activate by default
      parentId: undefined,
      rootId: undefined,

      // Audit trail
      createdBy: superadmin._id,
      createdAt: now,
      updatedAt: now,
    })

    console.log(`[Migration] Success! Config ID: ${configId}`)

    return {
      success: true,
      configId,
      message: "Default AI provider config created and activated successfully",
    }
  },
})
