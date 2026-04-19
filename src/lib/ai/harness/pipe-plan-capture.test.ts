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

function textChunk(text: string) {
  return { type: "text-delta", textDelta: text }
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
      textChunk("Hello world\n"),
      textChunk(`${PLAN_FENCE_OPEN}\n${VALID_PLAN_YAML}\n\`\`\`\nAfter fence`),
    ])

    const output = await collectOutput(pipePlanCapture(input))

    // Should have text before, plan data part, text after
    const planParts = output.filter(
      (p: any) => p.type === PLAN_DATA_PART_TYPE
    )
    expect(planParts).toHaveLength(1)

    const plan = (planParts[0] as any).data.spec
    expect(plan.stage).toBe("research")
    expect(plan.summary).toBe("Investigating the problem")
    expect(plan.tasks).toHaveLength(2)

    // Text before and after should be emitted
    const textParts = output.filter((p: any) => p.type === "text-delta")
    const allText = textParts.map((p: any) => p.textDelta).join("")
    expect(allText).toContain("Hello world")
    expect(allText).toContain("After fence")
  })

  it("handles close fence split across chunks (\\n in chunk N, ``` in chunk N+1)", async () => {
    const input = streamFromChunks([
      textChunk(`${PLAN_FENCE_OPEN}\n${VALID_PLAN_YAML}\n`),
      textChunk("```\nDone"),
    ])

    const output = await collectOutput(pipePlanCapture(input))

    const planParts = output.filter(
      (p: any) => p.type === PLAN_DATA_PART_TYPE
    )
    expect(planParts).toHaveLength(1)

    const plan = (planParts[0] as any).data.spec
    expect(plan.stage).toBe("research")
    expect(plan.tasks).toHaveLength(2)
  })

  it("re-emits content as text when stream ends in fenced state (no close fence)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const rawContent = "this is not valid yaml plan: [[[{"
    const input = streamFromChunks([
      textChunk(`${PLAN_FENCE_OPEN}\n${rawContent}`),
    ])

    const output = await collectOutput(pipePlanCapture(input))

    // No plan data part — parse fails
    const planParts = output.filter(
      (p: any) => p.type === PLAN_DATA_PART_TYPE
    )
    expect(planParts).toHaveLength(0)

    // Content should be re-emitted as text
    const textParts = output.filter((p: any) => p.type === "text-delta")
    const allText = textParts.map((p: any) => p.textDelta).join("")
    expect(allText).toContain(rawContent)

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
      textChunk(`${PLAN_FENCE_OPEN}\n${VALID_PLAN_YAML}`),
      // Stream ends — no close fence
    ])

    const output = await collectOutput(pipePlanCapture(input))

    const planParts = output.filter(
      (p: any) => p.type === PLAN_DATA_PART_TYPE
    )
    expect(planParts).toHaveLength(1)

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
      textChunk("Some intro text\n"),
      textChunk(`${VALID_PLAN_YAML}\n`),
      textChunk("More text after plan\n"),
    ])

    const output = await collectOutput(pipePlanCapture(input))

    const planParts = output.filter(
      (p: any) => p.type === PLAN_DATA_PART_TYPE
    )
    expect(planParts).toHaveLength(1)

    const plan = (planParts[0] as any).data.spec
    expect(plan.stage).toBe("research")
  })

  it("passes non-text chunks through untouched in all states", async () => {
    const toolCallChunk = { type: "tool-call", toolName: "search", args: {} }
    const customChunk = { type: "step-finish", finishReason: "stop" }

    const input = streamFromChunks([
      toolCallChunk,
      textChunk("Hello"),
      customChunk,
      textChunk(`${PLAN_FENCE_OPEN}\nstage: x\n`),
      toolCallChunk,
      // stream ends in fenced state — non-text chunks should still have passed through
    ])

    const output = await collectOutput(pipePlanCapture(input))

    const toolCalls = output.filter((p: any) => p.type === "tool-call")
    expect(toolCalls).toHaveLength(2)

    const stepFinishes = output.filter((p: any) => p.type === "step-finish")
    expect(stepFinishes).toHaveLength(1)
  })
})
