import { mutation } from "../_generated/server"
import { tokensToCredits } from "../billing/constants"

/**
 * Migration to backfill existing creditBalances documents with new credit fields
 *
 * This handles the transition from IDR-based to credit-based system.
 * Converts existing balanceTokens to credits.
 *
 * Run via: npx convex run "migrations/backfillCreditBalances:backfillCreditBalances"
 *
 * NOTE: Using mutation (not internalMutation) so it can be called via CLI
 */
export const backfillCreditBalances = mutation({
  handler: async ({ db }) => {
    const now = Date.now()
    const updates: string[] = []

    // Get all creditBalances documents
    const balances = await db.query("creditBalances").collect()

    for (const balance of balances) {
      // Skip if already migrated (has credit fields)
      if (
        balance.totalCredits !== undefined &&
        balance.remainingCredits !== undefined
      ) {
        updates.push(`${balance._id}: already migrated, skipped`)
        continue
      }

      // Convert existing tokens to credits
      // 1 kredit = 1,000 tokens
      const existingTokens = balance.balanceTokens ?? 0
      const creditsFromTokens = tokensToCredits(existingTokens)

      // Backfill with converted values
      await db.patch(balance._id, {
        totalCredits: creditsFromTokens,
        usedCredits: 0,
        remainingCredits: creditsFromTokens,
        totalPurchasedCredits: creditsFromTokens,
        totalSpentCredits: 0,
        updatedAt: now,
      })

      updates.push(
        `${balance._id}: migrated ${existingTokens} tokens → ${creditsFromTokens} credits`
      )
    }

    return {
      success: true,
      totalDocuments: balances.length,
      updates,
      message: `Backfilled ${updates.length} creditBalances documents`,
    }
  },
})
