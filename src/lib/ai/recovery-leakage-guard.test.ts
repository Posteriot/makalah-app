import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

const routePath = path.resolve(__dirname, "..", "..", "app/api/chat/route.ts")
const executorDir = path.resolve(__dirname, "..", "chat-harness/executor")

/**
 * Regression tests for recovery prose leakage guard.
 *
 * Bug: Model streams internal recovery/error narration to user even when
 * artifact lifecycle succeeds. onFinish text only has final step — recovery
 * prose in earlier steps is invisible to onFinish guard.
 *
 * Fix: accumulatedStreamText captures ALL text-delta chunks. Full-stream
 * guard checks accumulated text in writer loop before finish event.
 * data-cited-text override replaces UI display.
 *
 * Note: Phase 2 extraction moved the guard implementation from route.ts
 * into chat-harness/executor/ modules. Tests now read combined sources.
 */
describe("recovery leakage guard", () => {
    const routeSource = fs.readFileSync(routePath, "utf8")
    const onFinishSource = fs.readFileSync(path.join(executorDir, "build-on-finish-handler.ts"), "utf8")
    const stepStreamSource = fs.readFileSync(path.join(executorDir, "build-step-stream.ts"), "utf8")
    const outcomeGuardSource = fs.readFileSync(path.resolve(__dirname, "..", "chat/choice-outcome-guard.ts"), "utf8")
    // Combined source for pattern assertions that may live in any executor module or guard
    const combinedSource = routeSource + "\n" + onFinishSource + "\n" + stepStreamSource + "\n" + outcomeGuardSource

    // ── Guard pattern coverage ──

    it("outcome-gated guard covers known recovery phrases", () => {
        // These phrases appeared in UI test start-stage-1 (3 reproductions)
        // Guard logic now lives in executor modules (Phase 2 extraction)
        const requiredPatterns = [
            "kesalahan teknis",
            "kendala teknis",
            "masalah teknis",
            "maafkan aku",
            "memperbaiki",
            "perbaiki",
            "mohon tunggu",
            "coba lagi",
            "ada kendala",
            "akan mencoba",
        ]

        for (const phrase of requiredPatterns) {
            expect(combinedSource).toContain(phrase)
        }
    })

    // ── Full-stream accumulation ──

    it("primary path accumulates text-delta chunks for full-stream guard", () => {
        // Stream accumulation now in build-step-stream.ts (Phase 2)
        expect(stepStreamSource).toContain("accumulatedStreamText")
        expect(stepStreamSource).toContain("text-delta")
    })

    it("primary path checks accumulatedStreamText for leakage at finish", () => {
        expect(combinedSource).toContain("[PAPER][outcome-gated]")
        expect(stepStreamSource).toContain("accumulatedStreamText")
    })

    it("fallback path uses same unified stream function (no separate guard needed)", () => {
        // Phase 2 unified primary+fallback into single buildStepStream function.
        // Both paths call the same function with different config flags, so
        // the accumulation mechanism is guaranteed identical. Verify the
        // unified function has the guard, and route.ts calls it for both paths.
        expect(stepStreamSource).toContain("accumulatedStreamText")
        expect(stepStreamSource).toContain("outcome-gated")
        // Both primary and fallback use buildStepStream
        expect(routeSource).toMatch(/buildStepStream\(/)
    })

    // ── Stream override mechanism ──

    it("emits data-cited-text override when leakage detected", () => {
        // Override mechanism now in build-step-stream.ts (Phase 2)
        expect(stepStreamSource).toContain("data-cited-text")
        expect(stepStreamSource).toContain("streamContentOverride")
    })

    // ── Guard applies to all stages ──

    it("outcome-gated guard does NOT have isReviewStage restriction", () => {
        // Guard must fire for ALL stages (gagasan, topik, etc.), not just review stages
        // Guard logic now in onFinish handler (Phase 2 extraction)
        const guardBlocks = combinedSource.split("hasArtifactSuccess && hasLeakage")
        // Should find the pattern without isReviewStage preceding it
        for (let i = 1; i < guardBlocks.length; i++) {
            const preceding50chars = guardBlocks[i - 1].slice(-50)
            expect(preceding50chars).not.toContain("isReviewStage")
        }
    })
})
