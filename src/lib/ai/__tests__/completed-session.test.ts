import { describe, expect, it, vi } from "vitest"

import {
    resolveCompletedSessionHandling,
    getCompletedSessionClosingMessage,
} from "../completed-session"

// Mock the classifier
vi.mock("../classifiers/completed-session-classifier", () => ({
    classifyCompletedSessionIntent: vi.fn(),
}))

const mockModel = { modelId: "test-model" } as import("ai").LanguageModel

function mockClassifier(output: Record<string, unknown>) {
    return import("../classifiers/completed-session-classifier").then((mod) => {
        vi.mocked(mod.classifyCompletedSessionIntent).mockResolvedValueOnce({
            output: output as ReturnType<typeof mod.classifyCompletedSessionIntent> extends Promise<infer R> ? R extends { output: infer O } ? O : never : never,
            metadata: { classifierVersion: "1.0.0" },
        } as Awaited<ReturnType<typeof mod.classifyCompletedSessionIntent>>)
    })
}

function mockClassifierNull() {
    return import("../classifiers/completed-session-classifier").then((mod) => {
        vi.mocked(mod.classifyCompletedSessionIntent).mockResolvedValueOnce(null)
    })
}

describe("resolveCompletedSessionHandling", () => {
    // ── Deterministic cases (no classifier called) ──

    it("short-circuits on empty input", async () => {
        const result = await resolveCompletedSessionHandling({
            lastUserContent: "",
            model: mockModel,
        })
        expect(result.handling).toBe("short_circuit_closing")
        expect(result.source).toBe("deterministic")
        expect(result.reason).toBe("empty_input")
    })

    it("short-circuits on choice interaction event", async () => {
        const result = await resolveCompletedSessionHandling({
            lastUserContent: "some text",
            hasChoiceInteractionEvent: true,
            model: mockModel,
        })
        expect(result.handling).toBe("short_circuit_closing")
        expect(result.source).toBe("deterministic")
        expect(result.reason).toBe("choice_interaction_event")
    })

    // ── Router intent deterministic paths ──

    it("short-circuits when router intent is save_submit", async () => {
        const result = await resolveCompletedSessionHandling({
            routerIntent: "save_submit",
            lastUserContent: "lanjut",
            model: mockModel,
        })
        expect(result.handling).toBe("short_circuit_closing")
        expect(result.source).toBe("router_intent")
        expect(result.reason).toBe("save_submit")
    })

    it("short-circuits when router intent is sync_request", async () => {
        const result = await resolveCompletedSessionHandling({
            routerIntent: "sync_request",
            lastUserContent: "cek status",
            model: mockModel,
        })
        expect(result.handling).toBe("short_circuit_closing")
        expect(result.source).toBe("router_intent")
    })

    it("allows normal AI when router intent is search", async () => {
        const result = await resolveCompletedSessionHandling({
            routerIntent: "search",
            lastUserContent: "cari referensi baru",
            model: mockModel,
        })
        expect(result.handling).toBe("allow_normal_ai")
        expect(result.source).toBe("router_intent")
        expect(result.reason).toBe("search")
    })

    it("allows normal AI when router intent is compile_daftar_pustaka", async () => {
        const result = await resolveCompletedSessionHandling({
            routerIntent: "compile_daftar_pustaka",
            lastUserContent: "compile daftar pustaka",
            model: mockModel,
        })
        expect(result.handling).toBe("allow_normal_ai")
        expect(result.source).toBe("router_intent")
    })

    it("handles unknown router intent safely", async () => {
        const result = await resolveCompletedSessionHandling({
            routerIntent: "some_future_intent",
            lastUserContent: "something",
            model: mockModel,
        })
        expect(result.handling).toBe("allow_normal_ai")
        expect(result.source).toBe("router_intent")
        expect(result.reason).toContain("unknown_router_intent")
    })

    // ── Classifier path: discussion refinement ──

    it("uses classifier for discussion intent artifact recall", async () => {
        await mockClassifier({
            intent: "artifact_recall",
            handling: "server_owned_artifact_recall",
            targetStage: "judul",
            needsClarification: false,
            confidence: 0.95,
            reason: "display verb + stage name",
        })

        const result = await resolveCompletedSessionHandling({
            routerIntent: "discussion",
            lastUserContent: "lihat artifact judul",
            model: mockModel,
        })
        expect(result.handling).toBe("server_owned_artifact_recall")
        expect(result.source).toBe("classifier")
        expect(result.targetStage).toBe("judul")
    })

    it("uses classifier for discussion informational (not recall)", async () => {
        await mockClassifier({
            intent: "informational",
            handling: "allow_normal_ai",
            targetStage: null,
            needsClarification: false,
            confidence: 0.9,
            reason: "question about artifact",
        })

        const result = await resolveCompletedSessionHandling({
            routerIntent: "discussion",
            lastUserContent: "apa isi artifact judul?",
            model: mockModel,
        })
        expect(result.handling).toBe("allow_normal_ai")
        expect(result.source).toBe("classifier")
    })

    // ── Classifier path: fallback (no router intent) ──

    it("classifies continuation prompt via classifier", async () => {
        await mockClassifier({
            intent: "continuation",
            handling: "short_circuit_closing",
            targetStage: null,
            needsClarification: false,
            confidence: 0.95,
            reason: "short continuation",
        })

        const result = await resolveCompletedSessionHandling({
            lastUserContent: "lanjut",
            model: mockModel,
        })
        expect(result.handling).toBe("short_circuit_closing")
        expect(result.source).toBe("classifier")
    })

    it("classifies revision intent via classifier", async () => {
        await mockClassifier({
            intent: "revision",
            handling: "allow_normal_ai",
            targetStage: null,
            needsClarification: false,
            confidence: 0.95,
            reason: "explicit revision",
        })

        const result = await resolveCompletedSessionHandling({
            lastUserContent: "revisi abstrak",
            model: mockModel,
        })
        expect(result.handling).toBe("allow_normal_ai")
        expect(result.source).toBe("classifier")
    })

    it("classifies informational question via classifier", async () => {
        await mockClassifier({
            intent: "informational",
            handling: "allow_normal_ai",
            targetStage: null,
            needsClarification: false,
            confidence: 0.9,
            reason: "asking about export",
        })

        const result = await resolveCompletedSessionHandling({
            lastUserContent: "bagaimana cara export?",
            model: mockModel,
        })
        expect(result.handling).toBe("allow_normal_ai")
        expect(result.source).toBe("classifier")
    })

    it("classifies artifact recall via classifier", async () => {
        await mockClassifier({
            intent: "artifact_recall",
            handling: "server_owned_artifact_recall",
            targetStage: "abstrak",
            needsClarification: false,
            confidence: 0.95,
            reason: "display verb + stage",
        })

        const result = await resolveCompletedSessionHandling({
            lastUserContent: "lihat abstrak",
            model: mockModel,
        })
        expect(result.handling).toBe("server_owned_artifact_recall")
        expect(result.source).toBe("classifier")
        expect(result.targetStage).toBe("abstrak")
    })

    it("classifies ambiguous input as clarify", async () => {
        await mockClassifier({
            intent: "other",
            handling: "clarify",
            targetStage: null,
            needsClarification: true,
            confidence: 0.3,
            reason: "ambiguous",
        })

        const result = await resolveCompletedSessionHandling({
            lastUserContent: "yang tadi",
            model: mockModel,
        })
        expect(result.handling).toBe("clarify")
        expect(result.source).toBe("classifier")
    })

    // ── Classifier error fallback ──

    it("falls back to allow_normal_ai when classifier fails", async () => {
        await mockClassifierNull()

        const result = await resolveCompletedSessionHandling({
            lastUserContent: "something random",
            model: mockModel,
        })
        expect(result.handling).toBe("allow_normal_ai")
        expect(result.source).toBe("classifier")
        expect(result.reason).toBe("classifier_error_fallback")
    })

    // ── Router reason passthrough ──

    it("passes routerReason to classifier for discussion refinement", async () => {
        const classifierModule = await import("../classifiers/completed-session-classifier")
        vi.mocked(classifierModule.classifyCompletedSessionIntent).mockResolvedValueOnce({
            output: {
                intent: "artifact_recall",
                handling: "server_owned_artifact_recall",
                targetStage: "judul",
                needsClarification: false,
                confidence: 0.9,
                reason: "router reason hint",
            },
            metadata: { classifierVersion: "1.0.0" },
        } as Awaited<ReturnType<typeof classifierModule.classifyCompletedSessionIntent>>)

        await resolveCompletedSessionHandling({
            routerIntent: "discussion",
            routerReason: "User is asking to retrieve a previously generated artifact",
            lastUserContent: "keluarkan lagi artifak judul",
            model: mockModel,
        })

        expect(classifierModule.classifyCompletedSessionIntent).toHaveBeenCalledWith(
            expect.objectContaining({
                routerReason: "User is asking to retrieve a previously generated artifact",
            })
        )
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
