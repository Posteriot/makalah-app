import { httpAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { createAuth } from "./auth"
import { hashOtp } from "./twoFactorOtp"
import { sendTwoFactorOtpEmail } from "./authEmails"

// Trusted origins (same as auth.ts)
const siteUrl = process.env.SITE_URL!
const trustedOrigins = [
  siteUrl,
  "https://www.makalah.ai",
  "https://dev.makalah.ai",
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

function generateOtp(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return String(array[0] % 1000000).padStart(6, "0")
}

function generateBypassToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("")
}

export const sendOtp = httpAction(async (ctx, request) => {
  const cors = getCorsHeaders(request)

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors })
  }

  try {
    const body = (await request.json()) as { email?: string }
    const email = body.email?.trim()?.toLowerCase()

    if (!email) {
      return new Response(
        JSON.stringify({ status: false, error: "Email diperlukan." }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    // Look up BetterAuth user — verify email exists and 2FA is enabled
    const auth = createAuth(ctx)
    const userResult = await auth.api.getSession({ headers: new Headers() }).catch(() => null)
    // We can't use getSession here (no auth). Use internal adapter to find user by email.
    const internalAdapter = (auth as unknown as { options: { database: unknown } }).options
    // Actually, use the adapter directly from the auth context
    const authCtx = await (auth as any).$context
    const foundUser = await authCtx.internalAdapter.findUserByEmail(email, { includeAccounts: true })

    if (!foundUser) {
      // Don't reveal whether email exists — still return success
      return new Response(
        JSON.stringify({ status: true }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    // Check if 2FA is enabled for this user
    const accounts = foundUser.accounts || []
    const has2FA = accounts.some(
      (a: { providerId: string }) => a.providerId === "credential"
    )
    // Check twoFactorEnabled on the user record
    const user = foundUser.user as Record<string, unknown>
    if (!user.twoFactorEnabled) {
      // Still return success to not leak info
      return new Response(
        JSON.stringify({ status: true }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    // Generate OTP
    const otp = generateOtp()
    const otpHashed = await hashOtp(otp)

    // Store OTP (rate limiting is inside the mutation)
    const result = await ctx.runMutation(internal.twoFactorOtp.createOtp, {
      email,
      otpHash: otpHashed,
    })

    if (!result.success) {
      return new Response(
        JSON.stringify({ status: false, error: "Terlalu banyak percobaan. Tunggu beberapa menit." }),
        { status: 429, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    // Send email
    await sendTwoFactorOtpEmail(email, otp)

    return new Response(
      JSON.stringify({ status: true }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[2FA] sendOtp error:", error)
    return new Response(
      JSON.stringify({ status: false, error: "Terjadi kesalahan." }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    )
  }
})

export const verifyOtp = httpAction(async (ctx, request) => {
  const cors = getCorsHeaders(request)

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors })
  }

  try {
    const body = (await request.json()) as { email?: string; code?: string }
    const email = body.email?.trim()?.toLowerCase()
    const code = body.code?.trim()

    if (!email || !code) {
      return new Response(
        JSON.stringify({ status: false, error: "Email dan kode diperlukan." }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    // Verify OTP
    const otpHashed = await hashOtp(code)
    const result = await ctx.runMutation(internal.twoFactorOtp.verifyOtp, {
      email,
      otpHash: otpHashed,
    })

    if (!result.success) {
      const errorMsg =
        result.error === "INVALID_CODE"
          ? "Kode salah. Silakan coba lagi."
          : "Kode tidak valid atau sudah kadaluarsa."
      return new Response(
        JSON.stringify({ status: false, error: errorMsg }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    // OTP valid — create bypass token via BetterAuth verification table
    const auth = createAuth(ctx)
    const authCtx = await (auth as any).$context
    const bypassToken = `2fa-bypass-${generateBypassToken()}`

    // Find user to get userId
    const foundUser = await authCtx.internalAdapter.findUserByEmail(email, { includeAccounts: false })
    if (!foundUser) {
      return new Response(
        JSON.stringify({ status: false, error: "User tidak ditemukan." }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    // Store bypass token as verification value (30 second expiry)
    await authCtx.internalAdapter.createVerificationValue({
      identifier: bypassToken,
      value: foundUser.user.id,
      expiresAt: new Date(Date.now() + 30 * 1000),
    })

    return new Response(
      JSON.stringify({ status: true, bypassToken }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[2FA] verifyOtp error:", error)
    return new Response(
      JSON.stringify({ status: false, error: "Terjadi kesalahan." }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    )
  }
})
