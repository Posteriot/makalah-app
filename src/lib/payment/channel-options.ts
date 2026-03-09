import type { EWalletChannelOption, VAChannelOption } from "./types"

export const ACTIVE_VA_CHANNELS: VAChannelOption[] = [
  { code: "BJB_VIRTUAL_ACCOUNT", shortLabel: "BJB", label: "Bank BJB" },
  { code: "BNI_VIRTUAL_ACCOUNT", shortLabel: "BNI", label: "Bank Negara Indonesia" },
  { code: "BRI_VIRTUAL_ACCOUNT", shortLabel: "BRI", label: "Bank Rakyat Indonesia" },
  { code: "BSI_VIRTUAL_ACCOUNT", shortLabel: "BSI", label: "Bank Syariah Indonesia" },
  { code: "CIMB_VIRTUAL_ACCOUNT", shortLabel: "CIMB", label: "CIMB Niaga" },
  { code: "MANDIRI_VIRTUAL_ACCOUNT", shortLabel: "Mandiri", label: "Bank Mandiri" },
  { code: "PERMATA_VIRTUAL_ACCOUNT", shortLabel: "Permata", label: "PermataBank" },
]

export const ACTIVE_EWALLET_CHANNELS: EWalletChannelOption[] = [
  { code: "OVO", label: "OVO", requiresMobileNumber: true },
]

const ACTIVE_VA_CHANNEL_CODE_SET = new Set(ACTIVE_VA_CHANNELS.map((channel) => channel.code))

export function getDefaultVisibleVAChannels(): string[] {
  return ACTIVE_VA_CHANNELS.map((channel) => channel.code)
}

export function isKnownVAChannel(code: string): boolean {
  return ACTIVE_VA_CHANNEL_CODE_SET.has(code)
}

export function getVisibleVAChannels(visibleCodes: readonly string[]): VAChannelOption[] {
  const visibleSet = new Set(visibleCodes.filter((code) => isKnownVAChannel(code)))
  return ACTIVE_VA_CHANNELS.filter((channel) => visibleSet.has(channel.code))
}
