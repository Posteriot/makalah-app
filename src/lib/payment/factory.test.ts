import { beforeEach, describe, expect, it, vi } from "vitest"

const fetchQuery = vi.fn()

vi.mock("convex/nextjs", () => ({
  fetchQuery: (...args: unknown[]) => fetchQuery(...args),
}))

describe("getProvider", () => {
  beforeEach(() => {
    vi.resetModules()
    fetchQuery.mockReset()
  })

  it("returns xendit adapter when config query fails", async () => {
    fetchQuery.mockRejectedValueOnce(new Error("db unavailable"))
    const { getProvider } = await import("./factory")

    const provider = await getProvider()

    expect(provider.name).toBe("xendit")
  })

  it("returns xendit adapter when config query succeeds", async () => {
    fetchQuery.mockResolvedValueOnce({
      enabledMethods: ["QRIS"],
      webhookUrl: "/api/webhooks/payment",
    })
    const { getProvider } = await import("./factory")

    const provider = await getProvider()

    expect(provider.name).toBe("xendit")
  })
})
