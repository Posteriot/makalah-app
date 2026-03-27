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

const MAX_REASONING_DELTA_CHARS = 500
const MAX_REASONING_SNAPSHOT_CHARS = 800

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

function sanitizeReasoningText(
  text: string,
  options: {
    maxChars: number
    keepTail?: boolean
  }
): string {
  if (!text) return text

  let sanitized = text
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "")
  }

  const clean = stripMarkdown(sanitized).trim()
  if (clean.length <= options.maxChars) {
    return clean
  }

  if (options.keepTail) {
    const tailChars = Math.max(0, options.maxChars - 3)
    return `...${clean.slice(-tailChars)}`
  }

  return clean.slice(0, options.maxChars)
}

export function sanitizeReasoningDelta(delta: string): string {
  return sanitizeReasoningText(delta, { maxChars: MAX_REASONING_DELTA_CHARS })
}

export function sanitizeReasoningSnapshot(reasoning: string): string {
  return sanitizeReasoningText(reasoning, {
    maxChars: MAX_REASONING_SNAPSHOT_CHARS,
    keepTail: true,
  })
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
