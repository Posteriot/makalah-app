import { describe, it, expect, vi } from "vitest"

import { pipeThinkTagStrip } from "./pipe-think-tag-strip"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function streamFromChunks(chunks: unknown[]): ReadableStream<unknown> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
}

function textStart(id = "t1") {
  return { type: "text-start", id }
}

function textEnd(id = "t1") {
  return { type: "text-end", id }
}

function textDelta(delta: string, id = "t1") {
  return { type: "text-delta", id, delta }
}

async function collect(stream: ReadableStream<unknown>): Promise<unknown[]> {
  const reader = stream.getReader()
  const parts: unknown[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    parts.push(value)
  }
  return parts
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Chunk = { type: string; id?: string; delta?: string; [k: string]: any }

function textDeltas(output: unknown[]): Chunk[] {
  return output.filter((c) => (c as Chunk).type === "text-delta") as Chunk[]
}

function reasoningDeltas(output: unknown[]): Chunk[] {
  return output.filter(
    (c) => (c as Chunk).type === "reasoning-delta"
  ) as Chunk[]
}

function allText(output: unknown[]): string {
  return textDeltas(output)
    .map((c) => c.delta ?? "")
    .join("")
}

function allReasoning(output: unknown[]): string {
  return reasoningDeltas(output)
    .map((c) => c.delta ?? "")
    .join("")
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("pipeThinkTagStrip", () => {
  // ── 1. Passthrough ──

  it("passes through text without think tags unchanged", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("Hello world. "),
      textDelta("No thinking here."),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(allText(output)).toBe("Hello world. No thinking here.")
    expect(reasoningDeltas(output)).toHaveLength(0)
    // text-start and text-end forwarded
    expect(output.filter((c) => (c as Chunk).type === "text-start")).toHaveLength(1)
    expect(output.filter((c) => (c as Chunk).type === "text-end")).toHaveLength(1)
  })

  // ── 2. Complete think block in one chunk ──

  it("strips complete <think> block from single chunk and emits as reasoning-delta", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("Before. <think>internal reasoning</think> After."),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(allText(output)).toBe("Before.  After.")
    expect(allReasoning(output)).toBe("internal reasoning")
  })

  // ── 3. Think tag split across chunks ──

  it("handles <think> tag split across two chunks", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("Hello <thi"),
      textDelta("nk>secret reasoning</think> visible"),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(allText(output)).toBe("Hello  visible")
    expect(allReasoning(output)).toBe("secret reasoning")
  })

  it("handles </think> tag split across two chunks", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("<think>reasoning content</thi"),
      textDelta("nk> after"),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(allText(output)).toBe(" after")
    expect(allReasoning(output)).toBe("reasoning content")
  })

  // ── 4. Partial match that ISN'T <think> ──

  it("flushes partial <thi that turns out to be <things>", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("I like <thi"),
      textDelta("ngs> very much"),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(allText(output)).toBe("I like <things> very much")
    expect(reasoningDeltas(output)).toHaveLength(0)
  })

  it("flushes partial <thin that turns out to be <thinking>", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("Start <thin"),
      textDelta("king> deeply"),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(allText(output)).toBe("Start <thinking> deeply")
    expect(reasoningDeltas(output)).toHaveLength(0)
  })

  // ── 5. Multiple think blocks ──

  it("handles multiple think blocks in one stream", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("A <think>first</think> B <think>second</think> C"),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(allText(output)).toBe("A  B  C")
    expect(allReasoning(output)).toBe("firstsecond")
  })

  // ── 6. Stream ends inside think block ──

  it("flushes to reasoning-delta when stream ends inside think block", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const input = streamFromChunks([
      textStart(),
      textDelta("Before <think>unclosed reasoning"),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(allText(output)).toBe("Before ")
    expect(allReasoning(output)).toBe("unclosed reasoning")

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[THINK-STRIP]"),
    )

    warnSpy.mockRestore()
  })

  // ── 7. Text before and after ──

  it("preserves text before and after think block with correct id", async () => {
    const input = streamFromChunks([
      textStart("block-7"),
      textDelta("prefix ", "block-7"),
      textDelta("<think>hidden</think>", "block-7"),
      textDelta(" suffix", "block-7"),
      textEnd("block-7"),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(allText(output)).toBe("prefix  suffix")
    const tds = textDeltas(output)
    for (const td of tds) expect(td.id).toBe("block-7")
  })

  // ── 8. Think block spans text-end boundary ──

  it("flushes think buffer before forwarding text-end", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("<think>reasoning"),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    // reasoning emitted before text-end
    expect(allReasoning(output)).toBe("reasoning")
    const types = output.map((c) => (c as Chunk).type)
    const lastReasoningIdx = types.lastIndexOf("reasoning-delta")
    const textEndIdx = types.indexOf("text-end")
    expect(lastReasoningIdx).toBeLessThan(textEndIdx)
  })

  // ── 9. Non-text chunks forwarded unchanged ──

  it("forwards non-text chunks unchanged even during think block", async () => {
    const toolChunk = { type: "tool-call", toolName: "search", args: {} }
    const sourceChunk = { type: "source-url", url: "https://example.com" }

    const input = streamFromChunks([
      textStart(),
      textDelta("visible"),
      toolChunk,
      sourceChunk,
      textDelta("<think>hidden</think>"),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(output.filter((c) => (c as Chunk).type === "tool-call")).toHaveLength(1)
    expect(output.filter((c) => (c as Chunk).type === "source-url")).toHaveLength(1)
  })

  // ── 10. Empty delta after stripping → not emitted ──

  it("does not emit empty text-delta when entire chunk is think content", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("<think>all hidden</think>"),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    // No text-delta should be emitted (entire content was think)
    expect(textDeltas(output)).toHaveLength(0)
    expect(allReasoning(output)).toBe("all hidden")
  })

  // ── 11. Standalone </think> without opening (edge) ──

  it("treats orphan </think> as literal text", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("text </think> more text"),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(allText(output)).toBe("text </think> more text")
    expect(reasoningDeltas(output)).toHaveLength(0)
  })

  // ── 12. Case sensitivity ──

  it("does not match <THINK> (case sensitive)", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("<THINK>not hidden</THINK>"),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(allText(output)).toBe("<THINK>not hidden</THINK>")
    expect(reasoningDeltas(output)).toHaveLength(0)
  })

  // ── 13. <think> with attributes → not matched ──

  it("does not match <think attr='x'> (strict tag match)", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("<think attr='x'>not hidden</think>"),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    // Should treat <think attr='x'> as literal text, not a think tag
    expect(allText(output)).toContain("<think attr='x'>")
    expect(reasoningDeltas(output)).toHaveLength(0)
  })

  // ── 14. Partial tag at end of stream (no close) ──

  it("flushes partial tag buffer as text when stream ends", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("text ending with <thi"),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(allText(output)).toBe("text ending with <thi")
    expect(reasoningDeltas(output)).toHaveLength(0)
  })

  // ── 15. < at exact chunk boundary ──

  it("handles < as last char of chunk followed by think> in next", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("hello<"),
      textDelta("think>reason</think> world"),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(allText(output)).toBe("hello world")
    expect(allReasoning(output)).toBe("reason")
  })

  // ── 16. Think block across many small chunks ──

  it("handles think content arriving character by character", async () => {
    const chars = "<think>AB</think>CD".split("")
    const input = streamFromChunks([
      textStart(),
      ...chars.map((ch) => textDelta(ch)),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(allText(output)).toBe("CD")
    expect(allReasoning(output)).toBe("AB")
  })

  // ── 17. Envelope: reasoning-start/reasoning-end emitted ──

  describe("reasoning envelope", () => {
    function reasoningStarts(output: unknown[]): Chunk[] {
      return output.filter((c) => (c as Chunk).type === "reasoning-start") as Chunk[]
    }

    function reasoningEnds(output: unknown[]): Chunk[] {
      return output.filter((c) => (c as Chunk).type === "reasoning-end") as Chunk[]
    }

    it("emits reasoning-start before first reasoning-delta and reasoning-end after last", async () => {
      const input = streamFromChunks([
        textStart(),
        textDelta("Before <think>internal</think> After"),
        textEnd(),
      ])

      const output = await collect(pipeThinkTagStrip(input))
      const types = output.map((c) => (c as Chunk).type)

      // Must have exactly 1 reasoning-start and 1 reasoning-end
      expect(reasoningStarts(output)).toHaveLength(1)
      expect(reasoningEnds(output)).toHaveLength(1)

      // Ordering: reasoning-start < reasoning-delta < reasoning-end
      const startIdx = types.indexOf("reasoning-start")
      const firstDeltaIdx = types.indexOf("reasoning-delta")
      const lastDeltaIdx = types.lastIndexOf("reasoning-delta")
      const endIdx = types.indexOf("reasoning-end")

      expect(startIdx).toBeLessThan(firstDeltaIdx)
      expect(lastDeltaIdx).toBeLessThan(endIdx)
    })

    it("uses unique ID distinct from text block ID", async () => {
      const input = streamFromChunks([
        textStart("txt-1"),
        textDelta("A <think>hidden</think> B", "txt-1"),
        textEnd("txt-1"),
      ])

      const output = await collect(pipeThinkTagStrip(input))

      const start = reasoningStarts(output)[0]
      const deltas = reasoningDeltas(output)
      const end = reasoningEnds(output)[0]

      // ID must NOT be the text block ID
      expect(start.id).not.toBe("txt-1")
      // All three share same ID
      expect(start.id).toBe(end.id)
      for (const d of deltas) {
        expect(d.id).toBe(start.id)
      }
      // ID must be non-empty
      expect(start.id!.length).toBeGreaterThan(0)
    })

    it("multiple think blocks produce separate envelope pairs with unique IDs", async () => {
      const input = streamFromChunks([
        textStart(),
        textDelta("A <think>first</think> B <think>second</think> C"),
        textEnd(),
      ])

      const output = await collect(pipeThinkTagStrip(input))

      expect(reasoningStarts(output)).toHaveLength(2)
      expect(reasoningEnds(output)).toHaveLength(2)

      // Each pair has a different ID
      const startIds = reasoningStarts(output).map((c) => c.id)
      expect(startIds[0]).not.toBe(startIds[1])

      // Each start matches its corresponding end
      const endIds = reasoningEnds(output).map((c) => c.id)
      expect(startIds[0]).toBe(endIds[0])
      expect(startIds[1]).toBe(endIds[1])
    })

    it("emits reasoning-end when stream ends inside think block", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      const input = streamFromChunks([
        textStart(),
        textDelta("Before <think>unclosed"),
      ])

      const output = await collect(pipeThinkTagStrip(input))

      expect(reasoningStarts(output)).toHaveLength(1)
      expect(reasoningEnds(output)).toHaveLength(1)

      // reasoning-end is after all reasoning-delta
      const types = output.map((c) => (c as Chunk).type)
      const lastDelta = types.lastIndexOf("reasoning-delta")
      const endIdx = types.lastIndexOf("reasoning-end")
      expect(lastDelta).toBeLessThan(endIdx)

      warnSpy.mockRestore()
    })

    it("empty think block emits reasoning-start and reasoning-end with no delta", async () => {
      const input = streamFromChunks([
        textStart(),
        textDelta("A <think></think> B"),
        textEnd(),
      ])

      const output = await collect(pipeThinkTagStrip(input))

      expect(reasoningStarts(output)).toHaveLength(1)
      expect(reasoningEnds(output)).toHaveLength(1)
      expect(reasoningDeltas(output)).toHaveLength(0)
      expect(allText(output)).toBe("A  B")
    })

    it("envelope ordering correct when tag resolved via resolveTagBuffer", async () => {
      const input = streamFromChunks([
        textStart(),
        textDelta("hello <thi"),
        textDelta("nk>reason</think> world"),
        textEnd(),
      ])

      const output = await collect(pipeThinkTagStrip(input))
      const types = output.map((c) => (c as Chunk).type)

      // Verify full sequence: text → start → delta → end → text
      const startIdx = types.indexOf("reasoning-start")
      const endIdx = types.indexOf("reasoning-end")
      const firstReasoningDelta = types.indexOf("reasoning-delta")

      expect(startIdx).toBeLessThan(firstReasoningDelta)
      expect(firstReasoningDelta).toBeLessThan(endIdx)

      // Text before and after intact
      expect(allText(output)).toBe("hello  world")
      expect(allReasoning(output)).toBe("reason")
    })

    it("emits reasoning-end before text-end when think block spans to text-end boundary", async () => {
      const input = streamFromChunks([
        textStart(),
        textDelta("<think>reasoning"),
        textEnd(),
      ])

      const output = await collect(pipeThinkTagStrip(input))
      const types = output.map((c) => (c as Chunk).type)

      // Must have envelope
      expect(reasoningStarts(output)).toHaveLength(1)
      expect(reasoningEnds(output)).toHaveLength(1)

      // reasoning-end must come BEFORE text-end
      const reasoningEndIdx = types.lastIndexOf("reasoning-end")
      const textEndIdx = types.indexOf("text-end")
      expect(reasoningEndIdx).toBeLessThan(textEndIdx)

      // reasoning content intact
      expect(allReasoning(output)).toBe("reasoning")
    })

    it("no envelope emitted when there are no think tags", async () => {
      const input = streamFromChunks([
        textStart(),
        textDelta("plain text without think"),
        textEnd(),
      ])

      const output = await collect(pipeThinkTagStrip(input))

      expect(reasoningStarts(output)).toHaveLength(0)
      expect(reasoningEnds(output)).toHaveLength(0)
    })
  })
})
