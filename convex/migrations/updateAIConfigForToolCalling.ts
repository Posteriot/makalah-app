import { internalMutation } from "../_generated/server"

/**
 * Migration script to update AI config to use models that support tool calling
 *
 * Problem: gemini-2.5-flash-lite is a "reasoning model" that doesn't properly support tool calling
 * Solution: Use gemini-2.0-flash-001 which has explicit function calling support
 *
 * Run via: npx convex run "migrations/updateAIConfigForToolCalling:updateAIConfigForToolCalling"
 */
export const updateAIConfigForToolCalling = internalMutation({
  handler: async ({ db }) => {
    // Find the currently active config
    const activeConfig = await db
      .query("aiProviderConfigs")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first()

    if (!activeConfig) {
      return {
        success: false,
        message: "No active AI config found",
      }
    }

    // Check if already using a tool-calling compatible model
    const toolCallingModels = [
      "google/gemini-2.0-flash-001",
      "google/gemini-2.0-flash",
      "google/gemini-2.5-flash",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "anthropic/claude-3-5-sonnet",
    ]

    if (toolCallingModels.includes(activeConfig.fallbackModel)) {
      return {
        success: false,
        message: `Config already uses tool-calling compatible model: ${activeConfig.fallbackModel}`,
      }
    }

    const now = Date.now()
    const newVersion = activeConfig.version + 1

    // Determine rootId
    const rootId = activeConfig.rootId ?? activeConfig._id

    // Create new version with updated model
    const newConfigId = await db.insert("aiProviderConfigs", {
      name: activeConfig.name,
      description: "Updated to use gemini-2.0-flash for tool calling support",
      primaryProvider: activeConfig.primaryProvider,
      primaryModel: activeConfig.primaryModel,
      fallbackProvider: activeConfig.fallbackProvider,
      fallbackModel: "google/gemini-2.0-flash-001", // Changed from gemini-2.5-flash-lite
      gatewayApiKey: activeConfig.gatewayApiKey
        ?? (activeConfig.primaryProvider === "vercel-gateway" ? activeConfig.primaryApiKey : activeConfig.fallbackApiKey)
        ?? "",
      openrouterApiKey: activeConfig.openrouterApiKey
        ?? (activeConfig.primaryProvider === "openrouter" ? activeConfig.primaryApiKey : activeConfig.fallbackApiKey)
        ?? "",
      primaryApiKey: activeConfig.primaryApiKey ?? "",
      fallbackApiKey: activeConfig.fallbackApiKey ?? "",
      temperature: activeConfig.temperature,
      version: newVersion,
      isActive: true,
      parentId: activeConfig._id,
      rootId: rootId,
      createdBy: activeConfig.createdBy,
      createdAt: now,
      updatedAt: now,
    })

    // Deactivate old config
    await db.patch(activeConfig._id, { isActive: false, updatedAt: now })

    return {
      success: true,
      configId: newConfigId,
      version: newVersion,
      message: `AI config updated to v${newVersion}. Changed fallback model from gemini-2.5-flash-lite to gemini-2.0-flash-001 for tool calling support.`,
      changes: {
        oldModel: activeConfig.fallbackModel,
        newModel: "google/gemini-2.0-flash-001",
      },
    }
  },
})
