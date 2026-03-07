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
  enabledMethods: readonly EnabledPaymentMethod[]
): CheckoutPaymentMethod[] {
  return CHECKOUT_ORDER
    .filter((item) => enabledMethods.includes(item.enabled))
    .map((item) => item.checkout)
}

export function resolveCheckoutMethodSelection(
  current: CheckoutPaymentMethod,
  enabledMethods: readonly EnabledPaymentMethod[]
): CheckoutPaymentMethod | null {
  const enabled = getEnabledCheckoutMethods(enabledMethods)
  if (enabled.includes(current)) return current
  return enabled[0] ?? null
}

export function isPaymentMethodEnabled(
  method: CheckoutPaymentMethod,
  enabledMethods: readonly EnabledPaymentMethod[]
): boolean {
  return getEnabledCheckoutMethods(enabledMethods).includes(method)
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
