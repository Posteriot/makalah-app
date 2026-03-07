import type { EWalletChannelOption, VAChannelOption } from "./types"

export const ACTIVE_VA_CHANNELS: VAChannelOption[] = [
  { code: "BJB_VIRTUAL_ACCOUNT", label: "BJB" },
  { code: "BNI_VIRTUAL_ACCOUNT", label: "BNI" },
  { code: "BRI_VIRTUAL_ACCOUNT", label: "BRI" },
  { code: "BSI_VIRTUAL_ACCOUNT", label: "BSI" },
  { code: "CIMB_VIRTUAL_ACCOUNT", label: "CIMB" },
  { code: "MANDIRI_VIRTUAL_ACCOUNT", label: "Mandiri" },
  { code: "PERMATA_VIRTUAL_ACCOUNT", label: "Permata" },
]

export const ACTIVE_EWALLET_CHANNELS: EWalletChannelOption[] = [
  { code: "OVO", label: "OVO", requiresMobileNumber: true },
]
