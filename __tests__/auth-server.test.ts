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

  it("treats 5xx as network error (soft-pass), not invalid session", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("Internal Server Error", { status: 500 }),
    )

    await expect(
      isAuthenticatedFromBetterAuthCookies("session=abc"),
    ).resolves.toBe(true)
    await expect(
      getTokenFromBetterAuthCookies("session=abc"),
    ).resolves.toBeNull()
  })

  it("treats timeout (AbortError) as network error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new DOMException("Signal timed out", "TimeoutError"))

    await expect(
      isAuthenticatedFromBetterAuthCookies("session=abc"),
    ).resolves.toBe(true)
    await expect(
      getTokenFromBetterAuthCookies("session=abc"),
    ).resolves.toBeNull()
  })

  it("retries once and succeeds after a transient network failure", async () => {
    vi.spyOn(global, "fetch")
      .mockRejectedValueOnce(new Error("ETIMEDOUT"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "convex-token" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )

    await expect(
      getTokenFromBetterAuthCookies("session=abc"),
    ).resolves.toBe("convex-token")
  })

  it("retries once and succeeds after a transient 5xx response", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response("Internal Server Error", { status: 502 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "convex-token" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )

    await expect(
      getTokenFromBetterAuthCookies("session=abc"),
    ).resolves.toBe("convex-token")
  })
})
