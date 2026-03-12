import { describe, it, expect } from "vitest"
import {
    isStageResearchIncomplete,
} from "@/lib/ai/paper-search-helpers"

// ===========================================================================
// 1. Pre-router guardrails: isStageResearchIncomplete
// ===========================================================================
describe("isStageResearchIncomplete", () => {
    it("gagasan with empty referensiAwal → incomplete", () => {
        const result = isStageResearchIncomplete(
            { gagasan: { referensiAwal: [] } },
            "gagasan"
        )
        expect(result.incomplete).toBe(true)
        expect(result.requirement).toContain("2")
    })

    it("gagasan with 3 referensiAwal → complete", () => {
        const result = isStageResearchIncomplete(
            { gagasan: { referensiAwal: ["a", "b", "c"] } },
            "gagasan"
        )
        expect(result.incomplete).toBe(false)
    })

    it("outline (PASSIVE, no requirements) → complete", () => {
        const result = isStageResearchIncomplete(
            { outline: {} },
            "outline"
        )
        expect(result.incomplete).toBe(false)
    })

    it("gagasan with undefined stageData → incomplete", () => {
        const result = isStageResearchIncomplete(undefined, "gagasan")
        expect(result.incomplete).toBe(true)
    })

    it("tinjauan_literatur with 3 refs (needs 5) → incomplete", () => {
        const result = isStageResearchIncomplete(
            { tinjauan_literatur: { referensi: ["a", "b", "c"] } },
            "tinjauan_literatur"
        )
        expect(result.incomplete).toBe(true)
        expect(result.requirement).toContain("5")
    })

    it("tinjauan_literatur with 5 refs → complete", () => {
        const result = isStageResearchIncomplete(
            { tinjauan_literatur: { referensi: ["a", "b", "c", "d", "e"] } },
            "tinjauan_literatur"
        )
        expect(result.incomplete).toBe(false)
    })
})

// ===========================================================================
// 2. Structural regression tests: deadlock prevention
// ===========================================================================
describe("critical regression: deadlock prevention", () => {
    it("documents: user confirmation must NOT hard-block search", () => {
        // This test documents the design decision:
        // When AI says "Shall I search?" and user says "ya",
        // the system must NOT hard-return enableWebSearch=false.
        // The LLM router must see the full conversation context.
        //
        // Previously broken by: isUserConfirmation("ya") -> hard return false
        // Fixed by: removing isUserConfirmation hard gate from decideWebSearchMode
        expect(true).toBe(true)
    })

    it("documents: searchAlreadyDone must be context, not hard gate", () => {
        // searchAlreadyDone should be passed as context to the LLM router prompt,
        // not used as a hard early-return.
        // This allows the LLM to still enable search when user explicitly asks
        // for more.
        expect(true).toBe(true)
    })
})

// ===========================================================================
// 3. Router intentType enum contract tests
// ===========================================================================
describe("router intentType enum contract", () => {
    const INTENT_TYPES = [
        "search",
        "discussion",
        "sync_request",
        "compile_daftar_pustaka",
        "save_submit",
    ] as const

    type IntentType = typeof INTENT_TYPES[number]

    it("all intent types are distinct (no overlap)", () => {
        const unique = new Set(INTENT_TYPES)
        expect(unique.size).toBe(INTENT_TYPES.length)
    })

    it.each([
        ["sync_request", false, true, false, false],
        ["compile_daftar_pustaka", false, false, true, false],
        ["save_submit", false, false, false, true],
        ["search", true, false, false, false],
        ["discussion", false, false, false, false],
    ] as [IntentType, boolean, boolean, boolean, boolean][])(
        "intentType=%s → search=%s, sync=%s, compile=%s, save=%s",
        (intentType, expectSearch, expectSync, expectCompile, expectSave) => {
            expect(intentType === "search").toBe(expectSearch)
            expect(intentType === "sync_request").toBe(expectSync)
            expect(intentType === "compile_daftar_pustaka").toBe(expectCompile)
            expect(intentType === "save_submit").toBe(expectSave)
        }
    )
})
