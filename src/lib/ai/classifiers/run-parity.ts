/**
 * ST-2.3: Real Classifier Parity Runner
 *
 * Runs the actual semantic classifier against the parity matrix
 * and compares results with regex baseline.
 *
 * Usage: npx tsx src/lib/ai/classifiers/run-parity.ts
 * Requires: .env.local with AI_GATEWAY_API_KEY
 */
import "dotenv/config"

import { createGateway } from "@ai-sdk/gateway"

import {
    resolveCompletedSessionHandling,
    resolveRecallTargetStage,
} from "../completed-session"
import { classifyCompletedSessionIntent } from "./completed-session-classifier"

// Ensure gateway API key is set
if (!process.env.AI_GATEWAY_API_KEY && process.env.VERCEL_AI_GATEWAY_API_KEY) {
    process.env.AI_GATEWAY_API_KEY = process.env.VERCEL_AI_GATEWAY_API_KEY
}

const gateway = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY! })
const model = gateway("anthropic/claude-sonnet-4.5")

interface ParityCase {
    input: string
    routerIntent?: string
    routerReason?: string
    hasChoiceInteractionEvent?: boolean
    expectedHandling: string
    expectedTargetStage?: string | null
    category: "AGREE" | "REGEX_WRONG" | "EDGE"
    note: string
}

const PARITY_CASES: ParityCase[] = [
    // AGREE
    { input: "ok", expectedHandling: "short_circuit_closing", category: "AGREE", note: "minimal confirmation" },
    { input: "lanjut", expectedHandling: "short_circuit_closing", category: "AGREE", note: "continue signal" },
    { input: "gas", expectedHandling: "short_circuit_closing", category: "AGREE", note: "slang confirmation" },
    { input: "sip", expectedHandling: "short_circuit_closing", category: "AGREE", note: "slang confirmation" },
    { input: "mantap", expectedHandling: "short_circuit_closing", category: "AGREE", note: "slang confirmation" },
    { input: "", expectedHandling: "short_circuit_closing", category: "AGREE", note: "empty message" },
    { input: "revisi abstrak", expectedHandling: "allow_normal_ai", category: "AGREE", note: "explicit revision verb" },
    { input: "tolong ubah judul", expectedHandling: "allow_normal_ai", category: "AGREE", note: "explicit revision verb" },
    { input: "koreksi bagian pendahuluan", expectedHandling: "allow_normal_ai", category: "AGREE", note: "explicit revision verb" },
    { input: "edit outline saya", expectedHandling: "allow_normal_ai", category: "AGREE", note: "english revision verb" },
    { input: "saya mau perbaiki approach di metodologi", expectedHandling: "allow_normal_ai", category: "AGREE", note: "perbaiki in pattern" },
    { input: "bagaimana cara export?", expectedHandling: "allow_normal_ai", category: "AGREE", note: "informational question" },
    { input: "di mana daftar pustaka?", expectedHandling: "allow_normal_ai", category: "AGREE", note: "informational question" },
    { input: "apakah bisa download PDF?", expectedHandling: "allow_normal_ai", category: "AGREE", note: "informational question" },
    { input: "lihat abstrak", expectedHandling: "server_owned_artifact_recall", expectedTargetStage: "abstrak", category: "AGREE", note: "display verb + stage" },
    { input: "tampilkan outline", expectedHandling: "server_owned_artifact_recall", expectedTargetStage: "outline", category: "AGREE", note: "display verb + stage" },
    { input: "buka hasil", expectedHandling: "server_owned_artifact_recall", expectedTargetStage: "hasil", category: "AGREE", note: "display verb + stage" },
    { input: "tampilkan tinjauan literatur", expectedHandling: "server_owned_artifact_recall", expectedTargetStage: "tinjauan_literatur", category: "AGREE", note: "compound stage" },
    { input: "lihat daftar pustaka", expectedHandling: "server_owned_artifact_recall", expectedTargetStage: "daftar_pustaka", category: "AGREE", note: "compound stage" },
    { input: "kasih lihat outline", expectedHandling: "server_owned_artifact_recall", expectedTargetStage: "outline", category: "AGREE", note: "lihat matches within" },
    { input: "lihat artifact judul", expectedHandling: "server_owned_artifact_recall", expectedTargetStage: "judul", category: "AGREE", note: "discussion recall", routerIntent: "discussion" },
    { input: "simpan", expectedHandling: "short_circuit_closing", category: "AGREE", note: "deterministic save", routerIntent: "save_submit" },
    { input: "cari referensi baru", expectedHandling: "allow_normal_ai", category: "AGREE", note: "deterministic search", routerIntent: "search" },

    // REGEX_WRONG
    { input: "buat yang lebih baik", expectedHandling: "allow_normal_ai", category: "REGEX_WRONG", note: "implicit revision no verb" },
    { input: "coba tulis ulang dengan gaya berbeda", expectedHandling: "allow_normal_ai", category: "REGEX_WRONG", note: "tulis ulang not matched" },
    { input: "mana abstrak saya?", expectedHandling: "allow_normal_ai", category: "REGEX_WRONG", note: "mana not display verb" },
    { input: "ada yang salah di bagian diskusi", expectedHandling: "allow_normal_ai", category: "REGEX_WRONG", note: "dissatisfaction" },
    { input: "kok hasilnya gitu ya", expectedHandling: "allow_normal_ai", category: "REGEX_WRONG", note: "complaint" },

    // EDGE
    { input: "yang tadi", expectedHandling: "clarify", category: "EDGE", note: "ambiguous reference" },
    { input: "itu", expectedHandling: "clarify", category: "EDGE", note: "bare pronoun" },
    { input: "hmm", expectedHandling: "clarify", category: "EDGE", note: "thinking token" },
    { input: "judul", expectedHandling: "clarify", category: "EDGE", note: "bare stage name" },
    { input: "terus gimana?", expectedHandling: "clarify", category: "EDGE", note: "open-ended" },
    { input: "abstrak", expectedHandling: "clarify", category: "EDGE", note: "bare stage name" },
    { input: "boleh lihat yang barusan?", expectedHandling: "clarify", category: "EDGE", note: "anaphoric reference" },
]

async function runParity() {
    console.info("\n" + "=".repeat(80))
    console.info("ST-2.3: CLASSIFIER PARITY REPORT — Real Model Results")
    console.info("=".repeat(80))
    console.info(`Model: anthropic/claude-sonnet-4.5 via AI Gateway`)
    console.info(`Cases: ${PARITY_CASES.length}`)
    console.info(`Date: ${new Date().toISOString()}\n`)

    const results: Array<{
        input: string
        category: string
        expectedHandling: string
        regexHandling: string
        regexTargetStage: string | null
        classifierHandling: string | null
        classifierTargetStage: string | null
        classifierNeedsClarification: boolean | null
        classifierConfidence: number | null
        classifierIntent: string | null
        verdict: "match" | "classifier_better" | "classifier_worse" | "equivalent" | "classifier_error"
    }> = []

    for (const tc of PARITY_CASES) {
        // Skip deterministic router cases — classifier doesn't run on these
        if (tc.routerIntent && tc.routerIntent !== "discussion") {
            console.info(`SKIP  "${tc.input}" (deterministic router: ${tc.routerIntent})`)
            continue
        }

        // Get regex result
        const regexResult = resolveCompletedSessionHandling({
            lastUserContent: tc.input,
            routerIntent: tc.routerIntent,
            routerReason: tc.routerReason,
            hasChoiceInteractionEvent: tc.hasChoiceInteractionEvent,
        })
        const regexTargetStage = regexResult.handling === "server_owned_artifact_recall"
            ? resolveRecallTargetStage(tc.input)
            : null

        // Get classifier result (real LLM call)
        let classifierHandling: string | null = null
        let classifierTargetStage: string | null = null
        let classifierNeedsClarification: boolean | null = null
        let classifierConfidence: number | null = null
        let classifierIntent: string | null = null

        try {
            const classifierResult = await classifyCompletedSessionIntent({
                lastUserContent: tc.input,
                routerReason: tc.routerReason,
                model,
            })

            if (classifierResult) {
                classifierHandling = classifierResult.output.handling
                classifierTargetStage = classifierResult.output.targetStage
                classifierNeedsClarification = classifierResult.output.needsClarification
                classifierConfidence = classifierResult.output.confidence
                classifierIntent = classifierResult.output.intent
            }
        } catch (err) {
            console.error(`  ERROR on "${tc.input}": ${err}`)
        }

        // Determine verdict
        let verdict: typeof results[0]["verdict"]
        if (classifierHandling === null) {
            verdict = "classifier_error"
        } else if (classifierHandling === tc.expectedHandling && regexResult.handling === tc.expectedHandling) {
            verdict = "match"
        } else if (classifierHandling === tc.expectedHandling && regexResult.handling !== tc.expectedHandling) {
            verdict = "classifier_better"
        } else if (classifierHandling !== tc.expectedHandling && regexResult.handling === tc.expectedHandling) {
            verdict = "classifier_worse"
        } else {
            // Both wrong or both gave non-expected but equivalent answers
            verdict = "equivalent"
        }

        results.push({
            input: tc.input,
            category: tc.category,
            expectedHandling: tc.expectedHandling,
            regexHandling: regexResult.handling,
            regexTargetStage,
            classifierHandling,
            classifierTargetStage,
            classifierNeedsClarification,
            classifierConfidence,
            classifierIntent,
            verdict,
        })

        const icon = verdict === "match" ? "✓" : verdict === "classifier_better" ? "↑" : verdict === "classifier_worse" ? "✗" : verdict === "classifier_error" ? "!" : "~"
        console.info(
            `${icon} "${tc.input.slice(0, 40).padEnd(40)}" regex=${regexResult.handling.padEnd(30)} classifier=${(classifierHandling ?? "ERROR").padEnd(30)} ` +
            `conf=${classifierConfidence?.toFixed(2) ?? "N/A"} verdict=${verdict}`
        )

        // Rate limit: small delay between calls
        await new Promise((r) => setTimeout(r, 300))
    }

    // ── Summary statistics ──
    const classified = results.filter((r) => r.verdict !== "classifier_error")
    const matches = results.filter((r) => r.verdict === "match").length
    const better = results.filter((r) => r.verdict === "classifier_better").length
    const worse = results.filter((r) => r.verdict === "classifier_worse").length
    const equivalent = results.filter((r) => r.verdict === "equivalent").length
    const errors = results.filter((r) => r.verdict === "classifier_error").length

    const agreeCases = results.filter((r) => r.category === "AGREE")
    const agreeMatch = agreeCases.filter((r) => r.verdict === "match").length
    const agreeWorse = agreeCases.filter((r) => r.verdict === "classifier_worse").length

    const regexWrongCases = results.filter((r) => r.category === "REGEX_WRONG")
    const regexWrongFixed = regexWrongCases.filter((r) => r.verdict === "classifier_better").length

    const edgeCases = results.filter((r) => r.category === "EDGE")
    const edgeClarified = edgeCases.filter((r) =>
        r.classifierHandling === "clarify" || r.classifierNeedsClarification === true
    ).length

    // targetStage mismatches
    const recallCases = results.filter((r) =>
        r.regexHandling === "server_owned_artifact_recall" || r.classifierHandling === "server_owned_artifact_recall"
    )
    const targetStageMismatches = recallCases.filter((r) =>
        r.classifierTargetStage !== r.regexTargetStage
    ).length

    console.info("\n" + "=".repeat(80))
    console.info("PARITY SUMMARY")
    console.info("=".repeat(80))
    console.info(`Total cases run: ${results.length}`)
    console.info(`  Match: ${matches}`)
    console.info(`  Classifier better: ${better}`)
    console.info(`  Classifier worse: ${worse}`)
    console.info(`  Equivalent: ${equivalent}`)
    console.info(`  Classifier error: ${errors}`)
    console.info("")
    console.info(`AGREE cases parity: ${agreeMatch}/${agreeCases.length} (${Math.round(agreeMatch / agreeCases.length * 100)}%)`)
    console.info(`AGREE cases classifier worse: ${agreeWorse}`)
    console.info(`REGEX_WRONG fixed by classifier: ${regexWrongFixed}/${regexWrongCases.length}`)
    console.info(`EDGE cases clarified: ${edgeClarified}/${edgeCases.length}`)
    console.info(`Target stage mismatches: ${targetStageMismatches}/${recallCases.length}`)
    console.info("")

    const parityRate = classified.length > 0
        ? Math.round((matches + better) / classified.length * 100)
        : 0
    console.info(`Overall parity rate (match + better): ${parityRate}%`)
    console.info(`Promotion threshold: ≥95% AND 0 classifier_worse on AGREE cases`)
    console.info(`Promotion eligible: ${parityRate >= 95 && agreeWorse === 0 ? "YES" : "NO"}`)
    console.info("=".repeat(80))

    // Output detailed results as JSON for audit
    console.info("\n--- DETAILED RESULTS (JSON) ---")
    console.info(JSON.stringify(results, null, 2))
}

runParity().catch(console.error)
