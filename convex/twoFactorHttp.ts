import { httpAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { createAuth } from "./auth"
import { hashOtp } from "./twoFactorOtp"
import { sendTwoFactorOtpEmail } from "./authEmails"
import { fetchAndRenderTemplate } from "./emailTemplateHelper"
import { sendViaResend } from "./authEmails"
import { getAllowedCorsOrigin } from "./authOrigins"
import { symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto"

type AuthUserWithTwoFactor = {
  twoFactorEnabled?: boolean
}

type TwoFactorRecord = {
  backupCodes?: string
}

function getCorsHeaders(request: Request): Record<string, string> {
  const allowed = getAllowedCorsOrigin(request)
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

function parseBackupCodes(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
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
    const authCtx = await auth.$context
    const foundUser = await authCtx.internalAdapter.findUserByEmail(email, {
      includeAccounts: false,
    })

    if (!foundUser) {
      // Don't reveal whether email exists — still return success
      return new Response(
        JSON.stringify({ status: true }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    // Check twoFactorEnabled on the user record
    const user = foundUser.user as typeof foundUser.user & AuthUserWithTwoFactor
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

    // Send email — try DB template first, fallback to hardcoded
    const rendered = await fetchAndRenderTemplate(ctx, "two_factor_otp", {
      otpCode: otp,
      appName: "Makalah AI",
    })
    if (rendered) {
      await sendViaResend(email, rendered.subject, rendered.html)
    } else {
      await sendTwoFactorOtpEmail(email, otp)
    }

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
    const authCtx = await auth.$context
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

export const verifyBackupCode = httpAction(async (ctx, request) => {
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
        JSON.stringify({ status: false, error: "Email dan backup code diperlukan." }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    const auth = createAuth(ctx)
    const authCtx = await auth.$context
    const foundUser = await authCtx.internalAdapter.findUserByEmail(email, {
      includeAccounts: false,
    })

    if (!foundUser) {
      return new Response(
        JSON.stringify({ status: false, error: "Backup code tidak valid atau sudah terpakai." }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    const twoFactor = (await authCtx.adapter.findOne({
      model: "twoFactor",
      where: [{ field: "userId", value: foundUser.user.id }],
    })) as TwoFactorRecord | null

    if (!twoFactor || typeof twoFactor.backupCodes !== "string") {
      return new Response(
        JSON.stringify({ status: false, error: "Backup code tidak valid atau sudah terpakai." }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    const decryptedBackupCodes = await symmetricDecrypt({
      key: authCtx.secret,
      data: twoFactor.backupCodes,
    })
    const backupCodes = parseBackupCodes(decryptedBackupCodes)

    if (!backupCodes.includes(code)) {
      return new Response(
        JSON.stringify({ status: false, error: "Backup code tidak valid atau sudah terpakai." }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    const updatedBackupCodes = backupCodes.filter((item) => item !== code)
    const encryptedBackupCodes = await symmetricEncrypt({
      key: authCtx.secret,
      data: JSON.stringify(updatedBackupCodes),
    })

    const updated = await authCtx.adapter.updateMany({
      model: "twoFactor",
      update: { backupCodes: encryptedBackupCodes },
      where: [
        { field: "userId", value: foundUser.user.id },
        { field: "backupCodes", value: twoFactor.backupCodes },
      ],
    })

    if (!updated) {
      return new Response(
        JSON.stringify({ status: false, error: "Gagal memverifikasi backup code. Coba lagi." }),
        { status: 409, headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    const bypassToken = `2fa-bypass-${generateBypassToken()}`
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
    console.error("[2FA] verifyBackupCode error:", error)
    return new Response(
      JSON.stringify({ status: false, error: "Terjadi kesalahan." }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    )
  }
})
