import type { Id } from "@convex/_generated/dataModel"

/**
 * AI Provider Config structure from database
 */
export interface AIProviderConfig {
  _id: Id<"aiProviderConfigs">
  name: string
  description?: string
  primaryProvider: string
  primaryModel: string
  primaryApiKey: string // Plain text
  fallbackProvider: string
  fallbackModel: string
  fallbackApiKey: string // Plain text
  temperature: number
  topP?: number
  version: number
  isActive: boolean
  createdBy: Id<"users">
  createdAt: number
  updatedAt: number
}

/**
 * In-memory cache for active AI provider configuration
 * Implements singleton pattern untuk global cache access
 */
class ConfigCache {
  private config: AIProviderConfig | null = null
  private lastFetch: number = 0
  private TTL = 5 * 60 * 1000 // 5 minutes in milliseconds

  /**
   * Get active config from cache or fetch from database
   * @returns Active AI provider config or null if none active
   */
  async get(): Promise<AIProviderConfig | null> {
    const now = Date.now()

    // Return cached config if still fresh
    if (this.config && now - this.lastFetch < this.TTL) {
      console.log("[ConfigCache] Returning cached config (TTL not expired)")
      return this.config
    }

    // Fetch from Convex database
    console.log("[ConfigCache] Fetching fresh config from database")

    try {
      const { fetchQuery } = await import("convex/nextjs")
      const { api } = await import("@convex/_generated/api")

      const activeConfig = await fetchQuery(api.aiProviderConfigs.getActiveConfig)

      // Update cache
      this.config = activeConfig
      this.lastFetch = now

      if (activeConfig) {
        console.log(`[ConfigCache] Cached config: ${activeConfig.name} v${activeConfig.version}`)
      } else {
        console.log("[ConfigCache] No active config found in database")
      }

      return this.config
    } catch (error) {
      console.error("[ConfigCache] Error fetching config from database:", error)
      // Return stale cache if available as fallback
      if (this.config) {
        console.log("[ConfigCache] Returning stale cache due to fetch error")
        return this.config
      }
      return null
    }
  }

  /**
   * Invalidate cache (force fresh fetch on next get())
   * Call this after activating/updating config for immediate effect
   */
  invalidate() {
    console.log("[ConfigCache] Cache invalidated manually")
    this.config = null
    this.lastFetch = 0
  }

  /**
   * Get current cache state (for debugging)
   */
  getState() {
    return {
      hasCached: this.config !== null,
      lastFetch: this.lastFetch,
      age: this.lastFetch > 0 ? Date.now() - this.lastFetch : 0,
      ttl: this.TTL,
      isExpired: this.lastFetch > 0 && Date.now() - this.lastFetch >= this.TTL,
    }
  }
}

// Export singleton instance
export const configCache = new ConfigCache()
