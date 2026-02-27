type BetterAuthUserRecord = {
  id?: unknown
  _id?: unknown
  email?: unknown
} | null

type AssertBetterAuthIdentityForEmailParams = {
  betterAuthUserId: string
  email: string
  findUserByEmail: (normalizedEmail: string) => Promise<BetterAuthUserRecord>
}

export function extractBetterAuthUserId(user: BetterAuthUserRecord): string | null {
  if (!user) return null
  if (typeof user.id === "string" && user.id.length > 0) return user.id
  if (typeof user._id === "string" && user._id.length > 0) return user._id
  return null
}

export async function assertBetterAuthIdentityForEmail(
  params: AssertBetterAuthIdentityForEmailParams
): Promise<void> {
  const normalizedEmail = params.email.trim().toLowerCase()
  const betterAuthUser = await params.findUserByEmail(normalizedEmail)

  if (!betterAuthUser) {
    throw new Error("BetterAuth user tidak ditemukan untuk email ini")
  }

  const resolvedBetterAuthUserId = extractBetterAuthUserId(betterAuthUser)
  if (!resolvedBetterAuthUserId || resolvedBetterAuthUserId !== params.betterAuthUserId) {
    throw new Error("betterAuthUserId tidak valid untuk email ini")
  }
}
