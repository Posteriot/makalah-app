/**
 * Tests for convex/harnessRunSteps.ts mutations and queries.
 *
 * Backfill from Phase 6 audit (Codex finding LOW 1):
 *   "Coverage test untuk persistence layer masih bolong di harnessRunSteps.
 *    Mutation inti step lifecycle ada, tapi repo tidak punya test langsung
 *    untuk create/complete/query step."
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createStep,
  completeStep,
  getStepsByRun,
  getCurrentStep,
} from "./harnessRunSteps"

vi.mock("./authHelpers", () => ({
  requireConversationOwner: vi.fn(),
  getConversationIfOwner: vi.fn(),
}))

import { requireConversationOwner, getConversationIfOwner } from "./authHelpers"

const mockedRequireConversationOwner = vi.mocked(requireConversationOwner)
const mockedGetConversationIfOwner = vi.mocked(getConversationIfOwner)

type Record = { _id: string; [key: string]: unknown }

function createMockCtx() {
  const tables = new Map<string, Record[]>()
  let seq = 0
  const ensureTable = (n: string) => {
    if (!tables.has(n)) tables.set(n, [])
    return tables.get(n)!
  }

  const ctx = {
    db: {
      async insert(table: string, doc: Record) {
        const id = `${table}_${++seq}`
        ensureTable(table).push({ ...doc, _id: id })
        return id
      },
      async get(id: string) {
        for (const rows of tables.values()) {
          const f = rows.find(r => r._id === id)
          if (f) return f
        }
        return null
      },
      async patch(id: string, patch: Record) {
        for (const rows of tables.values()) {
          const row = rows.find(r => r._id === id)
          if (row) Object.assign(row, patch)
        }
      },
      query(table: string) {
        const filters: Array<{ field: string; value: unknown }> = []
        let orderDir: "asc" | "desc" = "asc"

        const run = () => {
          const rows = ensureTable(table).filter(r =>
            filters.every(f => r[f.field] === f.value),
          )
          return [...rows].sort((a, b) => {
            const aVal = Number(a.stepIndex ?? 0)
            const bVal = Number(b.stepIndex ?? 0)
            return orderDir === "desc" ? bVal - aVal : aVal - bVal
          })
        }

        const builder = {
          withIndex(_idx: string, cb: (q: { eq: (f: string, v: unknown) => unknown }) => unknown) {
            const q = { eq(field: string, value: unknown) { filters.push({ field, value }); return q } }
            cb(q)
            return builder
          },
          order(d: "asc" | "desc") { orderDir = d; return builder },
          async collect() { return run() },
        }
        return builder
      },
    },
    tables,
  }
  return ctx
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asHandler(fn: any): (ctx: any, args: any) => Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (fn as { _handler: (ctx: any, args: any) => Promise<any> })._handler
}

beforeEach(() => {
  mockedRequireConversationOwner.mockReset()
  mockedGetConversationIfOwner.mockReset()
  mockedRequireConversationOwner.mockResolvedValue({ conversation: { _id: "conversations_1" } } as never)
  mockedGetConversationIfOwner.mockResolvedValue({ conversation: { _id: "conversations_1" } } as never)
})

// Helper: seed a parent harnessRuns row that owns the conversation
function seedRun(
  ctx: ReturnType<typeof createMockCtx>,
  runOverrides: Partial<Record> = {},
): string {
  const id = `harnessRuns_seed`
  ctx.tables.set("harnessRuns", [
    {
      conversationId: "conversations_1",
      stepNumber: 0,
      ...runOverrides,
      _id: id,
    },
  ])
  return id
}

describe("createStep", () => {
  it("inserts a row with status=running, empty toolCalls, and the supplied stepIndex/startedAt", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)

    const result = await asHandler(createStep)(ctx, {
      runId,
      stepIndex: 1,
      startedAt: 12345,
    })

    expect(result.stepId).toMatch(/^harnessRunSteps_/)
    const step = ctx.tables.get("harnessRunSteps")![0]
    expect(step.runId).toBe(runId)
    expect(step.stepIndex).toBe(1)
    expect(step.status).toBe("running")
    expect(step.toolCalls).toEqual([])
    expect(step.startedAt).toBe(12345)
    expect(step.executorResultSummary).toBeUndefined()
    expect(step.verificationSummary).toBeUndefined()
  })

  it("throws when run is missing (no partial state created)", async () => {
    const ctx = createMockCtx()
    await expect(
      asHandler(createStep)(ctx, { runId: "harnessRuns_nonexistent", stepIndex: 1, startedAt: 1 })
    ).rejects.toThrow(/harness run not found/)
    expect(ctx.tables.get("harnessRunSteps") ?? []).toHaveLength(0)
  })

  it("delegates ownership check to requireConversationOwner", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)

    await asHandler(createStep)(ctx, { runId, stepIndex: 1, startedAt: 1 })

    expect(mockedRequireConversationOwner).toHaveBeenCalledTimes(1)
    expect(mockedRequireConversationOwner).toHaveBeenCalledWith(
      expect.anything(),
      "conversations_1",
    )
  })
})

describe("completeStep", () => {
  it("patches status, toolCalls, completedAt; conditionally patches summaries", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)
    const { stepId } = await asHandler(createStep)(ctx, { runId, stepIndex: 1, startedAt: 1 })

    await asHandler(completeStep)(ctx, {
      stepId,
      status: "completed",
      executorResultSummary: { finishReason: "stop", inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      verificationSummary: {
        canContinue: true,
        mustPause: false,
        canComplete: true,
        completionBlockers: [],
        leakageDetected: false,
        artifactChainComplete: true,
        planComplete: true,
        streamContentOverridden: false,
      },
      toolCalls: [{ toolName: "createArtifact", toolCallId: "call_1", resultStatus: "success" }],
      completedAt: 99999,
    })

    const step = ctx.tables.get("harnessRunSteps")![0]
    expect(step.status).toBe("completed")
    expect(step.completedAt).toBe(99999)
    expect(step.toolCalls).toEqual([
      { toolName: "createArtifact", toolCallId: "call_1", resultStatus: "success" },
    ])
    expect(step.executorResultSummary).toEqual({
      finishReason: "stop",
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    })
    expect(step.verificationSummary).toBeDefined()
  })

  it("supports failed status without summaries", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)
    const { stepId } = await asHandler(createStep)(ctx, { runId, stepIndex: 1, startedAt: 1 })

    await asHandler(completeStep)(ctx, {
      stepId,
      status: "failed",
      toolCalls: [],
      completedAt: 100,
    })

    const step = ctx.tables.get("harnessRunSteps")![0]
    expect(step.status).toBe("failed")
    // Summaries remain undefined because they weren't supplied.
    expect(step.executorResultSummary).toBeUndefined()
    expect(step.verificationSummary).toBeUndefined()
  })

  it("throws when step not found", async () => {
    const ctx = createMockCtx()
    await expect(
      asHandler(completeStep)(ctx, {
        stepId: "harnessRunSteps_nonexistent",
        status: "completed",
        toolCalls: [],
        completedAt: 1,
      })
    ).rejects.toThrow(/harness run step not found/)
  })

  it("throws when parent run not found (orphan step)", async () => {
    const ctx = createMockCtx()
    // Insert a step whose runId points to nothing
    ctx.tables.set("harnessRunSteps", [{
      _id: "harnessRunSteps_orphan",
      runId: "harnessRuns_missing",
      stepIndex: 1,
      status: "running",
      toolCalls: [],
      startedAt: 1,
    }])

    await expect(
      asHandler(completeStep)(ctx, {
        stepId: "harnessRunSteps_orphan",
        status: "completed",
        toolCalls: [],
        completedAt: 1,
      })
    ).rejects.toThrow(/harness run not found/)
  })
})

describe("getStepsByRun", () => {
  it("returns steps for a run, ordered by stepIndex ascending", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)

    await asHandler(createStep)(ctx, { runId, stepIndex: 3, startedAt: 30 })
    await asHandler(createStep)(ctx, { runId, stepIndex: 1, startedAt: 10 })
    await asHandler(createStep)(ctx, { runId, stepIndex: 2, startedAt: 20 })

    const steps = await asHandler(getStepsByRun)(ctx, { runId })
    expect(steps).toHaveLength(3)
    expect((steps as Array<{ stepIndex: number }>).map(s => s.stepIndex)).toEqual([1, 2, 3])
  })

  it("returns [] when run does not exist", async () => {
    const ctx = createMockCtx()
    const result = await asHandler(getStepsByRun)(ctx, { runId: "harnessRuns_nonexistent" })
    expect(result).toEqual([])
  })

  it("returns [] when caller does not own the conversation", async () => {
    const ctx = createMockCtx()
    seedRun(ctx)
    mockedGetConversationIfOwner.mockResolvedValueOnce(null as never)
    const result = await asHandler(getStepsByRun)(ctx, { runId: "harnessRuns_seed" })
    expect(result).toEqual([])
  })
})

describe("getCurrentStep", () => {
  it("returns the step matching harnessRuns.currentStepId", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)
    const { stepId } = await asHandler(createStep)(ctx, { runId, stepIndex: 1, startedAt: 1 })

    // Manually set currentStepId on the run
    const run = ctx.tables.get("harnessRuns")!.find(r => r._id === runId)!
    run.currentStepId = stepId

    const result = await asHandler(getCurrentStep)(ctx, { runId })
    expect(result?._id).toBe(stepId)
  })

  it("returns null when run has no currentStepId", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)

    const result = await asHandler(getCurrentStep)(ctx, { runId })
    expect(result).toBeNull()
  })

  it("returns null when run does not exist", async () => {
    const ctx = createMockCtx()
    const result = await asHandler(getCurrentStep)(ctx, { runId: "harnessRuns_nonexistent" })
    expect(result).toBeNull()
  })

  it("returns null when caller does not own the conversation", async () => {
    const ctx = createMockCtx()
    seedRun(ctx)
    mockedGetConversationIfOwner.mockResolvedValueOnce(null as never)
    const result = await asHandler(getCurrentStep)(ctx, { runId: "harnessRuns_seed" })
    expect(result).toBeNull()
  })
})
