import { describe, it, expect, vi } from "vitest";
import {
    stripChitchat,
    excludeStageMessages,
    buildStageDigestMessage,
    runCompactionChain,
    type CompactableMessage,
} from "@/lib/ai/context-compaction";

// Mock generateText for P3 tests
vi.mock("ai", () => ({
    generateText: vi.fn(),
}));

// Mock getStageLabel — returns the stage key as-is for simplicity
vi.mock("../../../convex/paperSessions/constants", () => ({
    getStageLabel: (stage: string) => stage.charAt(0).toUpperCase() + stage.slice(1),
}));

// ════════════════════════════════════════════════════════════════
// Helper: create message with specific char count
// CHARS_PER_TOKEN = 4, so 400 chars = 100 tokens
// ════════════════════════════════════════════════════════════════
function msg(role: string, content: string, id?: string): CompactableMessage {
    return { role, content, ...(id ? { id } : {}) };
}

function bulkContent(charCount: number): string {
    return "x".repeat(charCount);
}

const idExtractor = (m: CompactableMessage) => (m as { id?: string }).id || undefined;

// ════════════════════════════════════════════════════════════════
// P1: stripChitchat
// ════════════════════════════════════════════════════════════════
describe("stripChitchat", () => {
    it("should remove short user confirmations", () => {
        const messages: CompactableMessage[] = [
            msg("user", "ok"),
            msg("assistant", "Baik, saya akan melanjutkan."),
            msg("user", "ya"),
            msg("assistant", "Berikut hasilnya."),
        ];
        const result = stripChitchat(messages);
        expect(result).toHaveLength(2);
        expect(result.every(m => m.role === "assistant")).toBe(true);
    });

    it("should NOT remove user messages with questions", () => {
        const messages: CompactableMessage[] = [
            msg("user", "ok?"),
            msg("assistant", "Ya, benar."),
        ];
        const result = stripChitchat(messages);
        expect(result).toHaveLength(2);
    });

    it("should NOT remove user messages longer than 50 chars", () => {
        const messages: CompactableMessage[] = [
            msg("user", "Saya setuju dengan pendekatan yang kamu sarankan tadi"),
            msg("assistant", "Baik."),
        ];
        const result = stripChitchat(messages);
        expect(result).toHaveLength(2);
    });

    it("should NOT remove system messages even if short", () => {
        const messages: CompactableMessage[] = [
            msg("system", "ok"),
            msg("user", "ok"),
        ];
        const result = stripChitchat(messages);
        expect(result).toHaveLength(1);
        expect(result[0].role).toBe("system");
    });

    it("should handle empty array", () => {
        expect(stripChitchat([])).toHaveLength(0);
    });

    it("should NOT remove messages with exclamation marks", () => {
        const messages: CompactableMessage[] = [
            msg("user", "bagus!"),
            msg("assistant", "Terima kasih."),
        ];
        const result = stripChitchat(messages);
        expect(result).toHaveLength(2);
    });

    it("should remove very short messages without punctuation", () => {
        const messages: CompactableMessage[] = [
            msg("user", "sip"),
            msg("user", "lanjut"),
            msg("user", "oke"),
        ];
        const result = stripChitchat(messages);
        expect(result).toHaveLength(0);
    });
});

// ════════════════════════════════════════════════════════════════
// P2: excludeStageMessages
// ════════════════════════════════════════════════════════════════
describe("excludeStageMessages", () => {
    it("should exclude messages within boundary range", () => {
        const messages = [
            msg("system", "system prompt"),
            msg("user", "msg before", "m1"),
            msg("user", "stage start", "m2"),
            msg("assistant", "stage mid", "m3"),
            msg("user", "stage end", "m4"),
            msg("user", "msg after", "m5"),
        ];
        const boundary = { stage: "gagasan", firstMessageId: "m2", lastMessageId: "m4", messageCount: 3 };

        const result = excludeStageMessages(messages, boundary, idExtractor);
        expect(result).toHaveLength(3); // system + m1 + m5
        expect(result.map(m => (m as { id?: string }).id)).toEqual([undefined, "m1", "m5"]);
    });

    it("should handle single-message stage (firstId === lastId)", () => {
        const messages = [
            msg("user", "before", "m1"),
            msg("user", "single stage msg", "m2"),
            msg("user", "after", "m3"),
        ];
        const boundary = { stage: "topik", firstMessageId: "m2", lastMessageId: "m2", messageCount: 1 };

        const result = excludeStageMessages(messages, boundary, idExtractor);
        expect(result).toHaveLength(2);
        expect(result.map(m => (m as { id?: string }).id)).toEqual(["m1", "m3"]);
    });

    it("should always preserve system messages even within range", () => {
        const messages = [
            msg("user", "stage start", "m1"),
            msg("system", "injected system note"),
            msg("assistant", "response", "m2"),
            msg("user", "stage end", "m3"),
        ];
        const boundary = { stage: "gagasan", firstMessageId: "m1", lastMessageId: "m3", messageCount: 3 };

        const result = excludeStageMessages(messages, boundary, idExtractor);
        expect(result).toHaveLength(1);
        expect(result[0].role).toBe("system");
    });

    it("should exclude messages without ID within range (C1 fix)", () => {
        const messages = [
            msg("user", "before", "m1"),
            msg("user", "stage start", "m2"),
            msg("assistant", "tool call no id"), // no ID — should be excluded
            msg("assistant", "response", "m3"),
            msg("user", "stage end", "m4"),
            msg("user", "after", "m5"),
        ];
        const boundary = { stage: "gagasan", firstMessageId: "m2", lastMessageId: "m4", messageCount: 4 };

        const result = excludeStageMessages(messages, boundary, idExtractor);
        expect(result).toHaveLength(2); // m1 + m5
        expect(result.map(m => (m as { id?: string }).id)).toEqual(["m1", "m5"]);
    });

    it("should not exclude messages when boundary IDs not found", () => {
        const messages = [
            msg("user", "a", "m1"),
            msg("user", "b", "m2"),
        ];
        const boundary = { stage: "gagasan", firstMessageId: "xxx", lastMessageId: "yyy", messageCount: 0 };

        const result = excludeStageMessages(messages, boundary, idExtractor);
        expect(result).toHaveLength(2);
    });
});

// ════════════════════════════════════════════════════════════════
// buildStageDigestMessage
// ════════════════════════════════════════════════════════════════
describe("buildStageDigestMessage", () => {
    it("should build digest from matching stages", () => {
        const digest = [
            { stage: "gagasan", decision: "Topik AI di pendidikan", timestamp: 1000 },
            { stage: "topik", decision: "Fokus NLP untuk essay grading", timestamp: 2000 },
        ];
        const result = buildStageDigestMessage(digest, ["gagasan", "topik"]);
        expect(result).not.toBeNull();
        expect(result!.role).toBe("system");
        expect(result!.content).toContain("2 tahap sebelumnya di-compact");
        expect(result!.content).toContain("Topik AI di pendidikan");
        expect(result!.content).toContain("Fokus NLP untuk essay grading");
    });

    it("should exclude superseded entries", () => {
        const digest = [
            { stage: "gagasan", decision: "Old decision", timestamp: 1000, superseded: true },
            { stage: "gagasan", decision: "New decision", timestamp: 2000 },
        ];
        const result = buildStageDigestMessage(digest, ["gagasan"]);
        expect(result).not.toBeNull();
        expect(result!.content).not.toContain("Old decision");
        expect(result!.content).toContain("New decision");
    });

    it("should return null for empty compacted stages", () => {
        const result = buildStageDigestMessage([], []);
        expect(result).toBeNull();
    });

    it("should return null when no digest entries match compacted stages", () => {
        const digest = [
            { stage: "gagasan", decision: "Something", timestamp: 1000 },
        ];
        const result = buildStageDigestMessage(digest, ["topik"]);
        expect(result).toBeNull();
    });
});

// ════════════════════════════════════════════════════════════════
// runCompactionChain — full orchestrator
// ════════════════════════════════════════════════════════════════
describe("runCompactionChain", () => {
    it("should return immediately when under threshold (no compaction needed)", async () => {
        const messages = [msg("user", "hello")]; // ~2 tokens, well under any threshold
        const result = await runCompactionChain(messages, {
            contextWindow: 128000,
            compactionThreshold: 100000, // way above message size
            isPaperMode: false,
        });
        expect(result.resolvedAtPriority).toBe("none");
        expect(result.strippedChitchatCount).toBe(0);
        expect(result.messages).toHaveLength(1);
    });

    it("should resolve at P1 when chitchat removal drops below threshold", async () => {
        // Threshold = 50 tokens = 200 chars
        // Content: 150 chars of real content + chitchat
        const messages = [
            msg("user", bulkContent(150)),
            msg("user", "ok"),       // chitchat — 2 chars
            msg("user", "sip"),      // chitchat — 3 chars
            msg("user", "ya"),       // chitchat — 2 chars
            msg("assistant", bulkContent(40)),
        ];
        // Total: 150 + 2 + 3 + 2 + 40 = 197 chars = ~50 tokens
        // After P1: 150 + 40 = 190 chars = ~48 tokens
        const result = await runCompactionChain(messages, {
            contextWindow: 1000,
            compactionThreshold: 49, // just above post-P1 count
            isPaperMode: false,
        });
        expect(result.resolvedAtPriority).toBe("P1");
        expect(result.strippedChitchatCount).toBe(3);
        expect(result.messages).toHaveLength(2);
    });

    it("should resolve at P2 when stage compaction drops below threshold", async () => {
        // Stage "gagasan" messages: m2-m3 = 400 chars = 100 tokens
        // Remaining after P2: system(10) + m1(10) + m4(10) = 30 chars = 8 tokens
        const messages = [
            msg("system", bulkContent(10)),
            msg("user", bulkContent(10), "m1"),
            msg("user", bulkContent(200), "m2"),      // stage gagasan
            msg("assistant", bulkContent(200), "m3"),  // stage gagasan
            msg("user", bulkContent(10), "m4"),
        ];
        const result = await runCompactionChain(
            messages,
            {
                contextWindow: 1000,
                compactionThreshold: 100, // 400 chars total = 100 tokens, so it triggers
                isPaperMode: true,
                paperSession: {
                    currentStage: "topik",
                    stageMessageBoundaries: [
                        { stage: "gagasan", firstMessageId: "m2", lastMessageId: "m3", messageCount: 2 },
                    ],
                    paperMemoryDigest: [
                        { stage: "gagasan", decision: "AI di pendidikan", timestamp: 1000 },
                    ],
                },
            },
            idExtractor,
        );
        expect(result.resolvedAtPriority).toBe("P2");
        expect(result.compactedStages).toEqual(["gagasan"]);
        // Should have digest message injected
        const digestMsg = result.messages.find(m => m.content.includes("CONTEXT COMPACTION"));
        expect(digestMsg).toBeDefined();
        expect(digestMsg!.content).toContain("AI di pendidikan");
    });

    it("should resolve at P3 with LLM summary for general chat", async () => {
        // Need enough messages to trigger P3 summarization (summarizeCount > 2)
        const { generateText } = await import("ai");
        const mockedGenerate = vi.mocked(generateText);
        mockedGenerate.mockResolvedValueOnce({
            text: "- User bertanya tentang AI\n- Diskusi fitur chat",
        } as ReturnType<typeof generateText> extends Promise<infer T> ? T : never);

        // 10 conversation messages, each 100 chars = 1000 chars total = 250 tokens
        const messages: CompactableMessage[] = [];
        for (let i = 0; i < 10; i++) {
            messages.push(msg(i % 2 === 0 ? "user" : "assistant", bulkContent(100), `m${i}`));
        }

        const result = await runCompactionChain(
            messages,
            {
                contextWindow: 1000,
                compactionThreshold: 200, // 1000 chars = 250 tokens > 200
                isPaperMode: false,
                getModel: async () => "mock-model",
            },
            idExtractor,
        );
        expect(result.resolvedAtPriority).toBe("P3");
        expect(result.llmSummarized).toBe(true);
        // Should have summary message
        const summaryMsg = result.messages.find(m => m.content.includes("RINGKASAN DISKUSI"));
        expect(summaryMsg).toBeDefined();
    });

    it("should gracefully continue when P3 LLM fails", async () => {
        const { generateText } = await import("ai");
        const mockedGenerate = vi.mocked(generateText);
        mockedGenerate.mockRejectedValueOnce(new Error("LLM API down"));

        const messages: CompactableMessage[] = [];
        for (let i = 0; i < 10; i++) {
            messages.push(msg(i % 2 === 0 ? "user" : "assistant", bulkContent(100), `m${i}`));
        }

        const result = await runCompactionChain(
            messages,
            {
                contextWindow: 1000,
                compactionThreshold: 200,
                isPaperMode: false,
                getModel: async () => "mock-model",
            },
            idExtractor,
        );
        // LLM failed, no P3 resolution, chain exhausts → "none"
        expect(result.llmSummarized).toBe(false);
        expect(result.resolvedAtPriority).toBe("none");
    });

    it("should resolve at P4 for paper mode when P1-P3 insufficient", async () => {
        const { generateText } = await import("ai");
        const mockedGenerate = vi.mocked(generateText);
        // P3 returns a long summary that doesn't help reduce enough
        mockedGenerate.mockResolvedValueOnce({
            text: bulkContent(3000), // large summary — keeps total above threshold
        } as ReturnType<typeof generateText> extends Promise<infer T> ? T : never);

        // 20 messages, each 500 chars = 10000 chars = 2500 tokens
        const messages: CompactableMessage[] = [];
        for (let i = 0; i < 20; i++) {
            messages.push(msg(i % 2 === 0 ? "user" : "assistant", bulkContent(500), `m${i}`));
        }

        const result = await runCompactionChain(
            messages,
            {
                contextWindow: 10000,
                // Total = 2500 tokens. After P3: 14 kept msgs (7000 chars) + summary (3000 chars)
                // = 10000 chars = 2500 tokens, still > 2400 → P3 doesn't resolve → P4
                compactionThreshold: 2400,
                isPaperMode: true,
                paperSession: {
                    currentStage: "metodologi",
                    stageMessageBoundaries: [], // no boundaries to compact in P2
                    paperMemoryDigest: [],
                },
                getModel: async () => "mock-model",
            },
            idExtractor,
        );
        expect(result.resolvedAtPriority).toBe("P4");
        expect(result.llmSummarized).toBe(true); // P3 ran but didn't resolve
    });

    it("should skip P2 for general chat (non-paper mode)", async () => {
        const messages = [
            msg("user", bulkContent(200), "m1"),
            msg("assistant", bulkContent(200), "m2"),
        ];
        // 400 chars = 100 tokens, threshold = 50
        // P1 won't help (no chitchat), P2 skipped (not paper mode), P3 needs getModel
        const result = await runCompactionChain(
            messages,
            {
                contextWindow: 1000,
                compactionThreshold: 50,
                isPaperMode: false,
                // no getModel → P3 skipped
            },
            idExtractor,
        );
        expect(result.resolvedAtPriority).toBe("none");
        expect(result.compactedStages).toHaveLength(0);
    });
});
