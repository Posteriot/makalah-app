import { describe, expect, it } from "vitest"

import { ACTIVE_EWALLET_CHANNELS, ACTIVE_VA_CHANNELS } from "./channel-options"

describe("payment channel options", () => {
  it("lists only active virtual account channels for checkout", () => {
    expect(ACTIVE_VA_CHANNELS).toEqual([
      { code: "BJB_VIRTUAL_ACCOUNT", label: "BJB" },
      { code: "BNI_VIRTUAL_ACCOUNT", label: "BNI" },
      { code: "BRI_VIRTUAL_ACCOUNT", label: "BRI" },
      { code: "BSI_VIRTUAL_ACCOUNT", label: "BSI" },
      { code: "CIMB_VIRTUAL_ACCOUNT", label: "CIMB" },
      { code: "MANDIRI_VIRTUAL_ACCOUNT", label: "Mandiri" },
      { code: "PERMATA_VIRTUAL_ACCOUNT", label: "Permata" },
    ])
  })

  it("lists only OVO as the active e-wallet channel", () => {
    expect(ACTIVE_EWALLET_CHANNELS).toEqual([
      { code: "OVO", label: "OVO", requiresMobileNumber: true },
    ])
  })
})
