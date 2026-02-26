/**
 * Server-side sanitizer for model reasoning text.
 * Strips sensitive content and markdown formatting before forwarding to client.
 */

const SENSITIVE_PATTERNS = [
  /system\s*prompt/gi,
  /instruksi\s*(internal|sistem)/gi,
  /CLAUDE\.md/gi,
  /\b[A-Za-z0-9_-]{20,}(?:key|token|secret|api)[A-Za-z0-9_-]{0,10}\b/gi,
  /\b(sk|pk|api|key|token|secret)[-_][A-Za-z0-9]{16,}\b/g,
  /```[\s\S]*?```/g,
  /\{[\s\S]{100,}\}/g,
]

export function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .trim()
}

export function sanitizeReasoningDelta(delta: string): string {
  if (!delta) return delta

  let sanitized = delta
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "")
  }

  return stripMarkdown(sanitized).slice(0, 500)
}

export function sanitizeStepThought(thought: string): string {
  if (!thought) return thought

  let sanitized = thought
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "")
  }

  const clean = stripMarkdown(sanitized).trim()
  return clean.length > 600 ? clean.slice(0, 597) + "..." : clean
}
