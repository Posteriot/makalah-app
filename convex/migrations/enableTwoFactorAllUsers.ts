import { httpAction } from "../_generated/server"
import { createAuth } from "../auth"

/**
 * Migration: Enable 2FA for all existing credential (email/password) users.
 *
 * Run via HTTP request (needs BetterAuth context, can't use regular mutation):
 *   curl -X POST <CONVEX_SITE_URL>/api/migrations/enable-2fa-all
 *
 * This is a one-time migration. Safe to re-run (skips already-enabled users).
 *
 * Why HTTP action instead of internalMutation:
 *   BetterAuth user records live in the component's tables, accessible only
 *   via internalAdapter which requires the full BetterAuth context (available
 *   in HTTP actions via createAuth, not in regular Convex mutations).
 */
export const enableTwoFactorAllUsers = httpAction(async (ctx, request) => {
  // Simple auth check: require a secret header to prevent unauthorized runs
  const migrationSecret = process.env.BETTER_AUTH_SECRET
  const provided = request.headers.get("x-migration-secret")

  if (!migrationSecret || provided !== migrationSecret) {
    return new Response(
      JSON.stringify({ error: "Unauthorized. Provide x-migration-secret header." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    )
  }

  try {
    const auth = createAuth(ctx)
    const authCtx = await (auth as any).$context

    // List all users from BetterAuth table
    const users = await authCtx.internalAdapter.listUsers(1000)

    let enabled = 0
    let skipped = 0
    let noCredential = 0

    for (const user of users) {
      const u = user as Record<string, unknown>

      // Already has 2FA enabled
      if (u.twoFactorEnabled === true) {
        skipped++
        continue
      }

      // Check if user has a credential (email/password) account
      const accounts = await authCtx.internalAdapter.findAccounts(u.id as string)
      const hasCredential = accounts.some(
        (a: Record<string, unknown>) => a.providerId === "credential"
      )

      if (!hasCredential) {
        // OAuth-only user — skip (they use Google 2FA)
        noCredential++
        continue
      }

      // Enable 2FA
      await authCtx.internalAdapter.updateUser(u.id as string, {
        twoFactorEnabled: true,
      })
      enabled++
    }

    const result = {
      status: "done",
      total: users.length,
      enabled,
      skipped,
      noCredential,
    }

    console.log("[Migration] enableTwoFactorAllUsers:", result)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("[Migration] enableTwoFactorAllUsers error:", error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
