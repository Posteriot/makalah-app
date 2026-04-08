/**
 * ST-2.3: Parity Test — Completed Session Classifier
 *
 * This test suite defines representative inputs and runs the REGEX path on each,
 * documenting expected behavior and known regex limitations.
 *
 * The parity matrix serves as:
 * 1. Regression baseline: every case must continue to work after classifier promotion
 * 2. Known-gap documentation: cases where regex gives wrong/suboptimal results
 * 3. Acceptance criteria: classifier must match or beat regex on ALL cases
 *
 * Cases are organized by category:
 * - AGREE: regex gives correct answer, classifier must match
 * - REGEX_WRONG: regex gives wrong answer, classifier should improve
 * - EDGE: ambiguous cases where either answer could be acceptable
 */
import { describe, expect, it } from "vitest"

import {
    resolveCompletedSessionHandling,
    resolveRecallTargetStage,
} from "../completed-session"
import type { CompletedSessionHandling } from "../completed-session"

interface ParityCase {
    input: string
    routerIntent?: string
    routerReason?: string
    hasChoiceInteractionEvent?: boolean
    expectedHandling: CompletedSessionHandling | "clarify"
    expectedTargetStage?: string | null
    category: "AGREE" | "REGEX_WRONG" | "EDGE"
    note: string
}

// ============================================================================
// PARITY MATRIX: 40 representative inputs
// ============================================================================

const PARITY_CASES: ParityCase[] = [
    // ── CATEGORY: AGREE — regex correct, classifier must match ──

    // Continuation / closing (regex: short_circuit_closing ✓)
    { input: "ok", expectedHandling: "short_circuit_closing", category: "AGREE", note: "minimal confirmation" },
    { input: "lanjut", expectedHandling: "short_circuit_closing", category: "AGREE", note: "continue signal" },
    { input: "gas", expectedHandling: "short_circuit_closing", category: "AGREE", note: "slang confirmation" },
    { input: "sip", expectedHandling: "short_circuit_closing", category: "AGREE", note: "slang confirmation" },
    { input: "mantap", expectedHandling: "short_circuit_closing", category: "AGREE", note: "slang confirmation" },
    { input: "", expectedHandling: "short_circuit_closing", category: "AGREE", note: "empty message" },
    { input: "   ", expectedHandling: "short_circuit_closing", category: "AGREE", note: "whitespace only" },

    // Revision intent (regex: allow_normal_ai ✓)
    { input: "revisi abstrak", expectedHandling: "allow_normal_ai", category: "AGREE", note: "explicit revision verb" },
    { input: "tolong ubah judul", expectedHandling: "allow_normal_ai", category: "AGREE", note: "explicit revision verb" },
    { input: "koreksi bagian pendahuluan", expectedHandling: "allow_normal_ai", category: "AGREE", note: "explicit revision verb" },
    { input: "edit outline saya", expectedHandling: "allow_normal_ai", category: "AGREE", note: "english revision verb" },

    // Informational (regex: allow_normal_ai ✓)
    { input: "bagaimana cara export?", expectedHandling: "allow_normal_ai", category: "AGREE", note: "informational question" },
    { input: "di mana daftar pustaka?", expectedHandling: "allow_normal_ai", category: "AGREE", note: "informational question" },
    { input: "apakah bisa download PDF?", expectedHandling: "allow_normal_ai", category: "AGREE", note: "informational question" },

    // Artifact recall with explicit verb + target (regex: server_owned_artifact_recall ✓)
    { input: "lihat abstrak", expectedHandling: "server_owned_artifact_recall", expectedTargetStage: "abstrak", category: "AGREE", note: "display verb + stage name" },
    { input: "tampilkan outline", expectedHandling: "server_owned_artifact_recall", expectedTargetStage: "outline", category: "AGREE", note: "display verb + stage name" },
    { input: "buka hasil", expectedHandling: "server_owned_artifact_recall", expectedTargetStage: "hasil", category: "AGREE", note: "display verb + stage name" },
    { input: "tampilkan tinjauan literatur", expectedHandling: "server_owned_artifact_recall", expectedTargetStage: "tinjauan_literatur", category: "AGREE", note: "compound stage name" },
    { input: "lihat daftar pustaka", expectedHandling: "server_owned_artifact_recall", expectedTargetStage: "daftar_pustaka", category: "AGREE", note: "compound stage name" },

    // Question-form exclusion (regex: allow_normal_ai ✓ via informational or default)
    { input: "apa isi artifact judul?", expectedHandling: "allow_normal_ai", category: "AGREE", note: "question word blocks recall", routerIntent: "discussion" },
    { input: "di mana lihat semua artifact?", expectedHandling: "allow_normal_ai", category: "AGREE", note: "question word blocks recall", routerIntent: "discussion" },

    // Router intent: discussion + recall (regex: server_owned_artifact_recall ✓)
    { input: "lihat artifact judul", routerIntent: "discussion", expectedHandling: "server_owned_artifact_recall", expectedTargetStage: "judul", category: "AGREE", note: "discussion + recall" },

    // Router intent: deterministic (not dual-write relevant but included for completeness)
    { input: "simpan", routerIntent: "save_submit", expectedHandling: "short_circuit_closing", category: "AGREE", note: "deterministic save" },
    { input: "cari referensi baru", routerIntent: "search", expectedHandling: "allow_normal_ai", category: "AGREE", note: "deterministic search" },

    // ── CATEGORY: REGEX_WRONG — regex gives suboptimal answer ──

    // Implicit revision without explicit verb (regex: short_circuit_closing ✗)
    { input: "buat yang lebih baik", expectedHandling: "allow_normal_ai", category: "REGEX_WRONG", note: "implicit revision — no verb in REVISION_VERB_PATTERN, regex defaults to short_circuit" },
    // NOTE: "perbaiki" IS in REVISION_VERB_PATTERN — regex correctly matches. Moved to AGREE.
    { input: "saya mau perbaiki approach di metodologi", expectedHandling: "allow_normal_ai", category: "AGREE", note: "'perbaiki' in REVISION_VERB_PATTERN — regex correct" },
    { input: "coba tulis ulang dengan gaya berbeda", expectedHandling: "allow_normal_ai", category: "REGEX_WRONG", note: "implicit revision — regex defaults to short_circuit because no single revision verb word boundary match" },

    // Artifact recall without display verb (regex: short_circuit_closing ✗)
    { input: "mana abstrak saya?", expectedHandling: "allow_normal_ai", category: "REGEX_WRONG", note: "'mana' not in RECALL_DISPLAY_VERB, question form → regex defaults to short_circuit" },
    // NOTE: "kasih lihat outline" — originally thought REGEX_WRONG, but regex matches \blihat\b within
    // "kasih lihat". Moved to AGREE.
    { input: "kasih lihat outline", expectedHandling: "server_owned_artifact_recall", expectedTargetStage: "outline", category: "AGREE", note: "regex matches \\blihat\\b within 'kasih lihat'" },

    // Default bucket catches valid input (regex: short_circuit_closing ✗)
    { input: "ada yang salah di bagian diskusi", expectedHandling: "allow_normal_ai", category: "REGEX_WRONG", note: "complaint about content quality — should allow AI, regex short-circuits" },
    { input: "kok hasilnya gitu ya", expectedHandling: "allow_normal_ai", category: "REGEX_WRONG", note: "dissatisfaction — should allow AI, regex short-circuits" },

    // ── CATEGORY: EDGE — ambiguous, either answer acceptable ──

    { input: "yang tadi", expectedHandling: "clarify", category: "EDGE", note: "ambiguous reference — could be recall or continuation. regex: short_circuit. ideal: clarify" },
    { input: "itu", expectedHandling: "clarify", category: "EDGE", note: "bare pronoun — ambiguous. regex: short_circuit. ideal: clarify" },
    { input: "hmm", expectedHandling: "clarify", category: "EDGE", note: "thinking token — regex: short_circuit. classifier could clarify or close" },
    { input: "judul", expectedHandling: "clarify", category: "EDGE", note: "bare stage name — recall or info? regex: short_circuit. ideal: clarify" },
    { input: "terus gimana?", expectedHandling: "clarify", category: "EDGE", note: "open-ended — regex: short_circuit. ideal: clarify or allow_normal_ai" },
    { input: "abstrak", expectedHandling: "clarify", category: "EDGE", note: "bare stage name — recall or info? regex: short_circuit. ideal: clarify" },
    { input: "boleh lihat yang barusan?", expectedHandling: "clarify", category: "EDGE", note: "anaphoric — no clear stage target. regex: short_circuit. ideal: clarify" },
]

// ============================================================================
// PARITY TEST EXECUTION
// ============================================================================

describe("ST-2.3: Completed Session Parity Matrix", () => {
    describe("AGREE cases — regex is correct, classifier must match", () => {
        const agreeCases = PARITY_CASES.filter((c) => c.category === "AGREE")

        for (const tc of agreeCases) {
            it(`"${tc.input}" → ${tc.expectedHandling} (${tc.note})`, () => {
                const result = resolveCompletedSessionHandling({
                    lastUserContent: tc.input,
                    routerIntent: tc.routerIntent,
                    routerReason: tc.routerReason,
                    hasChoiceInteractionEvent: tc.hasChoiceInteractionEvent,
                })

                expect(result.handling).toBe(tc.expectedHandling)

                // Verify targetStage for recall cases
                if (tc.expectedTargetStage !== undefined) {
                    const stage = resolveRecallTargetStage(tc.input)
                    expect(stage).toBe(tc.expectedTargetStage)
                }
            })
        }
    })

    describe("REGEX_WRONG cases — regex gives suboptimal answer, classifier should improve", () => {
        const wrongCases = PARITY_CASES.filter((c) => c.category === "REGEX_WRONG")

        for (const tc of wrongCases) {
            it(`"${tc.input}" → regex gives WRONG answer, expected ${tc.expectedHandling} (${tc.note})`, () => {
                const result = resolveCompletedSessionHandling({
                    lastUserContent: tc.input,
                    routerIntent: tc.routerIntent,
                    routerReason: tc.routerReason,
                })

                // Document what regex actually returns (wrong answer)
                // These assertions verify regex behavior hasn't changed,
                // NOT that it's correct
                // All REGEX_WRONG cases: regex returns short_circuit_closing
                expect(result.handling).toBe("short_circuit_closing")
            })
        }
    })

    describe("EDGE cases — ambiguous, classifier should ideally clarify", () => {
        const edgeCases = PARITY_CASES.filter((c) => c.category === "EDGE")

        for (const tc of edgeCases) {
            it(`"${tc.input}" → ambiguous (${tc.note})`, () => {
                const result = resolveCompletedSessionHandling({
                    lastUserContent: tc.input,
                })

                // Document: regex always returns short_circuit_closing for edge cases
                // Classifier should return "clarify" for these
                expect(result.handling).toBe("short_circuit_closing")
            })
        }
    })
})

// ============================================================================
// PARITY SUMMARY (for review gate report)
// ============================================================================

describe("Parity Summary Statistics", () => {
    it("documents parity breakdown", () => {
        const agree = PARITY_CASES.filter((c) => c.category === "AGREE").length
        const regexWrong = PARITY_CASES.filter((c) => c.category === "REGEX_WRONG").length
        const edge = PARITY_CASES.filter((c) => c.category === "EDGE").length
        const total = PARITY_CASES.length

        console.info("\n========== PARITY SUMMARY ==========")
        console.info(`Total cases: ${total}`)
        console.info(`AGREE (regex correct): ${agree} (${Math.round(agree / total * 100)}%)`)
        console.info(`REGEX_WRONG (classifier should improve): ${regexWrong} (${Math.round(regexWrong / total * 100)}%)`)
        console.info(`EDGE (ambiguous, clarify preferred): ${edge} (${Math.round(edge / total * 100)}%)`)
        console.info(`Regex accuracy on non-edge: ${agree}/${agree + regexWrong} = ${Math.round(agree / (agree + regexWrong) * 100)}%`)
        console.info("====================================\n")

        expect(total).toBeGreaterThanOrEqual(30)
    })
})
