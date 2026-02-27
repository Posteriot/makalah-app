import {
  assertBetterAuthIdentityForEmail,
  extractBetterAuthUserId,
} from "@convex/lib/betterAuthIdentityGuard"

describe("betterAuthIdentityGuard", () => {
  describe("extractBetterAuthUserId", () => {
    it("returns id when available", () => {
      expect(extractBetterAuthUserId({ id: "user_123" })).toBe("user_123")
    })

    it("falls back to _id", () => {
      expect(extractBetterAuthUserId({ _id: "user_456" })).toBe("user_456")
    })

    it("returns null when id fields are missing", () => {
      expect(extractBetterAuthUserId({ email: "a@b.com" })).toBeNull()
      expect(extractBetterAuthUserId(null)).toBeNull()
    })
  })

  describe("assertBetterAuthIdentityForEmail", () => {
    it("normalizes email before lookup", async () => {
      const calls: string[] = []
      await assertBetterAuthIdentityForEmail({
        betterAuthUserId: "user_real",
        email: "  Erik.Supit@GMAIL.com  ",
        findUserByEmail: async (normalizedEmail) => {
          calls.push(normalizedEmail)
          return { id: "user_real" }
        },
      })

      expect(calls).toEqual(["erik.supit@gmail.com"])
    })

    it("throws when BetterAuth user for email is missing", async () => {
      await expect(
        assertBetterAuthIdentityForEmail({
          betterAuthUserId: "user_real",
          email: "erik.supit@gmail.com",
          findUserByEmail: async () => null,
        })
      ).rejects.toThrow("BetterAuth user tidak ditemukan untuk email ini")
    })

    it("throws when betterAuthUserId does not match lookup result", async () => {
      await expect(
        assertBetterAuthIdentityForEmail({
          betterAuthUserId: "seed-skill-importer",
          email: "erik.supit@gmail.com",
          findUserByEmail: async () => ({ id: "user_real" }),
        })
      ).rejects.toThrow("betterAuthUserId tidak valid untuk email ini")
    })

    it("passes when betterAuthUserId matches lookup result", async () => {
      await expect(
        assertBetterAuthIdentityForEmail({
          betterAuthUserId: "user_real",
          email: "erik.supit@gmail.com",
          findUserByEmail: async () => ({ id: "user_real" }),
        })
      ).resolves.toBeUndefined()
    })
  })
})
