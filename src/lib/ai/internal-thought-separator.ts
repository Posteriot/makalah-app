import type {
  ReferenceInventoryItem,
  SearchResponseMode,
} from "./web-search/types"

export interface InternalThoughtSplitResult {
  publicContent: string
  internalThoughtContent: string
}

export interface UserFacingSearchPayload {
  citedText: string
  internalThoughtText: string
  responseMode: SearchResponseMode
  referenceInventory?: {
    introText: string
    items: ReferenceInventoryItem[]
  }
}

const INTERNAL_THOUGHT_PATTERNS: RegExp[] = [
  /\b(bentar|sebentar|tunggu|mohon\s+tunggu)\b/i,
  /\b(aku|saya|gue)\s+(akan|mau|ingin|coba)?\s*(cari|mencari|search|cek)\b/i,
  /\b(aku|saya|gue)\s+cari\s+dulu\b/i,
  /\b(aku|saya|gue)\s+sudah\s+melakukan\s+pencarian\b/i,
  /\bizinkan\s+(aku|saya)\s+(untuk\s+)?(mencari|search)\b/i,
  /\blet\s+me\s+(search|check)\b/i,
]

function looksLikeInternalThought(segment: string): boolean {
  if (!segment.trim()) return false
  return INTERNAL_THOUGHT_PATTERNS.some((pattern) => pattern.test(segment))
}

function stripEmptyReferenceLines(input: string): string {
  return input
    .split(/\r?\n/)
    .filter((line) => !/^\s*(link|url):\s*$/i.test(line))
    .join("\n")
    .trim()
}

function findLeadingSentenceBoundary(input: string): number {
  const text = input
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char !== "." && char !== "!" && char !== "?") continue

    const next = text[i + 1]
    if (!next) return i + 1
    if (/\s/.test(next)) return i + 1
    if (/[A-Z0-9]/.test(next)) return i + 1
  }

  const newlineBoundary = text.indexOf("\n")
  if (newlineBoundary >= 0) return newlineBoundary

  return text.length
}

/**
 * Split leading internal-thought preamble from assistant text.
 * Non-destructive for regular responses with no internal-thought pattern.
 */
export function splitInternalThought(input: string): InternalThoughtSplitResult {
  const raw = input ?? ""
  const trimmedStart = raw.trimStart()
  if (!trimmedStart) {
    return {
      publicContent: "",
      internalThoughtContent: "",
    }
  }

  let rest = trimmedStart
  const internalSegments: string[] = []

  for (let i = 0; i < 4; i += 1) {
    const boundary = findLeadingSentenceBoundary(rest)
    const candidate = rest.slice(0, boundary).trim()
    if (!candidate) break
    if (!looksLikeInternalThought(candidate)) break

    internalSegments.push(candidate)
    rest = rest.slice(boundary).trimStart()
    if (!rest) break
  }

  if (internalSegments.length === 0) {
    return {
      publicContent: trimmedStart,
      internalThoughtContent: "",
    }
  }

  return {
    publicContent: rest.trim(),
    internalThoughtContent: internalSegments.join(" ").trim(),
  }
}

/**
 * Build payload for web-search UI stream:
 * - `citedText` goes to `data-cited-text` (user-facing section)
 * - `internalThoughtText` goes to dedicated internal-thought data part
 */
export type BuildUserFacingSearchPayloadInput = {
  text: string
  responseMode: SearchResponseMode
  referenceItems?: ReferenceInventoryItem[]
}

function getReferenceInventoryIntroText(responseMode: SearchResponseMode): string {
  if (responseMode === "reference_inventory") {
    return "Berikut inventaris referensi yang ditemukan."
  }

  if (responseMode === "mixed") {
    return "Berikut inventaris referensi pendukung."
  }

  return ""
}

export function buildUserFacingSearchPayload(input: string): UserFacingSearchPayload
export function buildUserFacingSearchPayload(
  input: BuildUserFacingSearchPayloadInput,
): UserFacingSearchPayload
export function buildUserFacingSearchPayload(
  input: string | BuildUserFacingSearchPayloadInput,
): UserFacingSearchPayload {
  const normalizedInput =
    typeof input === "string"
      ? { text: input, responseMode: "synthesis" as const }
      : input

  const split = splitInternalThought(normalizedInput.text)
  const citedText = normalizedInput.responseMode === "reference_inventory"
    ? getReferenceInventoryIntroText(normalizedInput.responseMode)
    : stripEmptyReferenceLines(split.publicContent.trim())
  const internalThoughtText = split.internalThoughtContent.trim()
  const referenceItems = normalizedInput.referenceItems ?? []
  const referenceInventory =
    referenceItems.length > 0 || normalizedInput.responseMode === "reference_inventory"
      ? {
          introText: getReferenceInventoryIntroText(normalizedInput.responseMode),
          items: referenceItems,
        }
      : undefined

  return {
    citedText,
    internalThoughtText,
    responseMode: normalizedInput.responseMode,
    ...(referenceInventory ? { referenceInventory } : {}),
  }
}
