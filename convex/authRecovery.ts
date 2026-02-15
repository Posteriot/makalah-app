import { v } from "convex/values"
import { mutation } from "./_generated/server"
import { components } from "./_generated/api"

const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS_PER_KEY = 5
const MAX_ATTEMPTS_PER_EMAIL = 10
const MAX_ATTEMPTS_PER_IP = 30

const COOLDOWN_FIRST_MS = 5 * 60 * 1000
const COOLDOWN_SECOND_MS = 15 * 60 * 1000
const COOLDOWN_THIRD_MS = 60 * 60 * 1000

function isInternalKeyValid(internalKey?: string) {
  const expected = process.env.CONVEX_INTERNAL_KEY
  return Boolean(expected && internalKey === expected)
}

function getCooldownDurationMs(violationCount: number) {
  if (violationCount <= 1) return COOLDOWN_FIRST_MS
  if (violationCount === 2) return COOLDOWN_SECOND_MS
  return COOLDOWN_THIRD_MS
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function sumAttemptsInWindow(
  records: Array<{ attemptCount: number; windowStartAt: number }>,
  now: number
) {
  return records.reduce((total, record) => {
    if (now - record.windowStartAt > WINDOW_MS) return total
    return total + record.attemptCount
  }, 0)
}

export const precheckEmailRecovery = mutation({
  args: {
    email: v.string(),
    emailHash: v.string(),
    ipHash: v.string(),
    keyHash: v.string(),
    intent: v.union(v.literal("magic-link"), v.literal("forgot-password")),
    internalKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isInternalKeyValid(args.internalKey)) {
      throw new Error("Unauthorized")
    }

    const now = Date.now()
    const normalizedEmail = normalizeEmail(args.email)
    const trimmedEmail = args.email.trim()

    if (!normalizedEmail) {
      return {
        status: "email_not_registered" as const,
        emailRegistered: false,
      }
    }

    const attemptRecord = await ctx.db
      .query("authRecoveryAttempts")
      .withIndex("by_key_hash_intent", (q) =>
        q.eq("keyHash", args.keyHash).eq("intent", args.intent)
      )
      .unique()

    if (attemptRecord?.blockedUntil && attemptRecord.blockedUntil > now) {
      return {
        status: "rate_limited" as const,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((attemptRecord.blockedUntil - now) / 1000)
        ),
      }
    }

    const isWindowExpired =
      !attemptRecord || now - attemptRecord.windowStartAt >= WINDOW_MS

    const nextWindowStartAt = isWindowExpired ? now : attemptRecord.windowStartAt
    const nextAttemptCount = isWindowExpired
      ? 1
      : (attemptRecord?.attemptCount ?? 0) + 1

    const windowBoundary = now - WINDOW_MS

    const emailRecords = await ctx.db
      .query("authRecoveryAttempts")
      .withIndex("by_email_window", (q) =>
        q.eq("emailHash", args.emailHash).gte("windowStartAt", windowBoundary)
      )
      .collect()

    const ipRecords = await ctx.db
      .query("authRecoveryAttempts")
      .withIndex("by_ip_window", (q) =>
        q.eq("ipHash", args.ipHash).gte("windowStartAt", windowBoundary)
      )
      .collect()

    const emailAttemptsInWindow = sumAttemptsInWindow(emailRecords, now)
    const ipAttemptsInWindow = sumAttemptsInWindow(ipRecords, now)

    const wouldHitLimit =
      nextAttemptCount > MAX_ATTEMPTS_PER_KEY ||
      emailAttemptsInWindow + 1 > MAX_ATTEMPTS_PER_EMAIL ||
      ipAttemptsInWindow + 1 > MAX_ATTEMPTS_PER_IP

    if (wouldHitLimit) {
      const nextViolationCount = (attemptRecord?.violationCount ?? 0) + 1
      const blockedUntil = now + getCooldownDurationMs(nextViolationCount)

      if (attemptRecord) {
        await ctx.db.patch(attemptRecord._id, {
          attemptCount: isWindowExpired ? 0 : attemptRecord.attemptCount,
          windowStartAt: nextWindowStartAt,
          blockedUntil,
          violationCount: nextViolationCount,
          updatedAt: now,
        })
      } else {
        await ctx.db.insert("authRecoveryAttempts", {
          keyHash: args.keyHash,
          emailHash: args.emailHash,
          ipHash: args.ipHash,
          intent: args.intent,
          attemptCount: 0,
          windowStartAt: nextWindowStartAt,
          blockedUntil,
          violationCount: nextViolationCount,
          createdAt: now,
          updatedAt: now,
        })
      }

      return {
        status: "rate_limited" as const,
        retryAfterSeconds: Math.max(1, Math.ceil((blockedUntil - now) / 1000)),
      }
    }

    if (attemptRecord) {
      await ctx.db.patch(attemptRecord._id, {
        attemptCount: nextAttemptCount,
        windowStartAt: nextWindowStartAt,
        blockedUntil: undefined,
        updatedAt: now,
      })
    } else {
      await ctx.db.insert("authRecoveryAttempts", {
        keyHash: args.keyHash,
        emailHash: args.emailHash,
        ipHash: args.ipHash,
        intent: args.intent,
        attemptCount: nextAttemptCount,
        windowStartAt: nextWindowStartAt,
        createdAt: now,
        updatedAt: now,
      })
    }

    const normalizedMatch = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "email", operator: "eq", value: normalizedEmail }],
    })

    if (normalizedMatch) {
      return {
        status: "registered" as const,
        emailRegistered: true,
      }
    }

    if (trimmedEmail && trimmedEmail !== normalizedEmail) {
      const exactMatch = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "email", operator: "eq", value: trimmedEmail }],
      })

      if (exactMatch) {
        return {
          status: "registered" as const,
          emailRegistered: true,
        }
      }
    }

    return {
      status: "email_not_registered" as const,
      emailRegistered: false,
    }
  },
})
