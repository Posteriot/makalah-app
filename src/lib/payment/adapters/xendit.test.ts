import { beforeEach, describe, expect, it } from "vitest"

import { XenditAdapter } from "./xendit"

const CALLBACK_TOKEN = "test-callback-token"

describe("XenditAdapter.verifyWebhook", () => {
  beforeEach(() => {
    process.env.XENDIT_WEBHOOK_TOKEN = CALLBACK_TOKEN
    delete process.env.XENDIT_WEBHOOK_SECRET
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
