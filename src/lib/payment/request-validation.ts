import {
  assertEnabledMethodsConfig,
  type EnabledPaymentMethod,
  isPaymentMethodEnabled,
  type CheckoutPaymentMethod,
} from "./runtime-settings"

export type SupportedRuntimePaymentType =
  | "credit_topup"
  | "subscription_initial"
  | "subscription_renewal"

export function assertEnabledPaymentMethod(
  method: CheckoutPaymentMethod,
  enabledMethods: readonly EnabledPaymentMethod[]
): void {
  if (!isPaymentMethodEnabled(method, enabledMethods)) {
    throw new Error("Metode pembayaran tidak tersedia")
  }
}

export function assertValidEnabledMethodsConfig(
  enabledMethods: readonly EnabledPaymentMethod[]
): void {
  assertEnabledMethodsConfig(enabledMethods)
}

export function assertSupportedRuntimePaymentType(
  paymentType: string
): asserts paymentType is SupportedRuntimePaymentType {
  if (
    paymentType !== "credit_topup" &&
    paymentType !== "subscription_initial" &&
    paymentType !== "subscription_renewal"
  ) {
    throw new Error("Jenis pembayaran ini tidak didukung di runtime aktif")
  }
}
