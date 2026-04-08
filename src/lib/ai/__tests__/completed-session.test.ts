import { describe, expect, it, vi } from "vitest"

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

    it("allows normal AI when router intent is discussion (informational)", () => {
        const result = resolveCompletedSessionHandling({
            routerIntent: "discussion",
            lastUserContent: "di mana lihat semua artifact?",
        })
        expect(result.handling).toBe("allow_normal_ai")
        expect(result.source).toBe("router_intent")
        expect(result.reason).toBe("discussion")
    })

    it("detects artifact recall when router intent is discussion", () => {
        const result = resolveCompletedSessionHandling({
            routerIntent: "discussion",
            lastUserContent: "lihat artifact judul",
        })
        expect(result.handling).toBe("server_owned_artifact_recall")
        expect(result.source).toBe("router_intent")
        expect(result.reason).toBe("artifact_recall")
    })

    it("does not treat informational questions as recall", () => {
        const result = resolveCompletedSessionHandling({
            routerIntent: "discussion",
            lastUserContent: "apa isi artifact judul?",
        })
        expect(result.handling).toBe("allow_normal_ai")
        expect(result.source).toBe("router_intent")
        expect(result.reason).toBe("discussion")
    })

    it("does not treat revision as recall", () => {
        const result = resolveCompletedSessionHandling({
            routerIntent: "discussion",
            lastUserContent: "tolong revisi judul",
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

    // ── Router reason as secondary recall hint ──

    it("detects recall via router reason when regex misses verb but target present", () => {
        // "keluarkan" is not in RECALL_DISPLAY_VERB, but router reason recognizes intent
        const result = resolveCompletedSessionHandling({
            routerIntent: "discussion",
            routerReason: "User is asking to retrieve a previously generated artifact (title artifact)",
            lastUserContent: "keluarkan lagi artifak judul",
        })
        expect(result.handling).toBe("server_owned_artifact_recall")
        expect(result.reason).toBe("artifact_recall_from_reason")
    })

    it("does not promote to recall from reason when input is question form", () => {
        const result = resolveCompletedSessionHandling({
            routerIntent: "discussion",
            routerReason: "User is asking to re-display an existing artifact",
            lastUserContent: "apa isi artifact judul?",
        })
        expect(result.handling).toBe("allow_normal_ai")
    })

    it("does not promote to recall from reason when input has no artifact target", () => {
        const result = resolveCompletedSessionHandling({
            routerIntent: "discussion",
            routerReason: "User is asking to retrieve a previously generated artifact",
            lastUserContent: "kasih lihat yang tadi",
        })
        expect(result.handling).toBe("allow_normal_ai")
    })

    it("does not use router reason for non-discussion intents", () => {
        const result = resolveCompletedSessionHandling({
            routerIntent: "search",
            routerReason: "User is asking to re-display an existing artifact",
            lastUserContent: "lihat artifact judul",
        })
        expect(result.handling).toBe("allow_normal_ai")
        expect(result.reason).toBe("search")
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

    it("falls back to artifact recall without router", () => {
        const result = resolveCompletedSessionHandling({
            lastUserContent: "tampilkan artifact lampiran",
        })
        expect(result.handling).toBe("server_owned_artifact_recall")
        expect(result.source).toBe("fallback_heuristic")
        expect(result.reason).toBe("artifact_recall")
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

    // ── Dual-write: classifier shadow mode ──

    it("still returns regex result when dualWriteModel is provided", async () => {
        // Mock the classifier module
        const classifierModule = await import("../classifiers/completed-session-classifier")
        vi.spyOn(classifierModule, "classifyCompletedSessionIntent").mockResolvedValueOnce({
            output: {
                intent: "artifact_recall",
                handling: "server_owned_artifact_recall",
                targetStage: "abstrak",
                needsClarification: false,
                confidence: 0.9,
                reason: "classifier says recall",
            },
            metadata: { classifierVersion: "1.0.0" },
        })

        // Regex would say: short_circuit_closing (unrecognized default)
        // Classifier would say: server_owned_artifact_recall
        // Dual-write: regex wins
        const result = resolveCompletedSessionHandling({
            lastUserContent: "buka abstrak dong",
            dualWriteModel: { modelId: "test" } as import("ai").LanguageModel,
        })

        // Regex result is returned (not classifier)
        // "buka" IS in RECALL_DISPLAY_VERB, "abstrak" IS in RECALL_ARTIFACT_TARGET
        // So regex actually returns artifact_recall here too
        expect(result.handling).toBe("server_owned_artifact_recall")
        expect(result.source).toBe("fallback_heuristic")
    })

    it("returns regex result even when classifier fails", async () => {
        const classifierModule = await import("../classifiers/completed-session-classifier")
        vi.spyOn(classifierModule, "classifyCompletedSessionIntent").mockResolvedValueOnce(null)

        const result = resolveCompletedSessionHandling({
            lastUserContent: "lanjut",
            dualWriteModel: { modelId: "test" } as import("ai").LanguageModel,
        })

        // Regex still returns its result regardless of classifier failure
        expect(result.handling).toBe("short_circuit_closing")
        expect(result.source).toBe("fallback_heuristic")
    })

    it("works exactly the same without dualWriteModel (backward compatible)", () => {
        const result = resolveCompletedSessionHandling({
            lastUserContent: "revisi abstrak",
        })

        expect(result.handling).toBe("allow_normal_ai")
        expect(result.source).toBe("fallback_heuristic")
        expect(result.reason).toBe("revision_verb")
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
