import { beforeEach, describe, expect, it } from "vitest"
import { assertPaymentSystemReady } from "./preflight"

describe("assertPaymentSystemReady", () => {
  beforeEach(() => {
    process.env.XENDIT_SECRET_KEY = "xnd_test_key"
    process.env.XENDIT_WEBHOOK_TOKEN = "test-token"
    process.env.XENDIT_WEBHOOK_SECRET = ""
    process.env.CONVEX_INTERNAL_KEY = "test-internal-key"
  })

  it("returns ready when all env vars are set", () => {
    const result = assertPaymentSystemReady()
    expect(result.ready).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it("fails when XENDIT_SECRET_KEY is missing", () => {
    delete process.env.XENDIT_SECRET_KEY
    const result = assertPaymentSystemReady()
    expect(result.ready).toBe(false)
    expect(result.reason).toContain("XENDIT_SECRET_KEY")
  })

  it("fails when XENDIT_SECRET_KEY is empty string", () => {
    process.env.XENDIT_SECRET_KEY = ""
    const result = assertPaymentSystemReady()
    expect(result.ready).toBe(false)
  })

  it("fails when both webhook token and secret are missing", () => {
    delete process.env.XENDIT_WEBHOOK_TOKEN
    delete process.env.XENDIT_WEBHOOK_SECRET
    const result = assertPaymentSystemReady()
    expect(result.ready).toBe(false)
    expect(result.reason).toContain("webhook")
  })

  it("passes when only XENDIT_WEBHOOK_SECRET is set", () => {
    process.env.XENDIT_WEBHOOK_TOKEN = ""
    process.env.XENDIT_WEBHOOK_SECRET = "secret-value"
    const result = assertPaymentSystemReady()
    expect(result.ready).toBe(true)
  })

  it("fails when CONVEX_INTERNAL_KEY is missing", () => {
    delete process.env.CONVEX_INTERNAL_KEY
    const result = assertPaymentSystemReady()
    expect(result.ready).toBe(false)
    expect(result.reason).toContain("CONVEX_INTERNAL_KEY")
  })

  it("returns user-facing message in Indonesian", () => {
    delete process.env.XENDIT_SECRET_KEY
    const result = assertPaymentSystemReady()
    expect(result.userMessage).toContain("tidak tersedia")
  })
})
