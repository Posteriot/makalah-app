import { describe, expect, it } from "vitest"

import {
    resolveCompletedSessionHandling,
    getCompletedSessionClosingMessage,
} from "../completed-session"

describe("resolveCompletedSessionHandling", () => {
    // ── Router intent cases (primary path) ──

    it("short-circuits when router intent is save_submit", () => {
        const result = resolveCompletedSessionHandling({
            routerIntent: "save_submit",
            lastUserContent: "lanjut",
        })
        expect(result.handling).toBe("short_circuit_closing")
        expect(result.source).toBe("router_intent")
        expect(result.reason).toBe("save_submit")
    })

    it("short-circuits when router intent is sync_request", () => {
        const result = resolveCompletedSessionHandling({
            routerIntent: "sync_request",
            lastUserContent: "cek status",
        })
        expect(result.handling).toBe("short_circuit_closing")
        expect(result.source).toBe("router_intent")
        expect(result.reason).toBe("sync_request")
    })

    it("allows normal AI when router intent is discussion", () => {
        const result = resolveCompletedSessionHandling({
            routerIntent: "discussion",
            lastUserContent: "di mana lihat semua artifact?",
        })
        expect(result.handling).toBe("allow_normal_ai")
        expect(result.source).toBe("router_intent")
        expect(result.reason).toBe("discussion")
    })

    it("allows normal AI when router intent is search", () => {
        const result = resolveCompletedSessionHandling({
            routerIntent: "search",
            lastUserContent: "cari referensi baru",
        })
        expect(result.handling).toBe("allow_normal_ai")
        expect(result.source).toBe("router_intent")
        expect(result.reason).toBe("search")
    })

    it("allows normal AI when router intent is compile_daftar_pustaka", () => {
        const result = resolveCompletedSessionHandling({
            routerIntent: "compile_daftar_pustaka",
            lastUserContent: "compile daftar pustaka",
        })
        expect(result.handling).toBe("allow_normal_ai")
        expect(result.source).toBe("router_intent")
    })

    it("allows normal AI for discussion even with revision-like content", () => {
        const result = resolveCompletedSessionHandling({
            routerIntent: "discussion",
            lastUserContent: "tolong revisi judul",
        })
        expect(result.handling).toBe("allow_normal_ai")
        expect(result.source).toBe("router_intent")
    })

    it("handles unknown router intent safely", () => {
        const result = resolveCompletedSessionHandling({
            routerIntent: "some_future_intent",
            lastUserContent: "something",
        })
        expect(result.handling).toBe("allow_normal_ai")
        expect(result.source).toBe("router_intent")
        expect(result.reason).toContain("unknown_router_intent")
    })

    // ── Fallback heuristic cases (no router intent) ──

    it("falls back to short-circuit for continue-like prompts without router", () => {
        const result = resolveCompletedSessionHandling({
            lastUserContent: "lanjut",
        })
        expect(result.handling).toBe("short_circuit_closing")
        expect(result.source).toBe("fallback_heuristic")
        expect(result.reason).toBe("continue_like_prompt")
    })

    it("falls back to short-circuit for empty content without router", () => {
        const result = resolveCompletedSessionHandling({
            lastUserContent: "",
        })
        expect(result.handling).toBe("short_circuit_closing")
        expect(result.source).toBe("fallback_heuristic")
        expect(result.reason).toBe("continue_like_prompt")
    })

    it("falls back to allow for informational questions without router", () => {
        const result = resolveCompletedSessionHandling({
            lastUserContent: "bagaimana export final?",
        })
        expect(result.handling).toBe("allow_normal_ai")
        expect(result.source).toBe("fallback_heuristic")
        expect(result.reason).toBe("informational_pattern")
    })

    it("falls back to allow for revision verbs without router", () => {
        const result = resolveCompletedSessionHandling({
            lastUserContent: "tolong ubah abstrak",
        })
        expect(result.handling).toBe("allow_normal_ai")
        expect(result.source).toBe("fallback_heuristic")
        expect(result.reason).toBe("revision_verb")
    })

    it("falls back to short-circuit for choice interaction events", () => {
        const result = resolveCompletedSessionHandling({
            lastUserContent: "some choice text",
            hasChoiceInteractionEvent: true,
        })
        expect(result.handling).toBe("short_circuit_closing")
        expect(result.source).toBe("fallback_heuristic")
        expect(result.reason).toBe("choice_interaction_event")
    })

    it("falls back to short-circuit for unrecognized content without router", () => {
        const result = resolveCompletedSessionHandling({
            lastUserContent: "blah blah random text",
        })
        expect(result.handling).toBe("short_circuit_closing")
        expect(result.source).toBe("fallback_heuristic")
        expect(result.reason).toBe("unrecognized_default")
    })

    // ── Edge: stage names are NOT revision signals ──

    it("does not treat bare stage names as revision verbs", () => {
        const result = resolveCompletedSessionHandling({
            lastUserContent: "judul",
        })
        expect(result.handling).toBe("short_circuit_closing")
        expect(result.source).toBe("fallback_heuristic")
    })
})

describe("getCompletedSessionClosingMessage", () => {
    it("contains the completed, sidebar, and progress guidance", () => {
        const message = getCompletedSessionClosingMessage()

        expect(message).toContain("Semua tahap penyusunan makalah sudah selesai dan disetujui.")
        expect(message).toContain("Riwayat percakapan di sidebar menyimpan artifact dari setiap tahap")
        expect(message).toContain("Linimasa progres juga sudah penuh")
        expect(message).toContain("Jika kamu ingin mengubah bagian tertentu")
    })
})
