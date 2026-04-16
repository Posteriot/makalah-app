import { describe, it, expect, vi } from "vitest"
import { createReadableTextTransform } from "./create-readable-text-transform"

// Helper: pipe an array of chunks through the transform and collect output.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runTransform(inputs: any[], transformFactory: () => TransformStream): Promise<any[]> {
    const readable = new ReadableStream({
        start(controller) {
            for (const input of inputs) controller.enqueue(input)
            controller.close()
        },
    })
    const transform = transformFactory()
    const piped = readable.pipeThrough(transform)
    const reader = piped.getReader()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: any[] = []
    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        out.push(value)
    }
    return out
}

// Convenience factory: disables timer flush by default so most tests can
// assert deterministic emission order without touching fake timers.
function makeTransform(
    opts: Parameters<typeof createReadableTextTransform>[0] = { maxBufferedDelayMs: 0 },
) {
    return () => createReadableTextTransform(opts)({ tools: {}, stopStream: () => {} })
}

describe("createReadableTextTransform", () => {
    it("emits at sentence boundaries by default, holding incomplete sentences in buffer", async () => {
        const inputs = [
            { type: "text-delta", id: "t1", text: "Halo" },
            { type: "text-delta", id: "t1", text: " dunia." },
            { type: "text-delta", id: "t1", text: " Ini kalimat kedua." },
            { type: "finish", finishReason: "stop" },
        ]

        const output = await runTransform(inputs, makeTransform())

        // Default primary boundary = sentence: "[.!?]\s|\n". Both sentences
        // end with a period followed by a space (the first period is inside
        // the second delta and is followed by the start of the next delta's
        // leading space). Expect one emission per sentence-ending boundary.
        const textChunks = output
            .filter((c) => c.type === "text-delta")
            .map((c) => c.text)
        expect(textChunks.join("")).toBe("Halo dunia. Ini kalimat kedua.")
        // Last chunk remains finish.
        expect(output[output.length - 1].type).toBe("finish")
    })

    it("at a tool-call boundary, flushes only up to last word and HOLDS the partial tail for merge", async () => {
        const inputs = [
            { type: "text-delta", id: "t1", text: "Oke, aku akan menyim" }, // partial word "menyim"
            { type: "tool-call", toolCallId: "c1", toolName: "updateStageData", input: {} },
            { type: "text-delta", id: "t1", text: "pan ke artifact." },
            { type: "finish", finishReason: "stop" },
        ]

        const output = await runTransform(inputs, makeTransform())

        // Critical UX contract: before the tool-call is forwarded, the
        // visible text must end at a WORD boundary — NOT on "menyim".
        const toolCallIdx = output.findIndex((c) => c.type === "tool-call")
        expect(toolCallIdx).toBeGreaterThan(0)
        const preToolText = output
            .slice(0, toolCallIdx)
            .filter((c) => c.type === "text-delta")
            .map((c) => c.text)
            .join("")
        expect(preToolText).toBe("Oke, aku akan ")

        // The partial tail "menyim" must NOT appear before the tool-call.
        expect(preToolText).not.toContain("menyim")

        // After the tool-call, the held tail merges with the next delta to
        // form the complete word and the rest of the sentence.
        const postToolText = output
            .slice(toolCallIdx + 1)
            .filter((c) => c.type === "text-delta")
            .map((c) => c.text)
            .join("")
        expect(postToolText).toBe("menyimpan ke artifact.")

        // Final chunk is always finish (order preserved).
        expect(output[output.length - 1].type).toBe("finish")
    })

    it("preserves residual tail across MULTIPLE consecutive non-text chunks", async () => {
        // Simulates the tools-path chain observed in test-2 turn 3:
        // updateStageData → createArtifact → submitForValidation. The partial
        // word must survive all three non-text chunks and merge only when
        // real text resumes.
        const inputs = [
            { type: "text-delta", id: "t1", text: "Sekarang aku simp" }, // tail "simp"
            { type: "tool-call", toolCallId: "c1", toolName: "updateStageData", input: {} },
            { type: "tool-result", toolCallId: "c1", toolName: "updateStageData", output: {} },
            { type: "tool-call", toolCallId: "c2", toolName: "createArtifact", input: {} },
            { type: "tool-result", toolCallId: "c2", toolName: "createArtifact", output: {} },
            { type: "text-delta", id: "t1", text: "an hasilnya." },
            { type: "finish", finishReason: "stop" },
        ]

        const output = await runTransform(inputs, makeTransform())

        const preText = output
            .filter((c) => c.type === "text-delta")
            .map((c) => c.text)
            .join("")

        // The visible text end-to-end reads as complete words only.
        // Intermediate non-text chunks never witness "simp" on screen.
        expect(preText).toBe("Sekarang aku simpan hasilnya.")

        // And none of the pre-tool text emissions contain the partial tail.
        const firstToolIdx = output.findIndex((c) => c.type === "tool-call")
        const preToolText = output
            .slice(0, firstToolIdx)
            .filter((c) => c.type === "text-delta")
            .map((c) => c.text)
            .join("")
        expect(preToolText).toBe("Sekarang aku ")
        expect(preToolText).not.toContain("simp")
    })

    it("flushes pending buffer when the delta type or id changes mid-stream (cannot merge across streams)", async () => {
        const inputs = [
            { type: "text-delta", id: "t1", text: "hello " },
            { type: "text-delta", id: "t1", text: "wor" }, // partial
            { type: "reasoning-delta", id: "r1", text: "let me think" },
            { type: "finish", finishReason: "stop" },
        ]

        const output = await runTransform(inputs, makeTransform())

        // Cannot merge "wor" into reasoning stream, so full-flush the
        // text buffer (including tail) before switching to reasoning.
        const textOut = output
            .filter((c) => c.type === "text-delta")
            .map((c) => c.text)
            .join("")
        expect(textOut).toBe("hello wor")

        const reasoningOut = output
            .filter((c) => c.type === "reasoning-delta")
            .map((c) => c.text)
            .join("")
        expect(reasoningOut).toBe("let me think")

        expect(output[output.length - 1].type).toBe("finish")
    })

    it("enforces maxBufferedChars hard cap: full-flushes a single oversized run", async () => {
        const longTokenNoSpace = "a".repeat(260) // > default 240
        const inputs = [
            { type: "text-delta", id: "t1", text: longTokenNoSpace },
            { type: "finish", finishReason: "stop" },
        ]

        const output = await runTransform(
            inputs,
            makeTransform({ maxBufferedChars: 240, maxBufferedDelayMs: 0 }),
        )

        const textChunks = output.filter((c) => c.type === "text-delta")
        expect(textChunks.length).toBeGreaterThan(0)
        const joined = textChunks.map((c) => c.text).join("")
        expect(joined).toBe(longTokenNoSpace)
        // First text emission happens at the hard cap (emergency release).
        expect(textChunks[0].text.length).toBeGreaterThanOrEqual(240)
    })

    it("time-based flush emits completed words but KEEPS the partial tail", async () => {
        vi.useFakeTimers()
        try {
            const factory = createReadableTextTransform({
                maxBufferedDelayMs: 250,
            })
            const tx = factory({ tools: {}, stopStream: () => {} })
            const enqueued: unknown[] = []
            const writer = tx.writable.getWriter()
            const reader = tx.readable.getReader()

            const readLoop = (async () => {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    enqueued.push(value)
                }
            })()

            // Buffer ends mid-word after "wor".
            await writer.write({ type: "text-delta", id: "t1", text: "Halo dunia wor" })

            await vi.advanceTimersByTimeAsync(260)

            // At this point the timer has fired. The safe flush should have
            // emitted "Halo dunia " (up to the last word boundary) and
            // kept "wor" in buffer.
            const textBeforeClose = enqueued
                .filter((c): c is { type: string; text: string } => (c as { type?: string }).type === "text-delta")
                .map((c) => c.text)
                .join("|")
            expect(textBeforeClose).toBe("Halo dunia ")

            // Close the writer: stream-end full-flush should finally reveal
            // the held tail.
            await writer.close()
            await readLoop

            const textAllOut = enqueued
                .filter((c): c is { type: string; text: string } => (c as { type?: string }).type === "text-delta")
                .map((c) => c.text)
                .join("")
            expect(textAllOut).toBe("Halo dunia wor")
        } finally {
            vi.useRealTimers()
        }
    })

    it("time-based flush does NOT split a word when no safe boundary exists", async () => {
        vi.useFakeTimers()
        try {
            const factory = createReadableTextTransform({
                maxBufferedDelayMs: 100,
            })
            const tx = factory({ tools: {}, stopStream: () => {} })
            const enqueued: unknown[] = []
            const writer = tx.writable.getWriter()
            const reader = tx.readable.getReader()

            const readLoop = (async () => {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    enqueued.push(value)
                }
            })()

            // Single partial word, no whitespace anywhere. Safe boundary
            // regex /\S+\s/ cannot match — timer flush must be a no-op.
            await writer.write({ type: "text-delta", id: "t1", text: "incomplete" })

            await vi.advanceTimersByTimeAsync(120)

            // Nothing should be emitted yet — buffer holds "incomplete".
            const mid = enqueued
                .filter((c): c is { type: string; text: string } => (c as { type?: string }).type === "text-delta")
                .map((c) => c.text)
                .join("")
            expect(mid).toBe("")

            await writer.close()
            await readLoop

            // Stream-end full flush finally releases it.
            const textOut = enqueued
                .filter((c): c is { type: string; text: string } => (c as { type?: string }).type === "text-delta")
                .map((c) => c.text)
                .join("")
            expect(textOut).toBe("incomplete")
        } finally {
            vi.useRealTimers()
        }
    })

    it("flush callback on stream end emits any remaining buffered text (including partial tail)", async () => {
        const inputs = [
            { type: "text-delta", id: "t1", text: "incomplete" }, // no boundary
        ]

        const output = await runTransform(inputs, makeTransform())

        const textOut = output
            .filter((c) => c.type === "text-delta")
            .map((c) => c.text)
            .join("")
        expect(textOut).toBe("incomplete")
    })

    it("preserves original non-text chunk order including tool-input-start / tool-result", async () => {
        const inputs = [
            { type: "start" },
            { type: "text-delta", id: "t1", text: "Hi " },
            { type: "tool-input-start", id: "ti1", toolName: "foo" },
            { type: "tool-call", toolCallId: "c1", toolName: "foo", input: {} },
            { type: "tool-result", toolCallId: "c1", toolName: "foo", output: {} },
            { type: "text-delta", id: "t1", text: "there." },
            { type: "finish", finishReason: "stop" },
        ]

        const output = await runTransform(inputs, makeTransform())

        const nonTextOrder = output.map((c) => c.type).filter((t) => t !== "text-delta")
        expect(nonTextOrder).toEqual([
            "start",
            "tool-input-start",
            "tool-call",
            "tool-result",
            "finish",
        ])
    })

    it("carries providerMetadata from the delta that completed the emitted unit", async () => {
        const meta = { anthropic: { cache: true } }
        const inputs = [
            { type: "text-delta", id: "t1", text: "Halo " },
            { type: "text-delta", id: "t1", text: "dunia.", providerMetadata: meta },
            { type: "text-delta", id: "t1", text: " Berikutnya." },
            { type: "finish", finishReason: "stop" },
        ]

        const output = await runTransform(inputs, makeTransform())

        // First sentence ("Halo dunia. ") was completed by the delta that
        // carried `meta`, so the first emitted sentence chunk must carry it.
        // The sentence boundary regex /[.!?]\s|\n/ matches ". " so the
        // emitted text includes the trailing space (that is what marks the
        // sentence end in-stream).
        const textChunks = output.filter((c) => c.type === "text-delta")
        const firstSentence = textChunks[0]
        expect(firstSentence.text).toBe("Halo dunia. ")
        expect(firstSentence.providerMetadata).toEqual(meta)
        // Subsequent sentence emissions start fresh — metadata is NOT
        // duplicated onto unrelated output.
        const secondSentence = textChunks[1]
        expect(secondSentence.text).toBe("Berikutnya.")
        expect(secondSentence.providerMetadata).toBeUndefined()
    })

    it("supports word chunking preset when opted in, for finer releases", async () => {
        const inputs = [
            { type: "text-delta", id: "t1", text: "satu dua tiga." },
            { type: "finish", finishReason: "stop" },
        ]

        const output = await runTransform(
            inputs,
            makeTransform({ chunking: "word", maxBufferedDelayMs: 0 }),
        )

        const textChunks = output.filter((c) => c.type === "text-delta").map((c) => c.text)
        // Word-level chunking: each space-terminated run flushes separately.
        expect(textChunks).toEqual(["satu ", "dua ", "tiga."])
    })
})
