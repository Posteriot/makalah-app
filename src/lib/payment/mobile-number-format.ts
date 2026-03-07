export function normalizeOvoMobileNumber(value: string): string {
  const trimmed = value.trim()

  if (trimmed.startsWith("+62")) return trimmed
  if (trimmed.startsWith("62")) return `+${trimmed}`
  if (trimmed.startsWith("08")) return `+62${trimmed.slice(1)}`

  return trimmed
}
