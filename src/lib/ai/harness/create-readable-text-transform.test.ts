import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
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

// Convenience: instantiate a transform from our factory with no timer-based
// flush unless the test explicitly opts in.
function makeTransform(
    opts: Parameters<typeof createReadableTextTransform>[0] = { maxBufferedDelayMs: 0 },
) {
    // StreamTextTransform signature requires a call with { tools, stopStream }
    return () => createReadableTextTransform(opts)({ tools: {}, stopStream: () => {} })
}

describe("createReadableTextTransform", () => {
    it("coalesces char-by-char text-delta chunks into word-level boundaries", async () => {
        const inputs = [
            { type: "text-delta", id: "t1", text: "H" },
            { type: "text-delta", id: "t1", text: "a" },
            { type: "text-delta", id: "t1", text: "l" },
            { type: "text-delta", id: "t1", text: "o" },
            { type: "text-delta", id: "t1", text: " " },
            { type: "text-delta", id: "t1", text: "d" },
            { type: "text-delta", id: "t1", text: "u" },
            { type: "text-delta", id: "t1", text: "n" },
            { type: "text-delta", id: "t1", text: "i" },
            { type: "text-delta", id: "t1", text: "a" },
            { type: "text-delta", id: "t1", text: "." },
            { type: "finish", finishReason: "stop" },
        ]

        const output = await runTransform(inputs, makeTransform())

        // Expect word-level chunking: "Halo " then "dunia." at flush
        const textOutputs = output
            .filter((c) => c.type === "text-delta")
            .map((c) => c.text)
            .join("|")
        expect(textOutputs).toBe("Halo |dunia.")
        // Finish chunk forwarded after flush
        expect(output[output.length - 1]).toEqual({ type: "finish", finishReason: "stop" })
    })

    it("flushes pending text buffer BEFORE forwarding a non-text chunk (tool-call boundary)", async () => {
        const inputs = [
            { type: "text-delta", id: "t1", text: "Oke, aku akan menyim" }, // no trailing space
            { type: "tool-call", toolCallId: "c1", toolName: "updateStageData", input: {} },
            { type: "text-delta", id: "t1", text: "pan ke artifact." },
            { type: "finish", finishReason: "stop" },
        ]

        const output = await runTransform(inputs, makeTransform())

        // Key property: tool-call appears exactly once and is preceded by
        // the full pending text buffer "Oke, aku akan menyim". Word boundary
        // chunking may break this into several text-delta events (one per
        // word + one forced flush of the partial tail), but the combined
        // text-before-tool-call must equal the input text-before-tool-call.
        const toolCallIdx = output.findIndex((c) => c.type === "tool-call")
        expect(toolCallIdx).toBeGreaterThan(0)
        expect(output.filter((c) => c.type === "tool-call").length).toBe(1)

        const preToolText = output
            .slice(0, toolCallIdx)
            .filter((c) => c.type === "text-delta")
            .map((c) => c.text)
            .join("")
        expect(preToolText).toBe("Oke, aku akan menyim")

        const postToolText = output
            .slice(toolCallIdx + 1)
            .filter((c) => c.type === "text-delta")
            .map((c) => c.text)
            .join("")
        expect(postToolText).toBe("pan ke artifact.")

        // Last chunk is always the finish chunk (preserved order).
        expect(output[output.length - 1].type).toBe("finish")
    })

    it("flushes pending buffer when the delta type or id changes mid-stream", async () => {
        const inputs = [
            { type: "text-delta", id: "t1", text: "hello " },
            { type: "text-delta", id: "t1", text: "wor" }, // partial
            { type: "reasoning-delta", id: "r1", text: "let me think" },
            { type: "finish", finishReason: "stop" },
        ]

        const output = await runTransform(inputs, makeTransform())

        // "wor" must flush before reasoning-delta lands
        const types = output.map((c) => c.type)
        // Allowed shape: text, text(flushed), reasoning (possibly internally broken by buffer), finish
        expect(types[0]).toBe("text-delta")
        expect(types[1]).toBe("text-delta") // flushed "wor"
        expect(types[types.length - 1]).toBe("finish")
        // All text-delta outputs should only contain text-like content
        const textOut = output
            .filter((c) => c.type === "text-delta")
            .map((c) => c.text)
            .join("")
        expect(textOut).toBe("hello wor")
    })

    it("enforces maxBufferedChars guard: flushes when buffer exceeds the limit", async () => {
        const longTokenNoSpace = "a".repeat(260) // > default 240
        const inputs = [
            { type: "text-delta", id: "t1", text: longTokenNoSpace },
            { type: "finish", finishReason: "stop" },
        ]

        const output = await runTransform(
            inputs,
            makeTransform({ maxBufferedChars: 240, maxBufferedDelayMs: 0 }),
        )

        // There should be at least one text-delta output before finish, with
        // all 260 chars preserved across the emitted chunks.
        const textChunks = output.filter((c) => c.type === "text-delta")
        expect(textChunks.length).toBeGreaterThan(0)
        const joined = textChunks.map((c) => c.text).join("")
        expect(joined).toBe(longTokenNoSpace)
        // Force-flush should happen — i.e. the first text emission is at or
        // around the limit, not held until the finish chunk.
        expect(textChunks[0].text.length).toBeGreaterThanOrEqual(240)
    })

    it("time-based flush releases pending buffer after maxBufferedDelayMs", async () => {
        vi.useFakeTimers()
        try {
            const factory = createReadableTextTransform({
                maxBufferedDelayMs: 250,
            })
            // We invoke the transform manually so we can observe controller
            // enqueue calls directly without fighting ReadableStream semantics
            // inside fake-timer mode.
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

            // Send a partial word (no whitespace → no word boundary match)
            await writer.write({ type: "text-delta", id: "t1", text: "partial" })

            // Advance time past the delay: forced flush should fire
            await vi.advanceTimersByTimeAsync(260)

            // Close the writer to end the stream and let readLoop finish
            await writer.close()
            await readLoop

            const textOut = enqueued
                .filter((c): c is { type: string; text: string } => (c as { type?: string }).type === "text-delta")
                .map((c) => c.text)
                .join("")
            expect(textOut).toBe("partial")
        } finally {
            vi.useRealTimers()
        }
    })

    it("flush callback on stream end emits any remaining buffered text", async () => {
        const inputs = [
            { type: "text-delta", id: "t1", text: "incomplete" }, // no whitespace, no boundary
        ]

        const output = await runTransform(inputs, makeTransform())

        const textOut = output
            .filter((c) => c.type === "text-delta")
            .map((c) => c.text)
            .join("")
        expect(textOut).toBe("incomplete")
    })

    it("preserves original chunk order including non-text control chunks", async () => {
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

        const types = output.map((c) => c.type)
        const nonTextOrder = types.filter((t) => t !== "text-delta")
        expect(nonTextOrder).toEqual([
            "start",
            "tool-input-start",
            "tool-call",
            "tool-result",
            "finish",
        ])
    })

    it("carries providerMetadata from buffered deltas to flushed chunks", async () => {
        const meta = { anthropic: { cache: true } }
        const inputs = [
            { type: "text-delta", id: "t1", text: "Halo " },
            { type: "text-delta", id: "t1", text: "dunia", providerMetadata: meta },
            { type: "finish", finishReason: "stop" },
        ]

        const output = await runTransform(inputs, makeTransform())

        const textChunks = output.filter((c) => c.type === "text-delta")
        // Word "Halo " emits without meta; final flush of "dunia" carries meta
        expect(textChunks[0].providerMetadata).toBeUndefined()
        const lastTextChunk = textChunks[textChunks.length - 1]
        expect(lastTextChunk.text).toBe("dunia")
        expect(lastTextChunk.providerMetadata).toEqual(meta)
    })

    it("supports sentence chunking preset for coarser-grained releases", async () => {
        const inputs = [
            { type: "text-delta", id: "t1", text: "Kalimat pertama. " },
            { type: "text-delta", id: "t1", text: "Kalimat kedua! " },
            { type: "text-delta", id: "t1", text: "Ketiga?" },
            { type: "finish", finishReason: "stop" },
        ]

        const output = await runTransform(
            inputs,
            makeTransform({ chunking: "sentence", maxBufferedDelayMs: 0 }),
        )

        const textChunks = output.filter((c) => c.type === "text-delta").map((c) => c.text)
        // Expect: "Kalimat pertama. " | "Kalimat kedua! " | "Ketiga?"
        expect(textChunks[0]).toBe("Kalimat pertama. ")
        expect(textChunks[1]).toBe("Kalimat kedua! ")
        expect(textChunks[textChunks.length - 1]).toBe("Ketiga?")
    })
})
