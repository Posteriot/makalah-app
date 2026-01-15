import { internalMutation } from "../_generated/server"

/**
 * Backfill provider-specific API keys from legacy slot-based keys.
 *
 * Run via: npx convex run migrations:backfillProviderKeys
 */
export const backfillProviderKeys = internalMutation({
  handler: async ({ db }) => {
    const configs = await db.query("aiProviderConfigs").collect()
    const now = Date.now()
    let updated = 0

    for (const config of configs) {
      const looksLikeOpenRouter = (value: string) => value.startsWith("sk-or-")
      const looksLikeGateway = (value: string) => value.startsWith("vck_")

      let gatewayApiKey = config.gatewayApiKey
      let openrouterApiKey = config.openrouterApiKey

      const hasGateway = typeof gatewayApiKey !== "undefined"
      const hasOpenRouter = typeof openrouterApiKey !== "undefined"

      // Swap jika keduanya terisi tapi ketukar (heuristik prefix)
      if (hasGateway && hasOpenRouter && gatewayApiKey && openrouterApiKey) {
        if (looksLikeOpenRouter(gatewayApiKey) && looksLikeGateway(openrouterApiKey)) {
          const temp = gatewayApiKey
          gatewayApiKey = openrouterApiKey
          openrouterApiKey = temp
        }
      }

      // Backfill hanya jika field belum ada (undefined).
      if (!hasGateway) {
        gatewayApiKey = config.primaryProvider === "vercel-gateway"
          ? (config.primaryApiKey ?? "")
          : config.fallbackProvider === "vercel-gateway"
            ? (config.fallbackApiKey ?? "")
            : ""
      }

      if (!hasOpenRouter) {
        openrouterApiKey = config.primaryProvider === "openrouter"
          ? (config.primaryApiKey ?? "")
          : config.fallbackProvider === "openrouter"
            ? (config.fallbackApiKey ?? "")
            : ""
      }

      const patch: Record<string, string | number> = {}
      if (gatewayApiKey !== config.gatewayApiKey) patch.gatewayApiKey = gatewayApiKey ?? ""
      if (openrouterApiKey !== config.openrouterApiKey) patch.openrouterApiKey = openrouterApiKey ?? ""

      if (Object.keys(patch).length === 0) continue

      patch.updatedAt = now
      await db.patch(config._id, patch)
      updated += 1
    }

    return {
      success: true,
      total: configs.length,
      updated,
      message: `Backfill selesai. Update ${updated} dari ${configs.length} config.`,
    }
  },
})
