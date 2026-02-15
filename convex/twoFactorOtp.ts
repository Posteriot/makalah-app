import { v } from "convex/values"
import { internalMutation, internalQuery } from "./_generated/server"

const OTP_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes
const MAX_ATTEMPTS = 5
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const RATE_LIMIT_MAX = 5

export async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(otp)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export const createOtp = internalMutation({
  args: {
    email: v.string(),
    otpHash: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Rate limit: count OTPs created for this email in last 10 minutes
    const recentOtps = await ctx.db
      .query("twoFactorOtps")
      .withIndex("by_email", (q) =>
        q.eq("email", args.email).gte("createdAt", now - RATE_LIMIT_WINDOW_MS)
      )
      .collect()

    if (recentOtps.length >= RATE_LIMIT_MAX) {
      return { success: false, error: "RATE_LIMITED" as const }
    }

    await ctx.db.insert("twoFactorOtps", {
      email: args.email,
      otpHash: args.otpHash,
      expiresAt: now + OTP_EXPIRY_MS,
      attempts: 0,
      used: false,
      createdAt: now,
    })

    return { success: true }
  },
})

export const verifyOtp = internalMutation({
  args: {
    email: v.string(),
    otpHash: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Find the latest non-expired, non-used OTP for this email
    const otps = await ctx.db
      .query("twoFactorOtps")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .order("desc")
      .collect()

    const validOtp = otps.find(
      (otp) => !otp.used && otp.expiresAt > now && otp.attempts < MAX_ATTEMPTS
    )

    if (!validOtp) {
      return { success: false, error: "INVALID_OR_EXPIRED" as const }
    }

    if (validOtp.otpHash !== args.otpHash) {
      // Increment attempts
      await ctx.db.patch(validOtp._id, {
        attempts: validOtp.attempts + 1,
      })
      return { success: false, error: "INVALID_CODE" as const }
    }

    // Mark as used
    await ctx.db.patch(validOtp._id, { used: true })

    return { success: true }
  },
})

export const getOtpCountForEmail = internalQuery({
  args: {
    email: v.string(),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const otps = await ctx.db
      .query("twoFactorOtps")
      .withIndex("by_email", (q) =>
        q.eq("email", args.email).gte("createdAt", args.since)
      )
      .collect()
    return otps.length
  },
})

export const cleanupExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const expired = await ctx.db
      .query("twoFactorOtps")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", now))
      .collect()

    for (const otp of expired) {
      await ctx.db.delete(otp._id)
    }

    return { deleted: expired.length }
  },
})
