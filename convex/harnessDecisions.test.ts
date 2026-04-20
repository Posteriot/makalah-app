/**
 * Tests for convex/harnessDecisions.ts (Phase 8 Task 8.1b).
 *
 * Mock pattern matches convex/harnessRuns.test.ts and
 * convex/harnessEvents.test.ts: vi.mock("./authHelpers") + minimal
 * in-memory db with insert/get/patch/query support.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createDecision,
  resolveDecision,
  invalidateDecision,
  getDecision,
  getPendingByRun,
  getDecisionsByRun,
} from "./harnessDecisions"

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
          if (row) {
            // Convex patch semantics: undefined REMOVES the field
            for (const [k, v] of Object.entries(patch)) {
              if (v === undefined) {
                delete row[k]
              } else {
                row[k] = v
              }
            }
          }
        }
      },
      query(table: string) {
        const filters: Array<{ field: string; value: unknown }> = []
        let orderDir: "asc" | "desc" = "asc"
        let takeN: number | undefined

        const run = () => {
          const rows = ensureTable(table).filter(r =>
            filters.every(f => r[f.field] === f.value),
          )
          const sorted = [...rows].sort((a, b) => {
            const aVal = Number(a.requestedAt ?? 0)
            const bVal = Number(b.requestedAt ?? 0)
            return orderDir === "desc" ? bVal - aVal : aVal - bVal
          })
          return takeN !== undefined ? sorted.slice(0, takeN) : sorted
        }

        const builder = {
          withIndex(_idx: string, cb: (q: { eq: (f: string, v: unknown) => unknown }) => unknown) {
            const q = { eq(f: string, v: unknown) { filters.push({ field: f, value: v }); return q } }
            cb(q)
            return builder
          },
          order(d: "asc" | "desc") { orderDir = d; return builder },
          async take(n: number) { takeN = n; return run() },
          async first() { return run()[0] ?? null },
          async unique() {
            const all = run()
            if (all.length > 1) throw new Error("unique() returned multiple")
            return all[0] ?? null
          },
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

// Helper: seed a parent harnessRuns row
function seedRun(ctx: ReturnType<typeof createMockCtx>): string {
  const id = `harnessRuns_seed`
  ctx.tables.set("harnessRuns", [
    { _id: id, conversationId: "conversations_1", status: "running" },
  ])
  return id
}

const basePrompt = {
  title: "Approve tool invocation?",
  question: "Should the agent call tool X with args Y?",
  options: [
    { label: "Approve", recommended: true },
    { label: "Decline" },
  ],
  allowsFreeform: false,
}

describe("createDecision", () => {
  it("inserts pending row with auto-generated decisionId", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)

    const result = await asHandler(createDecision)(ctx, {
      runId,
      type: "approval",
      blocking: true,
      workflowStage: "drafting",
      prompt: basePrompt,
    })

    expect(result.decisionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

    const row = ctx.tables.get("harnessDecisions")![0]
    expect(row.decisionId).toBe(result.decisionId)
    expect(row.runId).toBe(runId)
    expect(row.type).toBe("approval")
    expect(row.status).toBe("pending")
    expect(row.blocking).toBe(true)
    expect(row.workflowStage).toBe("drafting")
    expect(row.requestedAt).toBeTypeOf("number")
    expect(row.resolvedAt).toBeUndefined()
  })

  it("uses provided decisionId verbatim", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)

    const result = await asHandler(createDecision)(ctx, {
      runId,
      type: "clarification",
      blocking: false,
      workflowStage: "intake",
      prompt: basePrompt,
      decisionId: "custom-decision-id-xyz",
    })

    expect(result.decisionId).toBe("custom-decision-id-xyz")
  })

  it("throws when run not found", async () => {
    const ctx = createMockCtx()
    await expect(
      asHandler(createDecision)(ctx, {
        runId: "harnessRuns_nonexistent",
        type: "approval",
        blocking: true,
        workflowStage: "drafting",
        prompt: basePrompt,
      })
    ).rejects.toThrow(/not found/)
  })
})

describe("resolveDecision", () => {
  it("patches status + resolvedAt + response for resolved outcome", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)
    const { decisionId } = await asHandler(createDecision)(ctx, {
      runId,
      type: "approval",
      blocking: true,
      workflowStage: "drafting",
      prompt: basePrompt,
    })

    await asHandler(resolveDecision)(ctx, {
      decisionId,
      resolution: "resolved",
      response: { decision: "approve", feedback: "looks good" },
    })

    const row = ctx.tables.get("harnessDecisions")![0]
    expect(row.status).toBe("resolved")
    expect(row.resolvedAt).toBeTypeOf("number")
    expect(row.response).toEqual({ decision: "approve", feedback: "looks good" })
  })

  it("supports declined resolution without response", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)
    const { decisionId } = await asHandler(createDecision)(ctx, {
      runId,
      type: "approval",
      blocking: true,
      workflowStage: "drafting",
      prompt: basePrompt,
    })

    await asHandler(resolveDecision)(ctx, {
      decisionId,
      resolution: "declined",
    })

    const row = ctx.tables.get("harnessDecisions")![0]
    expect(row.status).toBe("declined")
    expect(row.resolvedAt).toBeTypeOf("number")
  })

  it("throws when decision already resolved (idempotency guard)", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)
    const { decisionId } = await asHandler(createDecision)(ctx, {
      runId,
      type: "approval",
      blocking: true,
      workflowStage: "drafting",
      prompt: basePrompt,
    })
    await asHandler(resolveDecision)(ctx, { decisionId, resolution: "resolved" })

    await expect(
      asHandler(resolveDecision)(ctx, { decisionId, resolution: "declined" })
    ).rejects.toThrow(/cannot resolve decision with status=resolved/)
  })

  it("throws when decision not found", async () => {
    const ctx = createMockCtx()
    await expect(
      asHandler(resolveDecision)(ctx, {
        decisionId: "nonexistent-id",
        resolution: "resolved",
      })
    ).rejects.toThrow(/not found/)
  })
})

describe("invalidateDecision", () => {
  it("patches pending → invalidated", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)
    const { decisionId } = await asHandler(createDecision)(ctx, {
      runId,
      type: "approval",
      blocking: true,
      workflowStage: "drafting",
      prompt: basePrompt,
    })

    await asHandler(invalidateDecision)(ctx, { decisionId })

    const row = ctx.tables.get("harnessDecisions")![0]
    expect(row.status).toBe("invalidated")
    expect(row.resolvedAt).toBeTypeOf("number")
  })

  it("is idempotent for non-pending decisions (no-op)", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)
    const { decisionId } = await asHandler(createDecision)(ctx, {
      runId,
      type: "approval",
      blocking: true,
      workflowStage: "drafting",
      prompt: basePrompt,
    })
    await asHandler(resolveDecision)(ctx, { decisionId, resolution: "resolved" })

    // Should not throw, should not change anything
    await asHandler(invalidateDecision)(ctx, { decisionId })

    const row = ctx.tables.get("harnessDecisions")![0]
    expect(row.status).toBe("resolved") // unchanged
  })
})

describe("getDecision", () => {
  it("returns row by decisionId", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)
    const { decisionId } = await asHandler(createDecision)(ctx, {
      runId,
      type: "approval",
      blocking: true,
      workflowStage: "drafting",
      prompt: basePrompt,
    })

    const row = await asHandler(getDecision)(ctx, { decisionId })
    expect(row?.decisionId).toBe(decisionId)
  })

  it("returns null when decisionId not found", async () => {
    const ctx = createMockCtx()
    const row = await asHandler(getDecision)(ctx, { decisionId: "nope" })
    expect(row).toBeNull()
  })

  it("returns null when access denied", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)
    const { decisionId } = await asHandler(createDecision)(ctx, {
      runId,
      type: "approval",
      blocking: true,
      workflowStage: "drafting",
      prompt: basePrompt,
    })
    mockedGetConversationIfOwner.mockResolvedValueOnce(null as never)

    const row = await asHandler(getDecision)(ctx, { decisionId })
    expect(row).toBeNull()
  })
})

describe("getPendingByRun", () => {
  it("returns latest pending decision", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)
    await asHandler(createDecision)(ctx, {
      runId,
      type: "approval",
      blocking: true,
      workflowStage: "drafting",
      prompt: basePrompt,
      decisionId: "d-1",
    })
    await new Promise(r => setTimeout(r, 2))
    await asHandler(createDecision)(ctx, {
      runId,
      type: "approval",
      blocking: true,
      workflowStage: "drafting",
      prompt: basePrompt,
      decisionId: "d-2",
    })

    const result = await asHandler(getPendingByRun)(ctx, { runId })
    expect(result?.decisionId).toBe("d-2") // latest
  })

  it("returns null when no pending decisions exist (after resolution)", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)
    const { decisionId } = await asHandler(createDecision)(ctx, {
      runId,
      type: "approval",
      blocking: true,
      workflowStage: "drafting",
      prompt: basePrompt,
    })
    await asHandler(resolveDecision)(ctx, { decisionId, resolution: "resolved" })

    const result = await asHandler(getPendingByRun)(ctx, { runId })
    expect(result).toBeNull()
  })

  it("returns null on missing run", async () => {
    const ctx = createMockCtx()
    const result = await asHandler(getPendingByRun)(ctx, { runId: "harnessRuns_x" })
    expect(result).toBeNull()
  })
})

describe("getDecisionsByRun", () => {
  it("returns all decisions ordered desc by requestedAt", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)
    await asHandler(createDecision)(ctx, {
      runId, type: "approval", blocking: true,
      workflowStage: "intake", prompt: basePrompt, decisionId: "d-1",
    })
    await new Promise(r => setTimeout(r, 2))
    await asHandler(createDecision)(ctx, {
      runId, type: "clarification", blocking: false,
      workflowStage: "drafting", prompt: basePrompt, decisionId: "d-2",
    })
    await new Promise(r => setTimeout(r, 2))
    await asHandler(createDecision)(ctx, {
      runId, type: "selection", blocking: true,
      workflowStage: "drafting", prompt: basePrompt, decisionId: "d-3",
    })

    const rows = await asHandler(getDecisionsByRun)(ctx, { runId })
    expect(rows).toHaveLength(3)
    expect((rows as Array<{ decisionId: string }>).map(r => r.decisionId)).toEqual([
      "d-3", "d-2", "d-1",
    ])
  })

  it("respects limit", async () => {
    const ctx = createMockCtx()
    const runId = seedRun(ctx)
    for (let i = 0; i < 5; i++) {
      await asHandler(createDecision)(ctx, {
        runId, type: "approval", blocking: true,
        workflowStage: "drafting", prompt: basePrompt,
        decisionId: `d-${i}`,
      })
    }

    const rows = await asHandler(getDecisionsByRun)(ctx, { runId, limit: 2 })
    expect(rows).toHaveLength(2)
  })

  it("returns [] on missing run", async () => {
    const ctx = createMockCtx()
    const result = await asHandler(getDecisionsByRun)(ctx, { runId: "harnessRuns_x" })
    expect(result).toEqual([])
  })
})
