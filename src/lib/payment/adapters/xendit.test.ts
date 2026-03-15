import { beforeEach, describe, expect, it } from "vitest"

import { XenditAdapter } from "./xendit"

const CALLBACK_TOKEN = "test-callback-token"

describe("XenditAdapter.verifyWebhook", () => {
  beforeEach(() => {
    process.env.XENDIT_WEBHOOK_TOKEN = CALLBACK_TOKEN
    delete process.env.XENDIT_WEBHOOK_SECRET
  })

  it("falls back to XENDIT_WEBHOOK_SECRET when XENDIT_WEBHOOK_TOKEN is empty string", async () => {
    process.env.XENDIT_WEBHOOK_TOKEN = ""
    process.env.XENDIT_WEBHOOK_SECRET = "fallback-secret"

    const adapter = new XenditAdapter()
    const request = new Request("https://makalah.ai/api/webhooks/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-callback-token": "fallback-secret",
      },
      body: JSON.stringify({
        created: "2026-03-12T00:00:00.000Z",
        business_id: "biz_test",
        event: "payment.capture",
        api_version: "v3",
        data: {
          payment_id: "py_xxx",
          payment_request_id: "pr_xxx",
          reference_id: "ref_xxx",
          status: "SUCCEEDED",
          request_amount: 80000,
          currency: "IDR",
          channel_code: "QRIS",
        },
      }),
    })

    const result = await adapter.verifyWebhook(request)
    expect(result).not.toBeNull()
    expect(result?.providerPaymentId).toBe("pr_xxx")
  })

  it("falls back to XENDIT_WEBHOOK_SECRET when XENDIT_WEBHOOK_TOKEN is whitespace", async () => {
    process.env.XENDIT_WEBHOOK_TOKEN = "  \n  "
    process.env.XENDIT_WEBHOOK_SECRET = "fallback-secret"

    const adapter = new XenditAdapter()
    const request = new Request("https://makalah.ai/api/webhooks/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-callback-token": "fallback-secret",
      },
      body: JSON.stringify({
        created: "2026-03-12T00:00:00.000Z",
        business_id: "biz_test",
        event: "payment.capture",
        api_version: "v3",
        data: {
          payment_id: "py_xxx",
          payment_request_id: "pr_xxx",
          reference_id: "ref_xxx",
          status: "SUCCEEDED",
          request_amount: 80000,
          currency: "IDR",
          channel_code: "QRIS",
        },
      }),
    })

    const result = await adapter.verifyWebhook(request)
    expect(result).not.toBeNull()
    expect(result?.providerPaymentId).toBe("pr_xxx")
  })

  it("returns null when both XENDIT_WEBHOOK_TOKEN and XENDIT_WEBHOOK_SECRET are empty", async () => {
    process.env.XENDIT_WEBHOOK_TOKEN = ""
    process.env.XENDIT_WEBHOOK_SECRET = ""

    const adapter = new XenditAdapter()
    const request = new Request("https://makalah.ai/api/webhooks/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-callback-token": "anything",
      },
      body: JSON.stringify({
        created: "2026-03-12T00:00:00.000Z",
        business_id: "biz_test",
        event: "payment.capture",
        api_version: "v3",
        data: {
          payment_id: "py_xxx",
          payment_request_id: "pr_xxx",
          reference_id: "ref_xxx",
          status: "SUCCEEDED",
          request_amount: 80000,
          currency: "IDR",
          channel_code: "QRIS",
        },
      }),
    })

    const result = await adapter.verifyWebhook(request)
    expect(result).toBeNull()
  })

  it("accepts payment_request.expiry webhook events from Xendit test webhook", async () => {
    const adapter = new XenditAdapter()
    const request = new Request("https://makalah.ai/api/webhooks/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-callback-token": CALLBACK_TOKEN,
      },
      body: JSON.stringify({
        created: "2026-03-07T23:10:00.000Z",
        business_id: "biz_test",
        event: "payment_request.expiry",
        api_version: "v3",
        data: {
          payment_id: "py_test",
          payment_request_id: "pr_test",
          reference_id: "ref_test",
          status: "EXPIRED",
          request_amount: 10000,
          currency: "IDR",
          channel_code: "QRIS",
        },
      }),
    })

    await expect(adapter.verifyWebhook(request)).resolves.toMatchObject({
      providerPaymentId: "pr_test",
      status: "EXPIRED",
      rawAmount: 10000,
      channelCode: "QRIS",
    })
  })
})
