import { beforeEach, describe, expect, it, vi } from "vitest"
import { listConversations, countConversations } from "./conversations"
import { verifyAuthUserId } from "./authHelpers"

vi.mock("./authHelpers", () => ({
  verifyAuthUserId: vi.fn(),
  requireAuthUserId: vi.fn(),
  requireConversationOwner: vi.fn(),
  getConversationIfOwner: vi.fn(),
}))

type MockRecord = {
  _id: string
  _creationTime: number
  [key: string]: unknown
}

type EqFilter = Array<{ field: string; value: unknown }>

function createMockDb() {
  const tables = new Map<string, MockRecord[]>()
  let sequence = 0

  const ensureTable = (table: string) => {
    if (!tables.has(table)) {
      tables.set(table, [])
    }

    return tables.get(table)!
  }

  const applyFilters = (rows: MockRecord[], filters: EqFilter) =>
    rows.filter((row) => filters.every((filter) => row[filter.field] === filter.value))

  const db = {
    async insert(table: string, doc: Record<string, unknown>) {
      const id = `${table}_${++sequence}`
      const record: MockRecord = {
        _id: id,
        _creationTime: Date.now() + sequence,
        ...doc,
      }
      ensureTable(table).push(record)
      return id
    },
    query(table: string) {
      const filters: EqFilter = []
      let orderDirection: "asc" | "desc" | undefined

      const run = () => {
        const filtered = applyFilters(ensureTable(table), filters)

        if (!orderDirection) return [...filtered]

        return [...filtered].sort((a, b) =>
          orderDirection === "desc"
            ? Number(b.lastMessageAt ?? b._creationTime) - Number(a.lastMessageAt ?? a._creationTime)
            : Number(a.lastMessageAt ?? a._creationTime) - Number(b.lastMessageAt ?? b._creationTime)
        )
      }

      const builder = {
        withIndex(_index: string, callback: (q: { eq: (field: string, value: unknown) => unknown }) => unknown) {
          const q = {
            eq(field: string, value: unknown) {
              filters.push({ field, value })
              return q
            },
          }
          callback(q)
          return builder
        },
        order(direction: "asc" | "desc") {
          orderDirection = direction
          return builder
        },
        async take(limit: number) {
          return run().slice(0, limit)
        },
        async collect() {
          return run()
        },
      }

      return builder
    },
  }

  return { db }
}

async function callQuery<TArgs, TResult>(
  fn: { _handler: (ctx: { db: ReturnType<typeof createMockDb>["db"] }, args: TArgs) => Promise<TResult> },
  db: ReturnType<typeof createMockDb>["db"],
  args: TArgs
) {
  return fn._handler({ db }, args)
}

describe("conversation count query", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAuthUserId).mockResolvedValue({ _id: "user_1" } as never)
  })

  it("menghitung semua conversation user tanpa terpotong batas 50", async () => {
    const { db } = createMockDb()

    for (let index = 0; index < 72; index += 1) {
      await db.insert("conversations", {
        userId: "user_1",
        title: `Chat ${index + 1}`,
        lastMessageAt: 1000 + index,
      })
    }

    for (let index = 0; index < 3; index += 1) {
      await db.insert("conversations", {
        userId: "user_2",
        title: `Other ${index + 1}`,
        lastMessageAt: 2000 + index,
      })
    }

    const list = await callQuery(listConversations as never, db, { userId: "user_1" as never })
    const total = await callQuery(countConversations as never, db, { userId: "user_1" as never })

    expect(list).toHaveLength(50)
    expect(total).toBe(72)
  })
})
