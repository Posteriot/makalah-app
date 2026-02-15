// convex/twoFactorBypass.ts
//
// BetterAuth plugin with two responsibilities:
//
// A) AUTO-ENABLE 2FA: After email verification, automatically enable 2FA for the user.
//    This makes 2FA "default on" — users who don't want it can disable in Settings.
//
// B) CROSS-DOMAIN BYPASS: Bypasses the twoFactor plugin's broken cross-domain flow.
//    Problem: twoFactor's after hook deletes the session and sets a `two_factor` cookie,
//    but cross-domain mode can't relay that cookie.
//
// Bypass Flow:
// 1. Client verifies OTP via custom /api/auth/2fa/verify-otp endpoint → gets bypass token
// 2. Client re-calls signIn.email() with X-2FA-Bypass-Token header
// 3. twoFactor plugin runs: deletes session, returns { twoFactorRedirect: true }
// 4. THIS plugin's after hook: sees bypass token + twoFactorRedirect
// 5. Validates bypass token, creates new session, generates OTT for cross-domain relay
// 6. Returns OTT response (same format crossDomain normally returns on successful sign-in)

import type { BetterAuthPlugin } from "better-auth"
import { createAuthMiddleware } from "better-auth/plugins"

function generateRandomString(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("")
}

export const twoFactorCrossDomainBypass = (): BetterAuthPlugin => {
  return {
    id: "two-factor-cross-domain-bypass",
    hooks: {
      after: [
        // ── A) Auto-enable 2FA after email verification ──────────────
        {
          matcher(ctx) {
            return ctx.path?.startsWith("/verify-email") === true
          },
          handler: createAuthMiddleware(async (ctx) => {
            try {
              // After email verification, the user session should exist
              const session = ctx.context.newSession ?? ctx.context.session
              if (!session?.user) return

              const user = session.user as Record<string, unknown>

              // Only auto-enable for credential users who don't have 2FA yet
              if (user.twoFactorEnabled) return

              // Enable 2FA by setting the flag on the user record
              await ctx.context.internalAdapter.updateUser(
                session.user.id,
                { twoFactorEnabled: true }
              )
              console.log(
                `[2FA Auto-Enable] Enabled for user ${session.user.email}`
              )
            } catch (error) {
              // Non-fatal: user can still enable manually in Settings
              console.error("[2FA Auto-Enable] Failed:", error)
            }
          }),
        },
        // ── B) Cross-domain bypass for sign-in OTP ───────────────────
        {
          matcher(ctx) {
            // Only match sign-in/email path where twoFactorRedirect was returned
            if (!ctx.path?.startsWith("/sign-in/email")) return false
            const returned = ctx.context.returned as Record<string, unknown> | undefined
            return returned?.twoFactorRedirect === true
          },
          handler: createAuthMiddleware(async (ctx) => {
            // Check for bypass token in request headers
            const bypassToken =
              ctx.headers?.get("x-2fa-bypass-token") ??
              ctx.request?.headers?.get("x-2fa-bypass-token")

            if (!bypassToken) {
              // No bypass token — let the normal twoFactorRedirect flow proceed
              return
            }

            try {
              // Validate bypass token
              const verification =
                await ctx.context.internalAdapter.findVerificationValue(
                  bypassToken
                )

              if (!verification) {
                console.warn("[2FA Bypass] Invalid or expired bypass token")
                return
              }

              // Check expiry
              if (
                verification.expiresAt &&
                new Date(verification.expiresAt) < new Date()
              ) {
                console.warn("[2FA Bypass] Bypass token expired")
                await ctx.context.internalAdapter
                  .deleteVerificationValue(verification.id)
                  .catch(() => {})
                return
              }

              const userId = verification.value

              // Delete the bypass token (one-time use)
              await ctx.context.internalAdapter
                .deleteVerificationValue(verification.id)
                .catch(() => {})

              // Create a new session (the one twoFactor deleted)
              const newSession =
                await ctx.context.internalAdapter.createSession(userId, false)

              // Generate a one-time-token for cross-domain relay
              // (same mechanism used by the crossDomain plugin)
              const ottToken = generateRandomString(32)
              const ottExpiresAt = new Date(Date.now() + 3 * 60 * 1000)
              await ctx.context.internalAdapter.createVerificationValue({
                value: newSession.token,
                identifier: `one-time-token:${ottToken}`,
                expiresAt: ottExpiresAt,
              })

              // Get the callbackURL from the original request body
              const callbackURL =
                (ctx.body as Record<string, unknown>)?.callbackURL ??
                process.env.SITE_URL ??
                "/"

              // Return OTT response — the client's crossDomainClient will handle this
              // exactly like a normal successful cross-domain sign-in
              return {
                redirect: true,
                token: ottToken,
                url: callbackURL,
              }
            } catch (error) {
              console.error("[2FA Bypass] Error:", error)
              // On any error, let the twoFactorRedirect proceed as-is
              return
            }
          }),
        },
      ],
    },
  }
}
