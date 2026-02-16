import { describe, it, expect } from "vitest";
import {
  estimateTokenCount,
  checkContextBudget,
  pruneMessages,
  estimateMessagesChars,
  getContextWindow,
  type UIMessage,
} from "@/lib/ai/context-budget";

describe("Context Budget", () => {
  describe("estimateTokenCount", () => {
    it("should estimate tokens as chars/4", () => {
      expect(estimateTokenCount("abcd")).toBe(1);
      expect(estimateTokenCount("a".repeat(100))).toBe(25);
    });

    it("should round up for partial tokens", () => {
      expect(estimateTokenCount("abc")).toBe(1); // 3/4 = 0.75, ceil = 1
      expect(estimateTokenCount("abcde")).toBe(2); // 5/4 = 1.25, ceil = 2
    });

    it("should return 0 for empty string", () => {
      expect(estimateTokenCount("")).toBe(0);
    });
  });

  describe("getContextWindow", () => {
    it("should return configured value when provided", () => {
      expect(getContextWindow(1_048_576)).toBe(1_048_576);
    });

    it("should return default 128K when undefined", () => {
      expect(getContextWindow(undefined)).toBe(128_000);
    });

    it("should return default 128K when 0", () => {
      expect(getContextWindow(0)).toBe(128_000);
    });
  });

  describe("checkContextBudget", () => {
    it("should flag shouldPrune when over threshold", () => {
      // 128k window, threshold at 0.8 = 102400 tokens = 409600 chars
      const result = checkContextBudget(500_000, 128_000);
      expect(result.shouldPrune).toBe(true);
    });

    it("should flag shouldWarn at 60% threshold", () => {
      // 128k * 0.6 = 76800 tokens = 307200 chars
      // 128k * 0.8 = 102400 tokens = 409600 chars
      const result = checkContextBudget(350_000, 128_000);
      expect(result.shouldWarn).toBe(true);
      expect(result.shouldPrune).toBe(false);
    });

    it("should not flag when under 60%", () => {
      // Under 307200 chars = under 76800 tokens
      const result = checkContextBudget(200_000, 128_000);
      expect(result.shouldWarn).toBe(false);
      expect(result.shouldPrune).toBe(false);
    });

    it("should use provided context window", () => {
      // 1M tokens, threshold 0.8 = 838860 tokens
      const result = checkContextBudget(100, 1_048_576);
      expect(result.threshold).toBe(Math.floor(1_048_576 * 0.8));
      expect(result.contextWindow).toBe(1_048_576);
    });
  });

  describe("pruneMessages", () => {
    it("should prune keeping last N messages", () => {
      const messages = [
        { role: "user", parts: [{ type: "text", text: "msg1" }] },
        { role: "assistant", parts: [{ type: "text", text: "msg2" }] },
        { role: "user", parts: [{ type: "text", text: "msg3" }] },
        { role: "assistant", parts: [{ type: "text", text: "msg4" }] },
        { role: "user", parts: [{ type: "text", text: "msg5" }] },
      ] satisfies UIMessage[];
      const pruned = pruneMessages(messages, 3);
      expect(pruned).toHaveLength(3);
      expect(pruned[0].parts![0].text).toBe("msg3");
    });

    it("should return all messages when count <= keepLastN", () => {
      const messages = [
        { role: "user", parts: [{ type: "text", text: "msg1" }] },
        { role: "assistant", parts: [{ type: "text", text: "msg2" }] },
      ] satisfies UIMessage[];
      const pruned = pruneMessages(messages, 50);
      expect(pruned).toHaveLength(2);
    });

    it("should use default keepLastN of 50", () => {
      const messages = Array.from({ length: 60 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        parts: [{ type: "text", text: `msg${i}` }],
      })) satisfies UIMessage[];
      const pruned = pruneMessages(messages);
      expect(pruned).toHaveLength(50);
    });
  });

  describe("estimateMessagesChars", () => {
    it("should sum text parts from messages", () => {
      const messages: UIMessage[] = [
        { role: "user", parts: [{ type: "text", text: "hello" }] },
        { role: "assistant", parts: [{ type: "text", text: "world!" }] },
      ];
      expect(estimateMessagesChars(messages)).toBe(11); // 5 + 6
    });

    it("should handle messages without parts", () => {
      const messages: UIMessage[] = [
        { role: "system", content: "system prompt" },
      ];
      expect(estimateMessagesChars(messages)).toBe(0);
    });

    it("should handle mixed content types in parts", () => {
      const messages: UIMessage[] = [
        {
          role: "user",
          parts: [
            { type: "text", text: "hello" },
            { type: "image" },
            { type: "text", text: "world" },
          ],
        },
      ];
      expect(estimateMessagesChars(messages)).toBe(10); // 5 + 5
    });
  });
});
