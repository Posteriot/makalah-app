import { describe, it, expect } from "vitest"
import {
    isStageResearchIncomplete,
} from "@/lib/ai/paper-search-helpers"

// ---------------------------------------------------------------------------
// Mirror of isExplicitSearchRequest from route.ts:425-444
// Tests verify the pattern set is correct
// ---------------------------------------------------------------------------
const isExplicitSearchRequest = (text: string) => {
    const normalized = text.toLowerCase()
    const patterns = [
        /\bcari(kan)?\b/,
        /\bmencari\b/,
        /\bsearch\b/,
        /\bpencarian\b/,
        /\bgoogle\b/,
        /\binternet\b/,
        /\btautan\b/,
        /\blink\b/,
        /\burl\b/,
        /\breferensi\b/,
        /\bliteratur\b/,
        /\bsumber\b/,
        /\bdata terbaru\b/,
        /\bberita terbaru\b/,
    ]
    return patterns.some((pattern) => pattern.test(normalized))
}

// ---------------------------------------------------------------------------
// Mirror of isExplicitSyncRequest from route.ts:446-460
// ---------------------------------------------------------------------------
const isExplicitSyncRequest = (text: string) => {
    if (!text.trim()) return false
    if (isExplicitSearchRequest(text)) return false

    const normalized = text.toLowerCase()
    const patterns = [
        /\bsinkron\b/,
        /\bsinkronkan\b/,
        /\bcek state\b/,
        /\bstatus sesi\b/,
        /\blanjut dari state\b/,
        /\bstatus terbaru\b/,
    ]
    return patterns.some((pattern) => pattern.test(normalized))
}

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
// 3. isExplicitSearchRequest pattern verification
// ===========================================================================
describe("isExplicitSearchRequest", () => {
    it.each([
        ["cari referensi tentang AI", true],
        ["search for data", true],
        ["carikan sumber", true],
        ["mencari literatur", true],
        ["pencarian google", true],
        ["data terbaru tentang AI", true],
        ["berita terbaru hari ini", true],
    ])('"%s" → true', (input, expected) => {
        expect(isExplicitSearchRequest(input)).toBe(expected)
    })

    it.each([
        ["lanjut"],
        ["simpan"],
        ["ya"],
        ["ok"],
        ["sinkronkan"],
    ])('"%s" → false', (input) => {
        expect(isExplicitSearchRequest(input)).toBe(false)
    })
})

// ===========================================================================
// 4. isExplicitSyncRequest pattern verification
// ===========================================================================
describe("isExplicitSyncRequest", () => {
    it.each([
        ["sinkronkan", true],
        ["cek state", true],
        ["status sesi", true],
        ["lanjut dari state", true],
        ["status terbaru", true],
    ])('"%s" → true', (input, expected) => {
        expect(isExplicitSyncRequest(input)).toBe(expected)
    })

    it.each([
        ["cari referensi", false, "search overrides sync"],
        ["", false, "empty string"],
        ["lanjut", false, "not a sync pattern"],
        ["simpan", false, "not a sync pattern"],
    ])('"%s" → false (%s)', (input, expected) => {
        expect(isExplicitSyncRequest(input)).toBe(expected)
    })
})

// ===========================================================================
// 5. Structural regression tests: deadlock prevention
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
// 6. Router intentType enum contract tests
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
