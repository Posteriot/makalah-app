import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

const routePath = path.resolve(__dirname, "..", "..", "app/api/chat/route.ts")

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
 */
describe("recovery leakage guard", () => {
    const routeSource = fs.readFileSync(routePath, "utf8")

    // ── Guard pattern coverage ──

    it("outcome-gated guard covers known recovery phrases", () => {
        // These phrases appeared in UI test start-stage-1 (3 reproductions)
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
            expect(routeSource).toContain(phrase)
        }
    })

    // ── Full-stream accumulation ──

    it("primary path accumulates text-delta chunks for full-stream guard", () => {
        expect(routeSource).toContain("let accumulatedStreamText")
        expect(routeSource).toContain('chunk.type === "text-delta"')
        expect(routeSource).toContain("accumulatedStreamText +=")
    })

    it("primary path checks accumulatedStreamText for leakage at finish", () => {
        expect(routeSource).toContain("[PAPER][outcome-gated-stream]")
        expect(routeSource).toContain("accumulatedStreamText.length > 0")
    })

    it("fallback path also accumulates and checks full stream text", () => {
        // Both paths must have the same mechanism
        const accumulatedCount = (routeSource.match(/let accumulatedStreamText/g) || []).length
        expect(accumulatedCount).toBeGreaterThanOrEqual(2) // primary + fallback

        expect(routeSource).toContain("[PAPER][outcome-gated-stream][fallback]")
    })

    // ── Stream override mechanism ──

    it("emits data-cited-text override when leakage detected", () => {
        expect(routeSource).toContain("data-cited-text")
        expect(routeSource).toContain("streamContentOverride")
        expect(routeSource).toContain("fallbackStreamContentOverride")
    })

    // ── Guard applies to all stages ──

    it("outcome-gated guard does NOT have isReviewStage restriction", () => {
        // Guard must fire for ALL stages (gagasan, topik, etc.), not just review stages
        // Previously gated by isReviewStage which excluded early stages
        const guardBlocks = routeSource.split("hasArtifactSuccess && hasLeakage")
        // Should find the pattern without isReviewStage preceding it
        for (let i = 1; i < guardBlocks.length; i++) {
            const preceding50chars = guardBlocks[i - 1].slice(-50)
            expect(preceding50chars).not.toContain("isReviewStage")
        }
    })
})
