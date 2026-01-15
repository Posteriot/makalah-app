import { internalMutation } from "../_generated/server"

/**
 * Migration script to update AI config to use GPT-4o for reliable tool calling
 *
 * GPT-4o has excellent tool/function calling support and doesn't have temperature issues
 *
 * Run via: npx convex run "migrations/updateToGPT4oForToolCalling:updateToGPT4oForToolCalling"
 */
export const updateToGPT4oForToolCalling = internalMutation({
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

    const now = Date.now()
    const newVersion = activeConfig.version + 1

    // Determine rootId
    const rootId = activeConfig.rootId ?? activeConfig._id

    // Create new version with GPT-4o
    // Note: For tool calling, temperature 0.7 works well with GPT-4o
    const newConfigId = await db.insert("aiProviderConfigs", {
      name: activeConfig.name,
      description: "Updated to GPT-4o for reliable tool calling support",
      primaryProvider: activeConfig.primaryProvider,
      primaryModel: activeConfig.primaryModel,
      fallbackProvider: "openrouter",
      fallbackModel: "openai/gpt-4o-mini", // GPT-4o-mini: fast, cheap, excellent tool calling
      gatewayApiKey: activeConfig.gatewayApiKey
        ?? (activeConfig.primaryProvider === "vercel-gateway" ? activeConfig.primaryApiKey : activeConfig.fallbackApiKey)
        ?? "",
      openrouterApiKey: activeConfig.openrouterApiKey
        ?? (activeConfig.primaryProvider === "openrouter" ? activeConfig.primaryApiKey : activeConfig.fallbackApiKey)
        ?? "",
      primaryApiKey: activeConfig.primaryApiKey ?? "",
      fallbackApiKey: activeConfig.fallbackApiKey ?? "",
      temperature: 0.7, // GPT-4o supports temperature with tool calling
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
      message: `AI config updated to v${newVersion}. Now using GPT-4o-mini via OpenRouter for reliable tool calling.`,
      changes: {
        oldModel: activeConfig.fallbackModel,
        newModel: "openai/gpt-4o-mini",
        temperature: 0.7,
      },
    }
  },
})
