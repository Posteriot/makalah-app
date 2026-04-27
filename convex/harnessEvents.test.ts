/**
 * Tests for convex/harnessEvents.ts mutation + queries (Phase 6 Task 6.2c).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  emitEvent,
  getEventsByRun,
  getEventsByCorrelation,
  getEventsByChat,
} from "./harnessEvents"

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
      query(table: string) {
        const filters: Array<{ field: string; value: unknown }> = []
        let orderDir: "asc" | "desc" = "asc"
        let takeN: number | undefined

        const run = () => {
          const rows = ensureTable(table).filter(r =>
            filters.every(f => r[f.field] === f.value),
          )
          const sorted = [...rows].sort((a, b) => {
            const aVal = Number(a.occurredAt ?? 0)
            const bVal = Number(b.occurredAt ?? 0)
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
          filter(_cb: unknown) { return builder },
          async take(n: number) { takeN = n; return run() },
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

const baseEvent = {
  eventType: "run_started",
  userId: "users_1",
  sessionId: "session_xyz",
  chatId: "conversations_1",
  payload: { startReason: "new_user_message" },
}

describe("emitEvent", () => {
  it("auto-fills eventId, schemaVersion=1, occurredAt when omitted", async () => {
    const ctx = createMockCtx()
    const result = await asHandler(emitEvent)(ctx, baseEvent)

    expect(result.eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

    const row = ctx.tables.get("harnessEvents")![0]
    expect(row.eventId).toBe(result.eventId)
    expect(row.schemaVersion).toBe(1)
    expect(row.occurredAt).toBeTypeOf("number")
    expect(row.eventType).toBe("run_started")
  })

  it("respects explicit eventId / schemaVersion / occurredAt when provided", async () => {
    const ctx = createMockCtx()
    await asHandler(emitEvent)(ctx, {
      ...baseEvent,
      eventId: "custom-event-123",
      schemaVersion: 2,
      occurredAt: 88888,
    })

    const row = ctx.tables.get("harnessEvents")![0]
    expect(row.eventId).toBe("custom-event-123")
    expect(row.schemaVersion).toBe(2)
    expect(row.occurredAt).toBe(88888)
  })

  it("persists optional runId / stepId / correlationId / causationEventId", async () => {
    const ctx = createMockCtx()
    await asHandler(emitEvent)(ctx, {
      ...baseEvent,
      runId: "harnessRuns_1",
      stepId: "harnessRunSteps_1",
      correlationId: "req-abc",
      causationEventId: "evt-prev-456",
    })

    const row = ctx.tables.get("harnessEvents")![0]
    expect(row.runId).toBe("harnessRuns_1")
    expect(row.stepId).toBe("harnessRunSteps_1")
    expect(row.correlationId).toBe("req-abc")
    expect(row.causationEventId).toBe("evt-prev-456")
  })
})

describe("getEventsByRun", () => {
  it("returns events for a specific run, ordered by occurredAt asc", async () => {
    const ctx = createMockCtx()
    // Seed a run record so the access check finds something to call getConversationIfOwner against.
    ;(ctx.db.insert as unknown as (t: string, d: Record) => Promise<string>)("harnessRuns", {
      _id: "harnessRuns_1",
      conversationId: "conversations_1",
    })

    await asHandler(emitEvent)(ctx, { ...baseEvent, runId: "harnessRuns_1", occurredAt: 300 })
    await asHandler(emitEvent)(ctx, { ...baseEvent, runId: "harnessRuns_1", occurredAt: 100 })
    await asHandler(emitEvent)(ctx, { ...baseEvent, runId: "harnessRuns_1", occurredAt: 200 })

    const events = await asHandler(getEventsByRun)(ctx, { runId: "harnessRuns_1" })
    expect(events).toHaveLength(3)
    expect((events as Array<{ occurredAt: number }>).map(e => e.occurredAt)).toEqual([100, 200, 300])
  })

  it("returns [] when run does not exist", async () => {
    const ctx = createMockCtx()
    const events = await asHandler(getEventsByRun)(ctx, { runId: "harnessRuns_nonexistent" })
    expect(events).toEqual([])
  })

  it("returns [] when caller does not own the conversation", async () => {
    const ctx = createMockCtx()
    ;(ctx.db.insert as unknown as (t: string, d: Record) => Promise<string>)("harnessRuns", {
      _id: "harnessRuns_1",
      conversationId: "conversations_1",
    })
    mockedGetConversationIfOwner.mockResolvedValueOnce(null as never)
    const events = await asHandler(getEventsByRun)(ctx, { runId: "harnessRuns_1" })
    expect(events).toEqual([])
  })
})

describe("getEventsByCorrelation", () => {
  it("returns events sharing the same correlationId, ordered asc", async () => {
    const ctx = createMockCtx()
    await asHandler(emitEvent)(ctx, { ...baseEvent, correlationId: "req-99", occurredAt: 50 })
    await asHandler(emitEvent)(ctx, { ...baseEvent, correlationId: "req-99", occurredAt: 10 })
    await asHandler(emitEvent)(ctx, { ...baseEvent, correlationId: "req-other", occurredAt: 20 })

    const events = await asHandler(getEventsByCorrelation)(ctx, { correlationId: "req-99" })
    expect(events).toHaveLength(2)
    expect((events as Array<{ occurredAt: number }>).map(e => e.occurredAt)).toEqual([10, 50])
  })

  it("returns [] when no events match", async () => {
    const ctx = createMockCtx()
    const events = await asHandler(getEventsByCorrelation)(ctx, { correlationId: "req-empty" })
    expect(events).toEqual([])
  })
})

describe("getEventsByChat", () => {
  it("returns events for the chat with default limit 100", async () => {
    const ctx = createMockCtx()
    for (let i = 0; i < 5; i++) {
      await asHandler(emitEvent)(ctx, { ...baseEvent, occurredAt: i })
    }

    const events = await asHandler(getEventsByChat)(ctx, { chatId: "conversations_1" })
    expect(events).toHaveLength(5)
  })

  it("respects explicit limit", async () => {
    const ctx = createMockCtx()
    for (let i = 0; i < 10; i++) {
      await asHandler(emitEvent)(ctx, { ...baseEvent, occurredAt: i })
    }
    const events = await asHandler(getEventsByChat)(ctx, { chatId: "conversations_1", limit: 3 })
    expect(events).toHaveLength(3)
  })

  it("returns [] when caller does not own the chat", async () => {
    const ctx = createMockCtx()
    mockedGetConversationIfOwner.mockResolvedValueOnce(null as never)
    const events = await asHandler(getEventsByChat)(ctx, { chatId: "conversations_1" })
    expect(events).toEqual([])
  })
})
