import { describe, expect, it } from "vitest"
import {
  assertEnabledPaymentMethod,
  assertVisibleVAChannel,
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

  it("allows visible VA channel", () => {
    expect(() =>
      assertVisibleVAChannel("BRI_VIRTUAL_ACCOUNT", ["BRI_VIRTUAL_ACCOUNT"])
    ).not.toThrow()
  })

  it("throws when VA channel is hidden", () => {
    expect(() =>
      assertVisibleVAChannel("BNI_VIRTUAL_ACCOUNT", ["BRI_VIRTUAL_ACCOUNT"])
    ).toThrow("Channel Virtual Account tidak tersedia")
  })

  it("throws when VA channel is unknown", () => {
    expect(() =>
      assertVisibleVAChannel("UNKNOWN_CHANNEL", ["BRI_VIRTUAL_ACCOUNT"])
    ).toThrow("Channel Virtual Account tidak valid")
  })
})
