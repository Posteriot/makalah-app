import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireRole } from "./permissions"

const MIN_THINKING_BUDGET = 0
const MAX_THINKING_BUDGET = 32768
const REASONING_TRACE_MODES = new Set(["off", "curated", "transparent"])

/**
 * Get the currently active AI provider configuration
 * No auth required - used by chat API
 * Returns config with default values for optional fields
 */
export const getActiveConfig = query({
  args: {},
  handler: async (ctx) => {
    const activeConfig = await ctx.db
      .query("aiProviderConfigs")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first()

    if (!activeConfig) {
      return null
    }

    // Apply defaults for optional fields
    return {
      ...activeConfig,
      primaryWebSearchEnabled: activeConfig.primaryWebSearchEnabled ?? true,
      fallbackWebSearchEnabled: activeConfig.fallbackWebSearchEnabled ?? true,
      fallbackWebSearchEngine: activeConfig.fallbackWebSearchEngine ?? "auto",
      fallbackWebSearchMaxResults: activeConfig.fallbackWebSearchMaxResults ?? 5,
      isRefrasaEnabled: activeConfig.isRefrasaEnabled ?? true,
      reasoningEnabled: activeConfig.reasoningEnabled ?? true,
      thinkingBudgetPrimary: activeConfig.thinkingBudgetPrimary ?? 256,
      thinkingBudgetFallback: activeConfig.thinkingBudgetFallback ?? 128,
      reasoningTraceMode: activeConfig.reasoningTraceMode ?? "curated",
    }
  },
})

/**
 * Get a single AI provider config by ID
 * Admin only
 */
export const getConfig = query({
  args: {
    configId: v.id("aiProviderConfigs"),
    requestorUserId: v.id("users"),
  },
  handler: async (ctx, { configId, requestorUserId }) => {
    await requireRole(ctx.db, requestorUserId, "admin")

    const config = await ctx.db.get(configId)
    if (!config) {
      return null
    }

    return config
  },
})

/**
 * List all AI provider configs (latest versions only)
 * Returns configs with creator email for display
 * Admin only
 */
export const listConfigs = query({
  args: {
    requestorUserId: v.id("users"),
  },
  handler: async (ctx, { requestorUserId }) => {
    await requireRole(ctx.db, requestorUserId, "admin")

    const allConfigs = await ctx.db
      .query("aiProviderConfigs")
      .withIndex("by_createdAt")
      .order("desc")
      .collect()

    // Group by rootId to get only latest versions
    const latestConfigsMap = new Map<string, typeof allConfigs[0]>()

    for (const config of allConfigs) {
      const key = config.rootId ?? config._id
      const existing = latestConfigsMap.get(key)

      if (!existing || config.version > existing.version) {
        latestConfigsMap.set(key, config)
      }
    }

    // Fetch creator details for each config
    const configsWithCreator = await Promise.all(
      Array.from(latestConfigsMap.values()).map(async (config) => {
        const creator = await ctx.db.get(config.createdBy)
        return {
          ...config,
          creatorEmail: creator?.email ?? "Unknown",
        }
      })
    )

    // Sort by createdAt descending
    return configsWithCreator.sort((a, b) => b.createdAt - a.createdAt)
  },
})

/**
 * Get version history for a specific config
 * Admin only
 */
export const getConfigVersionHistory = query({
  args: {
    configId: v.id("aiProviderConfigs"),
    requestorUserId: v.id("users"),
  },
  handler: async (ctx, { configId, requestorUserId }) => {
    await requireRole(ctx.db, requestorUserId, "admin")

    const config = await ctx.db.get(configId)
    if (!config) {
      throw new Error("Config tidak ditemukan")
    }

    const rootId = config.rootId ?? configId

    const versions = await ctx.db
      .query("aiProviderConfigs")
      .withIndex("by_root", (q) => q.eq("rootId", rootId))
      .order("desc")
      .collect()

    // Also include the root config if it doesn't have a rootId
    if (!config.rootId) {
      const allVersions = [config, ...versions]
      return allVersions.sort((a, b) => b.version - a.version)
    }

    return versions.sort((a, b) => b.version - a.version)
  },
})

/**
 * Create a new AI provider config (version 1)
 * Admin only
 */
export const createConfig = mutation({
  args: {
    requestorUserId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    primaryProvider: v.string(),
    primaryModel: v.string(),
    fallbackProvider: v.string(),
    fallbackModel: v.string(),
    // Provider API keys (global per provider)
    gatewayApiKey: v.optional(v.string()),
    openrouterApiKey: v.optional(v.string()),
    temperature: v.number(),
    topP: v.optional(v.number()),
    maxTokens: v.optional(v.number()),
    reasoningEnabled: v.optional(v.boolean()),
    thinkingBudgetPrimary: v.optional(v.number()),
    thinkingBudgetFallback: v.optional(v.number()),
    reasoningTraceMode: v.optional(v.union(v.literal("off"), v.literal("curated"), v.literal("transparent"))),
    // Context window settings
    primaryContextWindow: v.optional(v.number()),
    fallbackContextWindow: v.optional(v.number()),
    // Web search settings
    primaryWebSearchEnabled: v.optional(v.boolean()),
    fallbackWebSearchEnabled: v.optional(v.boolean()),
    fallbackWebSearchEngine: v.optional(v.string()),
    fallbackWebSearchMaxResults: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorUserId, "admin")

    // Validate inputs
    if (!args.name.trim()) {
      throw new Error("Nama tidak boleh kosong")
    }
    if (args.temperature < 0 || args.temperature > 2) {
      throw new Error("Temperature harus antara 0 dan 2")
    }
    if (
      args.fallbackWebSearchMaxResults !== undefined &&
      (args.fallbackWebSearchMaxResults < 1 || args.fallbackWebSearchMaxResults > 10)
    ) {
      throw new Error("Max search results harus antara 1 dan 10")
    }
    if (
      args.thinkingBudgetPrimary !== undefined &&
      (args.thinkingBudgetPrimary < MIN_THINKING_BUDGET || args.thinkingBudgetPrimary > MAX_THINKING_BUDGET)
    ) {
      throw new Error(`Thinking budget primary harus antara ${MIN_THINKING_BUDGET} dan ${MAX_THINKING_BUDGET}`)
    }
    if (
      args.thinkingBudgetFallback !== undefined &&
      (args.thinkingBudgetFallback < MIN_THINKING_BUDGET || args.thinkingBudgetFallback > MAX_THINKING_BUDGET)
    ) {
      throw new Error(`Thinking budget fallback harus antara ${MIN_THINKING_BUDGET} dan ${MAX_THINKING_BUDGET}`)
    }
    if (args.reasoningTraceMode !== undefined && !REASONING_TRACE_MODES.has(args.reasoningTraceMode)) {
      throw new Error('Reasoning trace mode harus "off", "curated", atau "transparent"')
    }

    const now = Date.now()

    const configId = await ctx.db.insert("aiProviderConfigs", {
      name: args.name.trim(),
      description: args.description?.trim(),
      primaryProvider: args.primaryProvider,
      primaryModel: args.primaryModel,
      fallbackProvider: args.fallbackProvider,
      fallbackModel: args.fallbackModel,
      // Provider API keys (global per provider)
      gatewayApiKey: args.gatewayApiKey?.trim() || "",
      openrouterApiKey: args.openrouterApiKey?.trim() || "",
      // Legacy slot-based keys (kept for compatibility)
      primaryApiKey: "",
      fallbackApiKey: "",
      temperature: args.temperature,
      topP: args.topP,
      maxTokens: args.maxTokens,
      reasoningEnabled: args.reasoningEnabled,
      thinkingBudgetPrimary: args.thinkingBudgetPrimary,
      thinkingBudgetFallback: args.thinkingBudgetFallback,
      reasoningTraceMode: args.reasoningTraceMode,
      // Context window settings
      primaryContextWindow: args.primaryContextWindow,
      fallbackContextWindow: args.fallbackContextWindow,
      // Web search settings (store provided values, defaults applied in getActiveConfig)
      primaryWebSearchEnabled: args.primaryWebSearchEnabled,
      fallbackWebSearchEnabled: args.fallbackWebSearchEnabled,
      fallbackWebSearchEngine: args.fallbackWebSearchEngine,
      fallbackWebSearchMaxResults: args.fallbackWebSearchMaxResults,
      version: 1,
      isActive: false, // Not active by default
      parentId: undefined,
      rootId: undefined,
      createdBy: args.requestorUserId,
      createdAt: now,
      updatedAt: now,
    })

    return {
      configId,
      message: "Config berhasil dibuat",
    }
  },
})

/**
 * Update an existing config (creates new version)
 * Admin only
 * Supports partial update - only send fields that changed
 * API keys are optional - if not provided, uses existing keys from old config
 */
export const updateConfig = mutation({
  args: {
    requestorUserId: v.id("users"),
    configId: v.id("aiProviderConfigs"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    primaryProvider: v.optional(v.string()),
    primaryModel: v.optional(v.string()),
    fallbackProvider: v.optional(v.string()),
    fallbackModel: v.optional(v.string()),
    // Provider API keys (global per provider)
    gatewayApiKey: v.optional(v.string()),
    openrouterApiKey: v.optional(v.string()),
    gatewayApiKeyClear: v.optional(v.boolean()),
    openrouterApiKeyClear: v.optional(v.boolean()),
    temperature: v.optional(v.number()),
    topP: v.optional(v.number()),
    maxTokens: v.optional(v.number()),
    reasoningEnabled: v.optional(v.boolean()),
    thinkingBudgetPrimary: v.optional(v.number()),
    thinkingBudgetFallback: v.optional(v.number()),
    reasoningTraceMode: v.optional(v.union(v.literal("off"), v.literal("curated"), v.literal("transparent"))),
    // Context window settings
    primaryContextWindow: v.optional(v.number()),
    fallbackContextWindow: v.optional(v.number()),
    // Web search settings
    primaryWebSearchEnabled: v.optional(v.boolean()),
    fallbackWebSearchEnabled: v.optional(v.boolean()),
    fallbackWebSearchEngine: v.optional(v.string()),
    fallbackWebSearchMaxResults: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorUserId, "admin")

    const oldConfig = await ctx.db.get(args.configId)
    if (!oldConfig) {
      throw new Error("Config tidak ditemukan")
    }

    // Merge with existing data - use provided value or fall back to old config
    const name = args.name ?? oldConfig.name
    const description = args.description ?? oldConfig.description
    const primaryProvider = args.primaryProvider ?? oldConfig.primaryProvider
    const primaryModel = args.primaryModel ?? oldConfig.primaryModel
    const deriveGatewayKey = () => {
      if (args.gatewayApiKeyClear) return ""
      if (args.gatewayApiKey?.trim()) return args.gatewayApiKey.trim()
      if (oldConfig.gatewayApiKey !== undefined) return oldConfig.gatewayApiKey
      if (oldConfig.primaryProvider === "vercel-gateway") return oldConfig.primaryApiKey ?? ""
      if (oldConfig.fallbackProvider === "vercel-gateway") return oldConfig.fallbackApiKey ?? ""
      return ""
    }
    const gatewayApiKey = deriveGatewayKey()
    const fallbackProvider = args.fallbackProvider ?? oldConfig.fallbackProvider
    const fallbackModel = args.fallbackModel ?? oldConfig.fallbackModel
    const deriveOpenRouterKey = () => {
      if (args.openrouterApiKeyClear) return ""
      if (args.openrouterApiKey?.trim()) return args.openrouterApiKey.trim()
      if (oldConfig.openrouterApiKey !== undefined) return oldConfig.openrouterApiKey
      if (oldConfig.primaryProvider === "openrouter") return oldConfig.primaryApiKey ?? ""
      if (oldConfig.fallbackProvider === "openrouter") return oldConfig.fallbackApiKey ?? ""
      return ""
    }
    const openrouterApiKey = deriveOpenRouterKey()
    const temperature = args.temperature ?? oldConfig.temperature
    const topP = args.topP ?? oldConfig.topP
    const maxTokens = args.maxTokens ?? oldConfig.maxTokens
    const reasoningEnabled = args.reasoningEnabled ?? oldConfig.reasoningEnabled
    const thinkingBudgetPrimary = args.thinkingBudgetPrimary ?? oldConfig.thinkingBudgetPrimary
    const thinkingBudgetFallback = args.thinkingBudgetFallback ?? oldConfig.thinkingBudgetFallback
    const reasoningTraceMode = args.reasoningTraceMode ?? oldConfig.reasoningTraceMode
    // Context window settings - use provided value or preserve old config value
    const primaryContextWindow =
      args.primaryContextWindow !== undefined ? args.primaryContextWindow : oldConfig.primaryContextWindow
    const fallbackContextWindow =
      args.fallbackContextWindow !== undefined ? args.fallbackContextWindow : oldConfig.fallbackContextWindow
    // Web search settings - use provided value or preserve old config value
    const primaryWebSearchEnabled =
      args.primaryWebSearchEnabled ?? oldConfig.primaryWebSearchEnabled
    const fallbackWebSearchEnabled =
      args.fallbackWebSearchEnabled ?? oldConfig.fallbackWebSearchEnabled
    const fallbackWebSearchEngine =
      args.fallbackWebSearchEngine ?? oldConfig.fallbackWebSearchEngine
    const fallbackWebSearchMaxResults =
      args.fallbackWebSearchMaxResults ?? oldConfig.fallbackWebSearchMaxResults

    // Validate inputs
    if (!name.trim()) {
      throw new Error("Nama tidak boleh kosong")
    }
    if (temperature < 0 || temperature > 2) {
      throw new Error("Temperature harus antara 0 dan 2")
    }
    if (
      fallbackWebSearchMaxResults !== undefined &&
      (fallbackWebSearchMaxResults < 1 || fallbackWebSearchMaxResults > 10)
    ) {
      throw new Error("Max search results harus antara 1 dan 10")
    }
    if (
      thinkingBudgetPrimary !== undefined &&
      (thinkingBudgetPrimary < MIN_THINKING_BUDGET || thinkingBudgetPrimary > MAX_THINKING_BUDGET)
    ) {
      throw new Error(`Thinking budget primary harus antara ${MIN_THINKING_BUDGET} dan ${MAX_THINKING_BUDGET}`)
    }
    if (
      thinkingBudgetFallback !== undefined &&
      (thinkingBudgetFallback < MIN_THINKING_BUDGET || thinkingBudgetFallback > MAX_THINKING_BUDGET)
    ) {
      throw new Error(`Thinking budget fallback harus antara ${MIN_THINKING_BUDGET} dan ${MAX_THINKING_BUDGET}`)
    }
    if (reasoningTraceMode !== undefined && !REASONING_TRACE_MODES.has(reasoningTraceMode)) {
      throw new Error('Reasoning trace mode harus "off", "curated", atau "transparent"')
    }

    const now = Date.now()
    const newVersion = oldConfig.version + 1
    const rootId = oldConfig.rootId ?? args.configId

    // Create new version
    const newConfigId = await ctx.db.insert("aiProviderConfigs", {
      name: name.trim(),
      description: description?.trim(),
      primaryProvider,
      primaryModel,
      gatewayApiKey,
      fallbackProvider,
      fallbackModel,
      openrouterApiKey,
      // Legacy slot-based keys (kept for compatibility)
      primaryApiKey: oldConfig.primaryApiKey ?? "",
      fallbackApiKey: oldConfig.fallbackApiKey ?? "",
      temperature,
      topP,
      maxTokens,
      reasoningEnabled,
      thinkingBudgetPrimary,
      thinkingBudgetFallback,
      reasoningTraceMode,
      // Context window settings
      primaryContextWindow,
      fallbackContextWindow,
      // Web search settings
      primaryWebSearchEnabled,
      fallbackWebSearchEnabled,
      fallbackWebSearchEngine,
      fallbackWebSearchMaxResults,
      version: newVersion,
      isActive: false, // Not active yet
      parentId: args.configId,
      rootId,
      createdBy: args.requestorUserId,
      createdAt: now,
      updatedAt: now,
    })

    // If old config was active, deactivate it and activate new one
    if (oldConfig.isActive) {
      await ctx.db.patch(args.configId, { isActive: false, updatedAt: now })
      await ctx.db.patch(newConfigId, { isActive: true, updatedAt: now })
    }

    return {
      configId: newConfigId,
      version: newVersion,
      message: "Config berhasil diupdate",
    }
  },
})

/**
 * Activate a specific config (deactivates all others)
 * Admin only
 */
export const activateConfig = mutation({
  args: {
    requestorUserId: v.id("users"),
    configId: v.id("aiProviderConfigs"),
  },
  handler: async (ctx, { requestorUserId, configId }) => {
    await requireRole(ctx.db, requestorUserId, "admin")

    const targetConfig = await ctx.db.get(configId)
    if (!targetConfig) {
      throw new Error("Config tidak ditemukan")
    }

    const now = Date.now()

    // Deactivate all active configs
    const activeConfigs = await ctx.db
      .query("aiProviderConfigs")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect()

    for (const config of activeConfigs) {
      await ctx.db.patch(config._id, { isActive: false, updatedAt: now })
    }

    // Activate target config
    await ctx.db.patch(configId, { isActive: true, updatedAt: now })

    return {
      message: "Config berhasil diaktifkan. Perubahan akan berlaku di request berikutnya.",
    }
  },
})

/**
 * Swap primary and fallback providers (creates new version)
 * Admin only
 * Note: Web search enabled flags are swapped, but engine/maxResults stay with fallback
 */
export const swapProviders = mutation({
  args: {
    requestorUserId: v.id("users"),
    configId: v.id("aiProviderConfigs"),
  },
  handler: async (ctx, { requestorUserId, configId }) => {
    await requireRole(ctx.db, requestorUserId, "admin")

    const config = await ctx.db.get(configId)
    if (!config) {
      throw new Error("Config tidak ditemukan")
    }

    const now = Date.now()
    const newVersion = config.version + 1
    const rootId = config.rootId ?? configId
    const derivedGatewayKey = config.gatewayApiKey !== undefined
      ? config.gatewayApiKey
      : (config.primaryProvider === "vercel-gateway"
        ? config.primaryApiKey ?? ""
        : config.fallbackProvider === "vercel-gateway"
          ? config.fallbackApiKey ?? ""
          : "")
    const derivedOpenRouterKey = config.openrouterApiKey !== undefined
      ? config.openrouterApiKey
      : (config.primaryProvider === "openrouter"
        ? config.primaryApiKey ?? ""
        : config.fallbackProvider === "openrouter"
          ? config.fallbackApiKey ?? ""
          : "")

    // Create new version with swapped providers
    const newConfigId = await ctx.db.insert("aiProviderConfigs", {
      name: config.name,
      description: config.description,
      // Swap primary ↔ fallback
      primaryProvider: config.fallbackProvider,
      primaryModel: config.fallbackModel,
      fallbackProvider: config.primaryProvider,
      fallbackModel: config.primaryModel,
      // Provider API keys (global per provider, do not swap)
      gatewayApiKey: derivedGatewayKey,
      openrouterApiKey: derivedOpenRouterKey,
      // Legacy slot-based keys (kept as-is for backward compatibility)
      primaryApiKey: config.primaryApiKey ?? "",
      fallbackApiKey: config.fallbackApiKey ?? "",
      temperature: config.temperature,
      topP: config.topP,
      maxTokens: config.maxTokens,
      // Keep global reasoning switches, swap slot-specific thinking budgets
      reasoningEnabled: config.reasoningEnabled,
      thinkingBudgetPrimary: config.thinkingBudgetFallback,
      thinkingBudgetFallback: config.thinkingBudgetPrimary,
      reasoningTraceMode: config.reasoningTraceMode,
      // Swap context windows to follow swapped primary/fallback models
      primaryContextWindow: config.fallbackContextWindow,
      fallbackContextWindow: config.primaryContextWindow,
      // Swap web search enabled flags (they follow the provider)
      primaryWebSearchEnabled: config.fallbackWebSearchEnabled,
      fallbackWebSearchEnabled: config.primaryWebSearchEnabled,
      // Engine and maxResults stay with fallback (specific to :online behavior)
      fallbackWebSearchEngine: config.fallbackWebSearchEngine,
      fallbackWebSearchMaxResults: config.fallbackWebSearchMaxResults,
      version: newVersion,
      isActive: false,
      parentId: configId,
      rootId,
      createdBy: requestorUserId,
      createdAt: now,
      updatedAt: now,
    })

    // If old config was active, activate new one
    if (config.isActive) {
      await ctx.db.patch(configId, { isActive: false, updatedAt: now })
      await ctx.db.patch(newConfigId, { isActive: true, updatedAt: now })
    }

    return {
      configId: newConfigId,
      message: "Provider berhasil ditukar",
    }
  },
})

/**
 * Delete a config (cannot delete active config)
 * Admin only
 */
export const deleteConfig = mutation({
  args: {
    requestorUserId: v.id("users"),
    configId: v.id("aiProviderConfigs"),
  },
  handler: async (ctx, { requestorUserId, configId }) => {
    await requireRole(ctx.db, requestorUserId, "admin")

    const config = await ctx.db.get(configId)
    if (!config) {
      throw new Error("Config tidak ditemukan")
    }

    if (config.isActive) {
      throw new Error(
        "Tidak bisa hapus config yang aktif. Nonaktifkan terlebih dahulu."
      )
    }

    await ctx.db.delete(configId)

    return {
      message: "Config berhasil dihapus",
    }
  },
})

/**
 * Delete entire config chain (all versions)
 * Admin only
 */
export const deleteConfigChain = mutation({
  args: {
    requestorUserId: v.id("users"),
    configId: v.id("aiProviderConfigs"),
  },
  handler: async (ctx, { requestorUserId, configId }) => {
    await requireRole(ctx.db, requestorUserId, "admin")

    const config = await ctx.db.get(configId)
    if (!config) {
      throw new Error("Config tidak ditemukan")
    }

    // Check if any version in the chain is active
    const rootId = config.rootId ?? configId
    const allVersions = await ctx.db
      .query("aiProviderConfigs")
      .withIndex("by_root", (q) => q.eq("rootId", rootId))
      .collect()

    const hasActiveVersion = allVersions.some((v) => v.isActive) || config.isActive

    if (hasActiveVersion) {
      throw new Error(
        "Tidak bisa hapus config chain yang memiliki versi aktif. Nonaktifkan terlebih dahulu."
      )
    }

    // Delete all versions
    for (const version of allVersions) {
      await ctx.db.delete(version._id)
    }

    // Delete root config if it doesn't have rootId
    if (!config.rootId) {
      await ctx.db.delete(configId)
    }

    return {
      message: "Semua versi config berhasil dihapus",
    }
  },
})

// ============================================================================
// REFRASA TOOL VISIBILITY
// ============================================================================

/**
 * Get Refrasa tool enabled status
 * No auth required - used by artifact viewer to check visibility
 * Returns true if enabled or no config exists (default behavior)
 */
export const getRefrasaEnabled = query({
  args: {},
  handler: async (ctx) => {
    const activeConfig = await ctx.db
      .query("aiProviderConfigs")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first()

    // Default to true if no config or field not set
    return activeConfig?.isRefrasaEnabled ?? true
  },
})

/**
 * Set Refrasa tool enabled status
 * Admin only - for maintenance mode toggle
 * Updates the active config directly (no version history for this toggle)
 */
export const setRefrasaEnabled = mutation({
  args: {
    requestorUserId: v.id("users"),
    enabled: v.boolean(),
  },
  handler: async (ctx, { requestorUserId, enabled }) => {
    await requireRole(ctx.db, requestorUserId, "admin")

    const activeConfig = await ctx.db
      .query("aiProviderConfigs")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first()

    if (!activeConfig) {
      throw new Error("Tidak ada AI config yang aktif. Aktifkan config terlebih dahulu.")
    }

    await ctx.db.patch(activeConfig._id, {
      isRefrasaEnabled: enabled,
      updatedAt: Date.now(),
    })

    return {
      message: enabled
        ? "Refrasa tool berhasil diaktifkan"
        : "Refrasa tool berhasil dinonaktifkan",
    }
  },
})
