/**
 * Server-side sanitizer for model reasoning text.
 * Strips sensitive content before forwarding to client.
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

export function sanitizeReasoningDelta(delta: string): string {
  if (!delta) return delta

  let sanitized = delta
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "")
  }

  return sanitized.slice(0, 500)
}

export function sanitizeStepThought(thought: string): string {
  if (!thought) return thought

  let sanitized = thought
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "")
  }

  return sanitized.trim().slice(0, 200)
}
