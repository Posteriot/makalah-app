import { describe, expect, it } from "vitest"
import {
  assertEnabledMethodsConfig,
  getEnabledCheckoutMethods,
  getRuntimeProviderLabel,
  isPaymentMethodEnabled,
  resolveCheckoutMethodSelection,
} from "./runtime-settings"

describe("payment runtime settings", () => {
  it("returns checkout methods in canonical order", () => {
    expect(getEnabledCheckoutMethods(["QRIS", "EWALLET"])).toEqual([
      "qris",
      "ewallet",
    ])
  })

  it("keeps current checkout method when still enabled", () => {
    expect(resolveCheckoutMethodSelection("ewallet", ["QRIS", "EWALLET"])).toBe(
      "ewallet"
    )
  })

  it("falls back to first enabled checkout method when current one is disabled", () => {
    expect(resolveCheckoutMethodSelection("va", ["QRIS", "EWALLET"])).toBe(
      "qris"
    )
  })

  it("returns null when no checkout method is enabled", () => {
    expect(resolveCheckoutMethodSelection("qris", [])).toBeNull()
  })

  it("validates payment method against enabled methods", () => {
    expect(isPaymentMethodEnabled("va", ["VIRTUAL_ACCOUNT"])).toBe(true)
    expect(isPaymentMethodEnabled("va", ["QRIS"])).toBe(false)
  })

  it("returns xendit as the only runtime provider label", () => {
    expect(getRuntimeProviderLabel()).toBe("Xendit")
  })

  it("rejects empty enabled methods config", () => {
    expect(() => assertEnabledMethodsConfig([])).toThrow(
      "Minimal satu metode pembayaran harus aktif"
    )
  })
})
