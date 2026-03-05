export interface InternalThoughtSplitResult {
  publicContent: string
  internalThoughtContent: string
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
