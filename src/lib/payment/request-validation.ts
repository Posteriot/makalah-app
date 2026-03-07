import {
  type EnabledPaymentMethod,
  isPaymentMethodEnabled,
  type CheckoutPaymentMethod,
} from "./runtime-settings"

export function assertEnabledPaymentMethod(
  method: CheckoutPaymentMethod,
  enabledMethods: readonly EnabledPaymentMethod[]
): void {
  if (!isPaymentMethodEnabled(method, enabledMethods)) {
    throw new Error("Metode pembayaran tidak tersedia")
  }
}
