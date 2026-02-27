import { v } from "convex/values"
import { internalMutation } from "../_generated/server"
import type { Id } from "../_generated/dataModel"

const DEFAULT_EMAIL = "erik.supit@gmail.com"
const DEFAULT_SEED_BETTER_AUTH_USER_ID = "seed-skill-importer"

type MigrationCounts = Record<string, number>

function scoreCanonicalCandidate(
  user: {
    betterAuthUserId?: string
    emailVerified: boolean
    role: string
    lastLoginAt?: number
    createdAt: number
  },
  seedBetterAuthUserId: string
): number {
  let score = 0

  const betterAuthId = user.betterAuthUserId ?? ""
  if (betterAuthId && betterAuthId !== seedBetterAuthUserId && !betterAuthId.startsWith("pending_")) {
    score += 1000
  }
  if (user.emailVerified) score += 100
  if (user.role === "superadmin") score += 50
  if (user.lastLoginAt) score += 10

  return score
}

/**
 * Cleanup duplicate app user created by manual seed identity.
 *
 * Run (dry-run):
 * npx convex run migrations/cleanupDuplicateSeedUser:cleanupDuplicateSeedUser '{"dryRun":true}'
 *
 * Run (apply):
 * npx convex run migrations/cleanupDuplicateSeedUser:cleanupDuplicateSeedUser '{"dryRun":false}'
 */
export const cleanupDuplicateSeedUser = internalMutation({
  args: {
    email: v.optional(v.string()),
    seedBetterAuthUserId: v.optional(v.string()),
    canonicalUserId: v.optional(v.id("users")),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const email = (args.email ?? DEFAULT_EMAIL).trim().toLowerCase()
    const seedBetterAuthUserId =
      (args.seedBetterAuthUserId ?? DEFAULT_SEED_BETTER_AUTH_USER_ID).trim()
    const dryRun = args.dryRun ?? true

    const users = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect()

    if (users.length === 0) {
      return {
        success: false,
        dryRun,
        message: `Tidak ada user dengan email ${email}`,
      }
    }

    const seedUser = users.find((u) => u.betterAuthUserId === seedBetterAuthUserId)
    if (!seedUser) {
      return {
        success: true,
        dryRun,
        message: `Tidak ada seed user dengan betterAuthUserId=${seedBetterAuthUserId}. Tidak ada aksi.`,
        totalUsersWithEmail: users.length,
      }
    }

    const canonicalCandidates = users.filter((u) => u._id !== seedUser._id)
    if (canonicalCandidates.length === 0) {
      return {
        success: false,
        dryRun,
        message: "Tidak ada canonical candidate untuk reassign",
        seedUserId: seedUser._id,
      }
    }

    const canonicalUser = args.canonicalUserId
      ? canonicalCandidates.find((u) => u._id === args.canonicalUserId) ?? null
      : canonicalCandidates
        .sort((a, b) => {
          const scoreA = scoreCanonicalCandidate(a, seedBetterAuthUserId)
          const scoreB = scoreCanonicalCandidate(b, seedBetterAuthUserId)
          if (scoreA !== scoreB) return scoreB - scoreA
          const loginA = a.lastLoginAt ?? 0
          const loginB = b.lastLoginAt ?? 0
          if (loginA !== loginB) return loginB - loginA
          return b.createdAt - a.createdAt
        })[0]

    if (!canonicalUser) {
      return {
        success: false,
        dryRun,
        message: "canonicalUserId tidak valid untuk email target",
        seedUserId: seedUser._id,
        requestedCanonicalUserId: args.canonicalUserId ?? null,
      }
    }

    const seedUserId = seedUser._id
    const canonicalUserId = canonicalUser._id
    const counts: MigrationCounts = {}

    const papers = await ctx.db
      .query("papers")
      .withIndex("by_user", (q) => q.eq("userId", seedUserId))
      .collect()
    counts.papers = papers.length
    if (!dryRun) {
      for (const row of papers) {
        await ctx.db.patch(row._id, { userId: canonicalUserId })
      }
    }

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", seedUserId))
      .collect()
    counts.conversations = conversations.length
    if (!dryRun) {
      for (const row of conversations) {
        await ctx.db.patch(row._id, { userId: canonicalUserId })
      }
    }

    const files = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", seedUserId))
      .collect()
    counts.files = files.length
    if (!dryRun) {
      for (const row of files) {
        await ctx.db.patch(row._id, { userId: canonicalUserId })
      }
    }

    const artifacts = await ctx.db
      .query("artifacts")
      .withIndex("by_user", (q) => q.eq("userId", seedUserId))
      .collect()
    counts.artifacts = artifacts.length
    if (!dryRun) {
      for (const row of artifacts) {
        await ctx.db.patch(row._id, { userId: canonicalUserId })
      }
    }

    const paperSessions = await ctx.db
      .query("paperSessions")
      .withIndex("by_user_updated", (q) => q.eq("userId", seedUserId))
      .collect()
    counts.paperSessions = paperSessions.length
    if (!dryRun) {
      for (const row of paperSessions) {
        await ctx.db.patch(row._id, { userId: canonicalUserId })
      }
    }

    const rewindHistory = await ctx.db
      .query("rewindHistory")
      .withIndex("by_user", (q) => q.eq("userId", seedUserId))
      .collect()
    counts.rewindHistory = rewindHistory.length
    if (!dryRun) {
      for (const row of rewindHistory) {
        await ctx.db.patch(row._id, { userId: canonicalUserId })
      }
    }

    const usageEvents = await ctx.db
      .query("usageEvents")
      .withIndex("by_user_time", (q) => q.eq("userId", seedUserId))
      .collect()
    counts.usageEvents = usageEvents.length
    if (!dryRun) {
      for (const row of usageEvents) {
        await ctx.db.patch(row._id, { userId: canonicalUserId })
      }
    }

    const userQuotas = await ctx.db
      .query("userQuotas")
      .withIndex("by_user", (q) => q.eq("userId", seedUserId))
      .collect()
    counts.userQuotas = userQuotas.length
    if (!dryRun) {
      for (const row of userQuotas) {
        await ctx.db.patch(row._id, { userId: canonicalUserId })
      }
    }

    const creditBalances = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", seedUserId))
      .collect()
    counts.creditBalances = creditBalances.length
    if (!dryRun) {
      for (const row of creditBalances) {
        await ctx.db.patch(row._id, { userId: canonicalUserId })
      }
    }

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_user", (q) => q.eq("userId", seedUserId))
      .collect()
    counts.payments = payments.length
    if (!dryRun) {
      for (const row of payments) {
        await ctx.db.patch(row._id, { userId: canonicalUserId })
      }
    }

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", seedUserId))
      .collect()
    counts.subscriptions = subscriptions.length
    if (!dryRun) {
      for (const row of subscriptions) {
        await ctx.db.patch(row._id, { userId: canonicalUserId })
      }
    }

    const styleConstitutions = await ctx.db.query("styleConstitutions").collect()
    const styleConstitutionsMatched = styleConstitutions.filter(
      (row) => row.createdBy === seedUserId
    )
    counts.styleConstitutions = styleConstitutionsMatched.length
    if (!dryRun) {
      for (const row of styleConstitutionsMatched) {
        await ctx.db.patch(row._id, { createdBy: canonicalUserId })
      }
    }

    const systemPrompts = await ctx.db.query("systemPrompts").collect()
    const systemPromptsMatched = systemPrompts.filter(
      (row) => row.createdBy === seedUserId
    )
    counts.systemPrompts = systemPromptsMatched.length
    if (!dryRun) {
      for (const row of systemPromptsMatched) {
        await ctx.db.patch(row._id, { createdBy: canonicalUserId })
      }
    }

    const aiProviderConfigs = await ctx.db.query("aiProviderConfigs").collect()
    const aiProviderConfigsMatched = aiProviderConfigs.filter(
      (row) => row.createdBy === seedUserId
    )
    counts.aiProviderConfigs = aiProviderConfigsMatched.length
    if (!dryRun) {
      for (const row of aiProviderConfigsMatched) {
        await ctx.db.patch(row._id, { createdBy: canonicalUserId })
      }
    }

    const systemAlerts = await ctx.db.query("systemAlerts").collect()
    const systemAlertsMatched = systemAlerts.filter(
      (row) => row.resolvedBy === seedUserId
    )
    counts.systemAlertsResolvedBy = systemAlertsMatched.length
    if (!dryRun) {
      for (const row of systemAlertsMatched) {
        await ctx.db.patch(row._id, { resolvedBy: canonicalUserId })
      }
    }

    const appConfig = await ctx.db.query("appConfig").collect()
    const appConfigMatched = appConfig.filter((row) => row.updatedBy === seedUserId)
    counts.appConfigUpdatedBy = appConfigMatched.length
    if (!dryRun) {
      for (const row of appConfigMatched) {
        await ctx.db.patch(row._id, { updatedBy: canonicalUserId })
      }
    }

    const aiTelemetry = await ctx.db.query("aiTelemetry").collect()
    const aiTelemetryMatched = aiTelemetry.filter((row) => row.userId === seedUserId)
    counts.aiTelemetry = aiTelemetryMatched.length
    if (!dryRun) {
      for (const row of aiTelemetryMatched) {
        await ctx.db.patch(row._id, { userId: canonicalUserId })
      }
    }

    const pageContent = await ctx.db.query("pageContent").collect()
    const pageContentMatched = pageContent.filter(
      (row) => row.updatedBy === seedUserId
    )
    counts.pageContentUpdatedBy = pageContentMatched.length
    if (!dryRun) {
      for (const row of pageContentMatched) {
        await ctx.db.patch(row._id, { updatedBy: canonicalUserId })
      }
    }

    const richTextPages = await ctx.db.query("richTextPages").collect()
    const richTextPagesMatched = richTextPages.filter(
      (row) => row.updatedBy === seedUserId
    )
    counts.richTextPagesUpdatedBy = richTextPagesMatched.length
    if (!dryRun) {
      for (const row of richTextPagesMatched) {
        await ctx.db.patch(row._id, { updatedBy: canonicalUserId })
      }
    }

    const siteConfig = await ctx.db.query("siteConfig").collect()
    const siteConfigMatched = siteConfig.filter((row) => row.updatedBy === seedUserId)
    counts.siteConfigUpdatedBy = siteConfigMatched.length
    if (!dryRun) {
      for (const row of siteConfigMatched) {
        await ctx.db.patch(row._id, { updatedBy: canonicalUserId })
      }
    }

    const totalReassigned = Object.values(counts).reduce((acc, value) => acc + value, 0)

    if (!dryRun) {
      await ctx.db.delete(seedUserId)
    }

    return {
      success: true,
      dryRun,
      email,
      seedBetterAuthUserId,
      seedUserId,
      canonicalUserId: canonicalUserId as Id<"users">,
      usersWithEmail: users.map((u) => ({
        _id: u._id,
        betterAuthUserId: u.betterAuthUserId ?? null,
        emailVerified: u.emailVerified,
        role: u.role,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt ?? null,
      })),
      totalReassigned,
      counts,
      deletedSeedUser: !dryRun,
      message: dryRun
        ? "Dry-run selesai. Tidak ada perubahan data."
        : "Cleanup selesai. Seed user dihapus.",
    }
  },
})
