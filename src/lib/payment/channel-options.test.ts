import { describe, expect, it } from "vitest"

import {
  ACTIVE_EWALLET_CHANNELS,
  ACTIVE_VA_CHANNELS,
  getDefaultVisibleVAChannels,
  getVisibleVAChannels,
  isKnownVAChannel,
} from "./channel-options"

describe("payment channel options", () => {
  it("lists only active virtual account channels for checkout", () => {
    expect(ACTIVE_VA_CHANNELS).toEqual([
      { code: "BJB_VIRTUAL_ACCOUNT", shortLabel: "BJB", label: "Bank BJB" },
      { code: "BNI_VIRTUAL_ACCOUNT", shortLabel: "BNI", label: "Bank Negara Indonesia" },
      { code: "BRI_VIRTUAL_ACCOUNT", shortLabel: "BRI", label: "Bank Rakyat Indonesia" },
      { code: "BSI_VIRTUAL_ACCOUNT", shortLabel: "BSI", label: "Bank Syariah Indonesia" },
      { code: "CIMB_VIRTUAL_ACCOUNT", shortLabel: "CIMB", label: "CIMB Niaga" },
      { code: "MANDIRI_VIRTUAL_ACCOUNT", shortLabel: "Mandiri", label: "Bank Mandiri" },
      { code: "PERMATA_VIRTUAL_ACCOUNT", shortLabel: "Permata", label: "PermataBank" },
    ])
  })

  it("lists only OVO as the active e-wallet channel", () => {
    expect(ACTIVE_EWALLET_CHANNELS).toEqual([
      { code: "OVO", label: "OVO", requiresMobileNumber: true },
    ])
  })

  it("returns all active VA channels as default visible channels", () => {
    expect(getDefaultVisibleVAChannels()).toEqual(
      ACTIVE_VA_CHANNELS.map((channel) => channel.code)
    )
  })

  it("filters VA channels by visible channel codes", () => {
    expect(
      getVisibleVAChannels(["BRI_VIRTUAL_ACCOUNT", "MANDIRI_VIRTUAL_ACCOUNT"]).map(
        (channel) => channel.code
      )
    ).toEqual(["BRI_VIRTUAL_ACCOUNT", "MANDIRI_VIRTUAL_ACCOUNT"])
  })

  it("ignores unknown channel codes when filtering VA channels", () => {
    expect(getVisibleVAChannels(["UNKNOWN_CHANNEL"]).map((channel) => channel.code)).toEqual([])
  })

  it("knows only listed active VA channels", () => {
    expect(isKnownVAChannel("BJB_VIRTUAL_ACCOUNT")).toBe(true)
    expect(isKnownVAChannel("UNKNOWN_CHANNEL")).toBe(false)
  })
})
