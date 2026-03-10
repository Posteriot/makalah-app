import { vi } from "vitest"

// Mock convex/nextjs to avoid server-side dependency in test environment
vi.mock("convex/nextjs", () => ({
  fetchQuery: vi.fn(),
  fetchMutation: vi.fn(),
}))

// Mock convex generated API (not needed for pure function tests, but required for module load)
vi.mock("../convex/_generated/api", () => ({
  api: {},
}))

import { getEffectiveTier } from "@/lib/utils/subscription"
import { estimateTotalTokens } from "@/lib/billing/enforcement"

describe("Billing Type Safety", () => {
  describe("getEffectiveTier", () => {
    it('returns "bpp" for user with bpp subscription status', () => {
      const tier = getEffectiveTier("user", "bpp")
      expect(tier).toBe("bpp")
    })
  })

  describe("estimateTotalTokens", () => {
    // "hello" = 5 chars, CHARS_PER_TOKEN = 3
    // estimateTokens("hello") = ceil(5/3) = ceil(1.667) = 2
    // chat_message multiplier = 1.0
    // total = ceil(2 * (1 + 1.0)) = ceil(4) = 4
    it("uses multiplier 1.0 for chat_message", () => {
      const result = estimateTotalTokens("hello", "chat_message")
      expect(result).toBe(4)
    })

    // paper_generation multiplier = 1.5
    // total = ceil(2 * (1 + 1.5)) = ceil(5) = 5
    it("uses multiplier 1.5 for paper_generation", () => {
      const result = estimateTotalTokens("hello", "paper_generation")
      expect(result).toBe(5)
    })
  })
})
