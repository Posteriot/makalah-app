import type { WorkflowAction } from "../json-render/choice-payload"

// ---------------------------------------------------------------------------
// False draft handoff patterns (for continue_discussion)
// ---------------------------------------------------------------------------

const FALSE_DRAFT_HANDOFF_PATTERNS = [
  /berikut(?:\s+(?:adalah|ini))?\s+draf/i,
  /draf\s+yang\s+akan\s+(?:kita\s+)?(?:ajukan|kirim|submit)/i,
  /silakan\s+review\s+di\s+panel/i,
  /sudah\s+(?:siap|selesai)\s+di\s+panel\s+(?:validasi|artifact)/i,
  /artefak(?:nya)?\s+sudah\s+(?:siap|dibuat|diperbarui)/i,
  /panel\s+validasi/i,
]

// ---------------------------------------------------------------------------
// Recovery leakage patterns (for finalize paths)
// Already exists in route.ts — we centralize it here
// ---------------------------------------------------------------------------

const RECOVERY_LEAKAGE_PATTERNS =
  /kesalahan teknis|kendala teknis|masalah teknis|maafkan aku|saya akan coba|memperbaiki|perbaiki|mohon tunggu|coba lagi|ada kendala|akan mencoba/i

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OutcomeViolationType =
  | "false_draft_handoff"
  | "recovery_leakage"
  | "none"

export interface SanitizeChoiceOutcomeInput {
  action: WorkflowAction
  text: string
  hasArtifactSuccess: boolean
  submittedForValidation: boolean
}

export interface SanitizeChoiceOutcomeResult {
  text: string
  wasModified: boolean
  violationType: OutcomeViolationType
}

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

export function sanitizeChoiceOutcome(
  input: SanitizeChoiceOutcomeInput,
): SanitizeChoiceOutcomeResult {
  const normalized = input.text.replace(/\n{3,}/g, "\n\n").trim()

  // Case 1: continue_discussion — strip false draft handoff phrasing
  if (input.action === "continue_discussion") {
    return sanitizeFalseDraftHandoff(normalized)
  }

  // Case 2: finalize actions — strip recovery leakage (only when artifact succeeded)
  if (input.hasArtifactSuccess && RECOVERY_LEAKAGE_PATTERNS.test(normalized)) {
    return sanitizeRecoveryLeakage(normalized, input.submittedForValidation)
  }

  // No violation
  return { text: input.text, wasModified: false, violationType: "none" }
}

// ---------------------------------------------------------------------------
// Case 1: False draft handoff
// ---------------------------------------------------------------------------

function sanitizeFalseDraftHandoff(
  text: string,
): SanitizeChoiceOutcomeResult {
  if (text.length === 0) {
    return { text, wasModified: false, violationType: "none" }
  }

  const hasFalseHandoff = FALSE_DRAFT_HANDOFF_PATTERNS.some((p) => p.test(text))
  if (!hasFalseHandoff) {
    return { text, wasModified: false, violationType: "none" }
  }

  // Split into paragraphs, remove ones with false handoff
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  const kept = paragraphs.filter(
    (p) => !FALSE_DRAFT_HANDOFF_PATTERNS.some((pat) => pat.test(p)),
  )

  const sanitized = kept.join("\n\n").trim()
  if (sanitized.length === 0) {
    // Everything was handoff phrasing — return empty (route will handle)
    return { text: "", wasModified: true, violationType: "false_draft_handoff" }
  }

  return { text: sanitized, wasModified: true, violationType: "false_draft_handoff" }
}

// ---------------------------------------------------------------------------
// Case 2: Recovery leakage (migrated from route.ts sanitizeOutcomeGatedText)
// ---------------------------------------------------------------------------

function buildArtifactLifecycleClosing(
  submittedForValidation: boolean,
): string {
  return submittedForValidation
    ? "Artefaknya sudah siap. Silakan review di panel validasi."
    : "Artefaknya sudah siap, tetapi belum dikirim ke panel validasi."
}

function sanitizeRecoveryLeakage(
  text: string,
  submittedForValidation: boolean,
): SanitizeChoiceOutcomeResult {
  if (text.length === 0) {
    return {
      text: buildArtifactLifecycleClosing(submittedForValidation),
      wasModified: true,
      violationType: "recovery_leakage",
    }
  }

  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  const kept = paragraphs.filter((p) => !RECOVERY_LEAKAGE_PATTERNS.test(p))

  let sanitizedBody = kept.join("\n\n").trim()

  if (sanitizedBody.length === 0) {
    const match = RECOVERY_LEAKAGE_PATTERNS.exec(text)
    if (match && typeof match.index === "number") {
      sanitizedBody = text
        .slice(0, match.index)
        .trim()
        .replace(/[,:;\-\s]+$/, "")
        .trim()
    }
  }

  const closing = buildArtifactLifecycleClosing(submittedForValidation)
  if (sanitizedBody.length === 0) {
    return { text: closing, wasModified: true, violationType: "recovery_leakage" }
  }

  if (/panel validasi|artefak|artifact/i.test(sanitizedBody)) {
    return { text: sanitizedBody, wasModified: true, violationType: "recovery_leakage" }
  }

  return {
    text: `${sanitizedBody}\n\n${closing}`,
    wasModified: true,
    violationType: "recovery_leakage",
  }
}

// Export patterns for route.ts backward compat (real-time leakage detection in text-delta accumulator)
export { RECOVERY_LEAKAGE_PATTERNS as paperRecoveryLeakagePattern }
