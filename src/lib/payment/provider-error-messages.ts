import type { CheckoutPaymentMethod } from "./runtime-settings"

const QRIS_ACTIVATION_ERROR = "has not been activated"

export function mapPaymentCreationErrorMessage(
  paymentMethod: CheckoutPaymentMethod,
  message: string
): string {
  if (message.toLowerCase().includes(QRIS_ACTIVATION_ERROR)) {
    if (paymentMethod === "qris") {
      return "QRIS belum tersedia. Sistem pembayaran QRIS masih dalam proses aktivasi."
    }

    if (paymentMethod === "ewallet") {
      return "OVO belum tersedia. Sistem pembayaran OVO masih dalam proses aktivasi."
    }
  }

  return message
}
