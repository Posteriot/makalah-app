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
