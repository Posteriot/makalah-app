import { beforeEach, describe, expect, it, vi } from "vitest"

describe("auth-2fa verifyBackupCode", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("memanggil endpoint /api/auth/2fa/verify-backup-code", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_SITE_URL", "https://convex.test")
    vi.resetModules()

    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: true, bypassToken: "token-1" }),
    })
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch)

    const { verifyBackupCode } = await import("@/lib/auth-2fa")
    const result = await verifyBackupCode("user@example.com", "DX1va-73eL5")

    expect(fetchMock).toHaveBeenCalledWith(
      "https://convex.test/api/auth/2fa/verify-backup-code",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", code: "DX1va-73eL5" }),
      })
    )
    expect(result).toEqual({ status: true, bypassToken: "token-1" })
  })

  it("mengembalikan error fallback ketika request gagal", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_SITE_URL", "https://convex.test")
    vi.resetModules()

    const fetchMock = vi.fn().mockRejectedValue(new Error("network"))
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch)

    const { verifyBackupCode } = await import("@/lib/auth-2fa")
    const result = await verifyBackupCode("user@example.com", "DX1va-73eL5")

    expect(result).toEqual({
      status: false,
      error: "Gagal memverifikasi backup code.",
    })
  })
})
