import { describe, expect, it } from "vitest"

import {
  getVAChannelFullLabel,
  getVAChannelOption,
  getVAPaymentMethodLabel,
} from "./channel-labels"

describe("payment channel labels", () => {
  it("resolves VA metadata from provider channel code", () => {
    expect(getVAChannelOption("BNI_VIRTUAL_ACCOUNT")).toMatchObject({
      shortLabel: "BNI",
      label: "Bank Negara Indonesia",
    })
  })

  it("resolves VA full label from legacy short label", () => {
    expect(getVAChannelFullLabel("BRI")).toBe("Bank Rakyat Indonesia")
  })

  it("builds a readable virtual account payment label", () => {
    expect(getVAPaymentMethodLabel("BSI_VIRTUAL_ACCOUNT")).toBe(
      "Virtual Account - Bank Syariah Indonesia"
    )
  })
})
