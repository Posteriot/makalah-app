import { ACTIVE_VA_CHANNELS } from "./channel-options"

function normalizeChannelValue(value: string): string {
  return value.trim().toLowerCase()
}

export function getVAChannelOption(value?: string) {
  if (!value) return undefined

  const normalizedValue = normalizeChannelValue(value)

  return ACTIVE_VA_CHANNELS.find((channel) => {
    return (
      normalizeChannelValue(channel.code) === normalizedValue ||
      normalizeChannelValue(channel.shortLabel) === normalizedValue ||
      normalizeChannelValue(channel.label) === normalizedValue
    )
  })
}

export function getVAChannelFullLabel(value?: string): string | undefined {
  if (!value) return undefined
  return getVAChannelOption(value)?.label ?? value
}

export function getVAPaymentMethodLabel(value?: string): string {
  const fullLabel = getVAChannelFullLabel(value)
  return fullLabel ? `Virtual Account - ${fullLabel}` : "Virtual Account"
}
