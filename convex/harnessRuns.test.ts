/**
 * Tests for convex/harnessRuns.ts mutations and queries (Phase 6 Task 6.2a).
 *
 * Pattern: mock authHelpers + minimal in-memory db. Handlers are extracted
 * via the `_handler` cast, matching convex/paperSessions.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createRun,
  updateRunStatus,
  linkPaperSession,
  recordPolicyState,
  incrementStepNumber,
  setCurrentStep,
  completeRun,
  getRunByConversation,
  getRunByOwnerToken,
} from "./harnessRuns"

vi.mock("./authHelpers", () => ({
  requireAuthUserId: vi.fn(),
  requireConversationOwner: vi.fn(),
  getConversationIfOwner: vi.fn(),
}))

import { requireAuthUserId, requireConversationOwner, getConversationIfOwner } from "./authHelpers"

const mockedRequireAuthUserId = vi.mocked(requireAuthUserId)
const mockedRequireConversationOwner = vi.mocked(requireConversationOwner)
const mockedGetConversationIfOwner = vi.mocked(getConversationIfOwner)

// ───────────────────────────────────────────────────────────────
// Mock db with minimal insert/get/patch/query support
// ───────────────────────────────────────────────────────────────

type Record = { _id: string; [key: string]: unknown }

function createMockCtx() {
  const tables = new Map<string, Record[]>()
  let seq = 0

  const ensureTable = (name: string): Record[] => {
    if (!tables.has(name)) tables.set(name, [])
    return tables.get(name)!
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
          const found = rows.find(r => r._id === id)
          if (found) return found
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
            const aVal = Number(a.startedAt ?? a._creationTime ?? 0)
            const bVal = Number(b.startedAt ?? b._creationTime ?? 0)
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
          filter(_cb: unknown) { return builder },
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

// Cast helper to extract Convex handler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asHandler(fn: any): (ctx: any, args: any) => Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (fn as { _handler: (ctx: any, args: any) => Promise<any> })._handler
}

// ───────────────────────────────────────────────────────────────
// Tests
// ───────────────────────────────────────────────────────────────

beforeEach(() => {
  mockedRequireAuthUserId.mockReset()
  mockedRequireConversationOwner.mockReset()
  mockedGetConversationIfOwner.mockReset()
  // Default: auth passes
  mockedRequireAuthUserId.mockResolvedValue(undefined as never)
  mockedRequireConversationOwner.mockResolvedValue({ conversation: { _id: "conversations_1" } } as never)
  mockedGetConversationIfOwner.mockResolvedValue({ conversation: { _id: "conversations_1" } } as never)
})

describe("createRun", () => {
  it("inserts harnessRuns row with running status, stepNumber=0, returns runId + ownerToken", async () => {
    const ctx = createMockCtx()
    const result = await asHandler(createRun)(ctx, {
      conversationId: "conversations_1",
      userId: "users_1",
      workflowStage: "intake",
      workflowStatus: "running",
    })

    expect(result.runId).toMatch(/^harnessRuns_/)
    expect(result.ownerToken).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

    const rows = ctx.tables.get("harnessRuns")!
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe("running")
    expect(rows[0].stepNumber).toBe(0)
    expect(rows[0].workflowStage).toBe("intake")
    expect(rows[0].workflowStatus).toBe("running")
    expect(rows[0].startedAt).toBeTypeOf("number")
    expect(rows[0].updatedAt).toBeTypeOf("number")
  })

  it("includes paperSessionId when provided", async () => {
    const ctx = createMockCtx()
    await asHandler(createRun)(ctx, {
      conversationId: "conversations_1",
      userId: "users_1",
      paperSessionId: "paperSessions_1",
      workflowStage: "gagasan",
      workflowStatus: "running",
    })

    const row = ctx.tables.get("harnessRuns")![0]
    expect(row.paperSessionId).toBe("paperSessions_1")
  })

  it("generates unique ownerTokens across multiple invocations", async () => {
    const ctx = createMockCtx()
    const tokens = new Set<string>()
    for (let i = 0; i < 20; i++) {
      const r = await asHandler(createRun)(ctx, {
        conversationId: "conversations_1",
        userId: "users_1",
        workflowStage: "intake",
        workflowStatus: "running",
      })
      tokens.add(r.ownerToken)
    }
    expect(tokens.size).toBe(20)
  })
})

describe("incrementStepNumber", () => {
  it("monotonically increments stepNumber from 0", async () => {
    const ctx = createMockCtx()
    const { runId } = await asHandler(createRun)(ctx, {
      conversationId: "conversations_1",
      userId: "users_1",
      workflowStage: "intake",
      workflowStatus: "running",
    })

    const r1 = await asHandler(incrementStepNumber)(ctx, { runId })
    const r2 = await asHandler(incrementStepNumber)(ctx, { runId })
    const r3 = await asHandler(incrementStepNumber)(ctx, { runId })

    expect(r1.stepNumber).toBe(1)
    expect(r2.stepNumber).toBe(2)
    expect(r3.stepNumber).toBe(3)

    const row = ctx.tables.get("harnessRuns")![0]
    expect(row.stepNumber).toBe(3)
  })

  it("throws when run not found", async () => {
    const ctx = createMockCtx()
    await expect(
      asHandler(incrementStepNumber)(ctx, { runId: "harnessRuns_nonexistent" })
    ).rejects.toThrow(/not found/)
  })
})

describe("updateRunStatus", () => {
  it("patches status + updatedAt; preserves other fields", async () => {
    const ctx = createMockCtx()
    const { runId } = await asHandler(createRun)(ctx, {
      conversationId: "conversations_1",
      userId: "users_1",
      workflowStage: "intake",
      workflowStatus: "running",
    })
    const beforeUpdatedAt = ctx.tables.get("harnessRuns")![0].updatedAt as number

    await new Promise(r => setTimeout(r, 5)) // ensure clock tick

    await asHandler(updateRunStatus)(ctx, {
      runId,
      status: "paused",
      pausedAt: 12345,
    })

    const row = ctx.tables.get("harnessRuns")![0]
    expect(row.status).toBe("paused")
    expect(row.pausedAt).toBe(12345)
    expect(row.workflowStage).toBe("intake") // preserved
    expect(Number(row.updatedAt)).toBeGreaterThan(beforeUpdatedAt)
  })

  it("includes failure fields when provided", async () => {
    const ctx = createMockCtx()
    const { runId } = await asHandler(createRun)(ctx, {
      conversationId: "conversations_1",
      userId: "users_1",
      workflowStage: "intake",
      workflowStatus: "running",
    })

    await asHandler(updateRunStatus)(ctx, {
      runId,
      status: "failed",
      failureClass: "tool_failure",
      failureReason: "tool xyz threw",
    })

    const row = ctx.tables.get("harnessRuns")![0]
    expect(row.failureClass).toBe("tool_failure")
    expect(row.failureReason).toBe("tool xyz threw")
  })
})

describe("linkPaperSession", () => {
  it("patches paperSessionId on the run", async () => {
    const ctx = createMockCtx()
    const { runId } = await asHandler(createRun)(ctx, {
      conversationId: "conversations_1",
      userId: "users_1",
      workflowStage: "intake",
      workflowStatus: "running",
    })

    await asHandler(linkPaperSession)(ctx, { runId, paperSessionId: "paperSessions_42" })

    expect(ctx.tables.get("harnessRuns")![0].paperSessionId).toBe("paperSessions_42")
  })
})

describe("recordPolicyState", () => {
  it("writes the policyState sub-object verbatim", async () => {
    const ctx = createMockCtx()
    const { runId } = await asHandler(createRun)(ctx, {
      conversationId: "conversations_1",
      userId: "users_1",
      workflowStage: "intake",
      workflowStatus: "running",
    })

    const policyState = {
      approvalMode: "default" as const,
      currentBoundary: "read_only" as const,
      lastPolicyReason: "boundary=normal enforcers=none",
      updatedAt: 99999,
    }

    await asHandler(recordPolicyState)(ctx, { runId, policyState })

    expect(ctx.tables.get("harnessRuns")![0].policyState).toEqual(policyState)
  })
})

describe("setCurrentStep", () => {
  it("patches currentStepId", async () => {
    const ctx = createMockCtx()
    const { runId } = await asHandler(createRun)(ctx, {
      conversationId: "conversations_1",
      userId: "users_1",
      workflowStage: "intake",
      workflowStatus: "running",
    })

    await asHandler(setCurrentStep)(ctx, { runId, stepId: "harnessRunSteps_5" })

    expect(ctx.tables.get("harnessRuns")![0].currentStepId).toBe("harnessRunSteps_5")
  })
})

describe("completeRun", () => {
  it("sets status=completed + completedAt", async () => {
    const ctx = createMockCtx()
    const { runId } = await asHandler(createRun)(ctx, {
      conversationId: "conversations_1",
      userId: "users_1",
      workflowStage: "intake",
      workflowStatus: "running",
    })

    await asHandler(completeRun)(ctx, { runId })

    const row = ctx.tables.get("harnessRuns")![0]
    expect(row.status).toBe("completed")
    expect(row.completedAt).toBeTypeOf("number")
  })
})

describe("getRunByConversation", () => {
  it("returns latest run for the conversation (descending order)", async () => {
    const ctx = createMockCtx()
    // Create 3 runs back-to-back; mock db assigns startedAt = Date.now() at creation
    const r1 = await asHandler(createRun)(ctx, {
      conversationId: "conversations_1", userId: "users_1",
      workflowStage: "intake", workflowStatus: "running",
    })
    await new Promise(r => setTimeout(r, 2))
    const r2 = await asHandler(createRun)(ctx, {
      conversationId: "conversations_1", userId: "users_1",
      workflowStage: "gagasan", workflowStatus: "running",
    })
    await new Promise(r => setTimeout(r, 2))
    const r3 = await asHandler(createRun)(ctx, {
      conversationId: "conversations_1", userId: "users_1",
      workflowStage: "topik", workflowStatus: "running",
    })

    const result = await asHandler(getRunByConversation)(ctx, { conversationId: "conversations_1" })

    expect(result?._id).toBe(r3.runId)
    // Sanity: r1 + r2 still exist
    expect(ctx.tables.get("harnessRuns")).toHaveLength(3)
    expect([r1.runId, r2.runId, r3.runId]).toContain(result?._id)
  })

  it("returns null when caller does not own the conversation", async () => {
    const ctx = createMockCtx()
    mockedGetConversationIfOwner.mockResolvedValueOnce(null as never)

    const result = await asHandler(getRunByConversation)(ctx, { conversationId: "conversations_1" })
    expect(result).toBeNull()
  })
})

describe("getRunByOwnerToken", () => {
  it("returns the run matching the owner token", async () => {
    const ctx = createMockCtx()
    const { runId, ownerToken } = await asHandler(createRun)(ctx, {
      conversationId: "conversations_1", userId: "users_1",
      workflowStage: "intake", workflowStatus: "running",
    })

    const result = await asHandler(getRunByOwnerToken)(ctx, { ownerToken })

    expect(result?._id).toBe(runId)
  })

  it("returns null when token does not match any run", async () => {
    const ctx = createMockCtx()
    const result = await asHandler(getRunByOwnerToken)(ctx, { ownerToken: "nonexistent-token" })
    expect(result).toBeNull()
  })
})
