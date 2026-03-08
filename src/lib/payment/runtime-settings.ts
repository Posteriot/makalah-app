export type EnabledPaymentMethod = "QRIS" | "VIRTUAL_ACCOUNT" | "EWALLET"
export type CheckoutPaymentMethod = "qris" | "va" | "ewallet"
export const DEFAULT_ENABLED_METHODS: readonly EnabledPaymentMethod[] = [
  "QRIS",
  "VIRTUAL_ACCOUNT",
  "EWALLET",
]

const CHECKOUT_ORDER: Array<{
  enabled: EnabledPaymentMethod
  checkout: CheckoutPaymentMethod
}> = [
  { enabled: "QRIS", checkout: "qris" },
  { enabled: "VIRTUAL_ACCOUNT", checkout: "va" },
  { enabled: "EWALLET", checkout: "ewallet" },
]

export function getEnabledCheckoutMethods(
  enabledMethods: readonly EnabledPaymentMethod[],
  visibleVAChannels?: readonly string[]
): CheckoutPaymentMethod[] {
  const hasVisibleVAChannels = visibleVAChannels === undefined || visibleVAChannels.length > 0

  return CHECKOUT_ORDER
    .filter((item) => {
      if (item.checkout === "va" && !hasVisibleVAChannels) return false
      return enabledMethods.includes(item.enabled)
    })
    .map((item) => item.checkout)
}

export function resolveCheckoutMethodSelection(
  current: CheckoutPaymentMethod,
  enabledMethods: readonly EnabledPaymentMethod[],
  visibleVAChannels?: readonly string[]
): CheckoutPaymentMethod | null {
  const enabled = getEnabledCheckoutMethods(enabledMethods, visibleVAChannels)
  if (enabled.includes(current)) return current
  return enabled[0] ?? null
}

export function isPaymentMethodEnabled(
  method: CheckoutPaymentMethod,
  enabledMethods: readonly EnabledPaymentMethod[],
  visibleVAChannels?: readonly string[]
): boolean {
  return getEnabledCheckoutMethods(enabledMethods, visibleVAChannels).includes(method)
}

export function assertEnabledMethodsConfig(
  enabledMethods: readonly EnabledPaymentMethod[]
): void {
  if (enabledMethods.length === 0) {
    throw new Error("Minimal satu metode pembayaran harus aktif")
  }
}

export function getRuntimeProviderLabel(): "Xendit" {
  return "Xendit"
}
