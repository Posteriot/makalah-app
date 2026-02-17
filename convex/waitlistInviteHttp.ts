import { httpAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { createAuth, setPendingInvite } from "./auth"

const siteUrl = process.env.SITE_URL!
const trustedOrigins = [
  siteUrl,
  "http://localhost:3000",
  "http://localhost:3001",
]

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? ""
  const allowed = trustedOrigins.includes(origin) ? origin : trustedOrigins[0]
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  }
}

/**
 * HTTP action: Send waitlist invite as a magic link email.
 *
 * When user clicks the magic link:
 * - BetterAuth auto-creates account if user doesn't exist (emailVerified: true)
 * - BetterAuth signs them in and creates a session
 * - Redirects to callbackURL (/settings)
 *
 * Body: { entryId: string, adminUserId: string }
 */
export const sendInviteMagicLink = httpAction(async (ctx, request) => {
  const cors = getCorsHeaders(request)

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors })
  }

  try {
    const body = (await request.json()) as {
      entryId?: string
      adminUserId?: string
    }

    if (!body.entryId || !body.adminUserId) {
      return new Response(
        JSON.stringify({ status: false, error: "entryId dan adminUserId diperlukan." }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    // Mark entry as invited + get entry data (admin role check inside mutation)
    const inviteResult = await ctx.runMutation(
      internal.waitlist.inviteSingleInternal,
      { adminUserId: body.adminUserId, entryId: body.entryId }
    )

    if (!inviteResult) {
      return new Response(
        JSON.stringify({ status: false, error: "Entry tidak ditemukan atau sudah diundang." }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    // Set pending invite so sendMagicLink callback uses invite email template
    const firstName = inviteResult.firstName ?? "Pengguna"
    setPendingInvite({ firstName })

    // Send magic link via BetterAuth — this triggers the sendMagicLink callback
    const auth = createAuth(ctx)
    const fullName = [inviteResult.firstName, inviteResult.lastName].filter(Boolean).join(" ") || "Pengguna"

    await auth.api.signInMagicLink({
      body: {
        email: inviteResult.email,
        name: fullName,
        callbackURL: "/settings",
      },
      headers: new Headers(),
    })

    // Enforce gratis tier for existing users
    await ctx.runMutation(internal.waitlist.enforceGratisTier, {
      email: inviteResult.email,
    })

    return new Response(
      JSON.stringify({ status: true, email: inviteResult.email }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    )
  } catch (error) {
    // Clear pending invite on error
    setPendingInvite(null)
    console.error("[Waitlist Invite] Error:", error)
    return new Response(
      JSON.stringify({ status: false, error: "Gagal mengirim undangan." }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    )
  }
})
