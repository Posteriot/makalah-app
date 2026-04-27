import { describe, it, expect, vi } from "vitest"
import { pipePlanCapture } from "./pipe-plan-capture"
import { PLAN_DATA_PART_TYPE, PLAN_FENCE_OPEN } from "./plan-spec"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function streamFromChunks(chunks: unknown[]): ReadableStream<unknown> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk)
      }
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

function textChunk(text: string, id = "t1") {
  return { type: "text-delta", id, delta: text }
}

async function collectOutput(stream: ReadableStream<unknown>): Promise<unknown[]> {
  const reader = stream.getReader()
  const parts: unknown[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    parts.push(value)
  }
  return parts
}

const VALID_PLAN_YAML = [
  "stage: research",
  "summary: Investigating the problem",
  "tasks:",
  "  - label: Read docs",
  "    status: pending",
  "  - label: Write code",
  "    status: in-progress",
].join("\n")

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("pipePlanCapture", () => {
  it("parses a normal fenced plan-spec with close fence in same chunk", async () => {
    const input = streamFromChunks([
      textStart(),
      textChunk("Hello world\n"),
      textChunk(`${PLAN_FENCE_OPEN}\n${VALID_PLAN_YAML}\n\`\`\`\nAfter fence`),
      textEnd(),
    ])

    const output = await collectOutput(pipePlanCapture(input))

    // Should have text before, plan data part, text after
    const planParts = output.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.type === PLAN_DATA_PART_TYPE
    )
    expect(planParts).toHaveLength(1)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plan = (planParts[0] as any).data.spec
    expect(plan.stage).toBe("research")
    expect(plan.summary).toBe("Investigating the problem")
    expect(plan.tasks).toHaveLength(2)

    // Text before and after should be emitted with correct id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textParts = output.filter((p: any) => p.type === "text-delta")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allText = textParts.map((p: any) => p.delta).join("")
    expect(allText).toContain("Hello world")
    expect(allText).toContain("After fence")
    // Every emitted text-delta must carry the block id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of textParts) expect((p as any).id).toBe("t1")
  })

  it("handles close fence split across chunks (\\n in chunk N, ``` in chunk N+1)", async () => {
    const input = streamFromChunks([
      textStart(),
      textChunk(`${PLAN_FENCE_OPEN}\n${VALID_PLAN_YAML}\n`),
      textChunk("```\nDone"),
      textEnd(),
    ])

    const output = await collectOutput(pipePlanCapture(input))

    const planParts = output.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.type === PLAN_DATA_PART_TYPE
    )
    expect(planParts).toHaveLength(1)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plan = (planParts[0] as any).data.spec
    expect(plan.stage).toBe("research")
    expect(plan.tasks).toHaveLength(2)
  })

  it("re-emits content as text when stream ends in fenced state (no close fence)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const rawContent = "this is not valid yaml plan: [[[{"
    const input = streamFromChunks([
      textStart(),
      textChunk(`${PLAN_FENCE_OPEN}\n${rawContent}`),
    ])

    const output = await collectOutput(pipePlanCapture(input))

    // No plan data part — parse fails
    const planParts = output.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.type === PLAN_DATA_PART_TYPE
    )
    expect(planParts).toHaveLength(0)

    // Content should be re-emitted as text with id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textParts = output.filter((p: any) => p.type === "text-delta")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allText = textParts.map((p: any) => p.delta).join("")
    expect(allText).toContain(rawContent)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of textParts) expect((p as any).id).toBe("t1")

    // Warning should be logged
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[PLAN-CAPTURE] stream ended in fenced state"),
      // no second arg check needed
    )

    warnSpy.mockRestore()
  })

  it("parses plan data when stream ends in fenced state with valid YAML", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const input = streamFromChunks([
      textStart(),
      textChunk(`${PLAN_FENCE_OPEN}\n${VALID_PLAN_YAML}`),
      // Stream ends — no close fence
    ])

    const output = await collectOutput(pipePlanCapture(input))

    const planParts = output.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.type === PLAN_DATA_PART_TYPE
    )
    expect(planParts).toHaveLength(1)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plan = (planParts[0] as any).data.spec
    expect(plan.stage).toBe("research")
    expect(plan.tasks).toHaveLength(2)

    // Warning logged with "parsed"
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("parsed"),
    )

    warnSpy.mockRestore()
  })

  it("detects unfenced plan-spec (regression guard)", async () => {
    const input = streamFromChunks([
      textStart(),
      textChunk("Some intro text\n"),
      textChunk(`${VALID_PLAN_YAML}\n`),
      textChunk("More text after plan\n"),
      textEnd(),
    ])

    const output = await collectOutput(pipePlanCapture(input))

    const planParts = output.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.type === PLAN_DATA_PART_TYPE
    )
    expect(planParts).toHaveLength(1)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plan = (planParts[0] as any).data.spec
    expect(plan.stage).toBe("research")
  })

  it("does not falsely capture normal prose starting with 'stage: '", async () => {
    const proseText = "stage: three of the experiment involved testing multiple variables\nThe results showed significant improvement across all groups."
    const input = streamFromChunks([
      textStart(),
      textChunk(proseText),
      textEnd(),
    ])
    const output = await collectOutput(pipePlanCapture(input))

    // Should NOT produce a plan data part
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const planParts = output.filter((p: any) => p.type === PLAN_DATA_PART_TYPE)
    expect(planParts).toHaveLength(0)

    // All original text should pass through with id
    const allText = output
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((p: any) => p.type === "text-delta")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => p.delta)
      .join("")
    expect(allText).toContain("stage: three")
    expect(allText).toContain("significant improvement")
  })

  it("passes non-text chunks through untouched in all states", async () => {
    const toolCallChunk = { type: "tool-call", toolName: "search", args: {} }
    const customChunk = { type: "step-finish", finishReason: "stop" }

    const input = streamFromChunks([
      toolCallChunk,
      textStart(),
      textChunk("Hello"),
      customChunk,
      textChunk(`${PLAN_FENCE_OPEN}\nstage: x\n`),
      toolCallChunk,
      // stream ends in fenced state — non-text chunks should still have passed through
    ])

    const output = await collectOutput(pipePlanCapture(input))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolCalls = output.filter((p: any) => p.type === "tool-call")
    expect(toolCalls).toHaveLength(2)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stepFinishes = output.filter((p: any) => p.type === "step-finish")
    expect(stepFinishes).toHaveLength(1)
  })

  it("emits text-delta with id matching the active text block", async () => {
    const input = streamFromChunks([
      textStart("block-42"),
      textChunk("Hello world", "block-42"),
      textEnd("block-42"),
    ])

    const output = await collectOutput(pipePlanCapture(input))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textParts = output.filter((p: any) => p.type === "text-delta")
    expect(textParts.length).toBeGreaterThan(0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of textParts) expect((p as any).id).toBe("block-42")
  })

  it("flushes buffer before forwarding text-end", async () => {
    const input = streamFromChunks([
      textStart(),
      textChunk("buffered content"),
      textEnd(),
    ])

    const output = await collectOutput(pipePlanCapture(input))

    // text-end must come AFTER all text-delta chunks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const types = output.map((p: any) => p.type)
    const lastTextDeltaIdx = types.lastIndexOf("text-delta")
    const textEndIdx = types.indexOf("text-end")
    expect(lastTextDeltaIdx).toBeLessThan(textEndIdx)
  })
})
