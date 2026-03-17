import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}))

import {
  getTokenFromBetterAuthCookies,
  isAuthenticatedFromBetterAuthCookies,
} from "@/lib/auth-server"

describe("auth-server session validation", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("rejects cookie presence without a valid token response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("unauthorized", { status: 401 }),
    )

    await expect(
      isAuthenticatedFromBetterAuthCookies("session=abc"),
    ).resolves.toBe(false)
  })

  it("accepts valid BetterAuth cookies when token endpoint returns a token", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "convex-token" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "convex-token" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )

    await expect(
      isAuthenticatedFromBetterAuthCookies("session=abc"),
    ).resolves.toBe(true)
    await expect(
      getTokenFromBetterAuthCookies("session=abc"),
    ).resolves.toBe("convex-token")
  })

  it("keeps soft-pass behavior on transient network failure", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("ETIMEDOUT"))

    await expect(
      isAuthenticatedFromBetterAuthCookies("session=abc"),
    ).resolves.toBe(true)
    await expect(
      getTokenFromBetterAuthCookies("session=abc"),
    ).resolves.toBeNull()
  })
})
