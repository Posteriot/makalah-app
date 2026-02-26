import { describe, it, expect } from "vitest";
import { stripChitchat, type CompactableMessage } from "@/lib/ai/context-compaction";

describe("Context Compaction", () => {
    describe("stripChitchat", () => {
        it("should remove short user confirmations", () => {
            const messages: CompactableMessage[] = [
                { role: "user", content: "ok" },
                { role: "assistant", content: "Baik, saya akan melanjutkan." },
                { role: "user", content: "ya" },
                { role: "assistant", content: "Berikut hasilnya." },
            ];
            const result = stripChitchat(messages);
            expect(result).toHaveLength(2);
            expect(result.every(m => m.role === "assistant")).toBe(true);
        });

        it("should NOT remove user messages with questions", () => {
            const messages: CompactableMessage[] = [
                { role: "user", content: "ok?" },
                { role: "assistant", content: "Ya, benar." },
            ];
            const result = stripChitchat(messages);
            expect(result).toHaveLength(2);
        });

        it("should NOT remove user messages longer than 50 chars", () => {
            const messages: CompactableMessage[] = [
                { role: "user", content: "Saya setuju dengan pendekatan yang kamu sarankan tadi" },
                { role: "assistant", content: "Baik." },
            ];
            const result = stripChitchat(messages);
            expect(result).toHaveLength(2);
        });

        it("should NOT remove system messages even if short", () => {
            const messages: CompactableMessage[] = [
                { role: "system", content: "ok" },
                { role: "user", content: "ok" },
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
                { role: "user", content: "bagus!" },
                { role: "assistant", content: "Terima kasih." },
            ];
            const result = stripChitchat(messages);
            expect(result).toHaveLength(2);
        });

        it("should remove very short messages without punctuation", () => {
            const messages: CompactableMessage[] = [
                { role: "user", content: "sip" },
                { role: "user", content: "lanjut" },
                { role: "user", content: "oke" },
            ];
            const result = stripChitchat(messages);
            expect(result).toHaveLength(0);
        });
    });
});
