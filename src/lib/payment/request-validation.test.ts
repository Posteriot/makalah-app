import { describe, expect, it } from "vitest"
import { assertEnabledPaymentMethod } from "./request-validation"

describe("assertEnabledPaymentMethod", () => {
  it("allows enabled payment methods", () => {
    expect(() =>
      assertEnabledPaymentMethod("qris", ["QRIS", "EWALLET"])
    ).not.toThrow()
  })

  it("throws when payment method is disabled", () => {
    expect(() =>
      assertEnabledPaymentMethod("va", ["QRIS"])
    ).toThrow("Metode pembayaran tidak tersedia")
  })
})
