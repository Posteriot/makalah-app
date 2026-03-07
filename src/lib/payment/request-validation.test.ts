import { describe, expect, it } from "vitest"
import {
  assertEnabledPaymentMethod,
  assertSupportedRuntimePaymentType,
  assertValidEnabledMethodsConfig,
} from "./request-validation"

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

  it("rejects empty enabled payment settings", () => {
    expect(() => assertValidEnabledMethodsConfig([])).toThrow(
      "Minimal satu metode pembayaran harus aktif"
    )
  })

  it("rejects unsupported runtime payment types", () => {
    expect(() =>
      assertSupportedRuntimePaymentType("paper_completion")
    ).toThrow("Jenis pembayaran ini tidak didukung di runtime aktif")
  })
})
