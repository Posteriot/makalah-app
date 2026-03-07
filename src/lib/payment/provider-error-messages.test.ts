import { describe, expect, it } from "vitest"

import { mapPaymentCreationErrorMessage } from "./provider-error-messages"

describe("mapPaymentCreationErrorMessage", () => {
  it("maps QRIS activation errors to a system-not-ready message", () => {
    expect(
      mapPaymentCreationErrorMessage(
        "qris",
        "Payment request failed because this specific payment channel has not been activated. Please activate via Xendit dashboard before retrying"
      )
    ).toBe("QRIS belum tersedia. Sistem pembayaran QRIS masih dalam proses aktivasi.")
  })

  it("keeps non-QRIS provider errors unchanged", () => {
    const message = "Payment request failed because this specific payment channel has not been activated."

    expect(mapPaymentCreationErrorMessage("va", message)).toBe(message)
  })

  it("maps OVO activation errors to a system-not-ready message", () => {
    expect(
      mapPaymentCreationErrorMessage(
        "ewallet",
        "Payment request failed because this specific payment channel has not been activated. Please activate via Xendit dashboard before retrying"
      )
    ).toBe("OVO belum tersedia. Sistem pembayaran OVO masih dalam proses aktivasi.")
  })
})
