import { beforeEach, describe, expect, it, vi } from "vitest"
import { getByConversation } from "./conversationAttachmentContexts"
import { getConversationIfOwner, requireConversationOwner } from "./authHelpers"

vi.mock("./authHelpers", () => ({
  getConversationIfOwner: vi.fn(),
  requireConversationOwner: vi.fn(),
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

      const run = () => applyFilters(ensureTable(table), filters)

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
        async unique() {
          const results = run()
          return results[0] ?? null
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

describe("conversationAttachmentContexts.getByConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("mengembalikan null saat conversation tidak ditemukan atau tidak dimiliki user", async () => {
    vi.mocked(getConversationIfOwner).mockResolvedValue(null)

    const { db } = createMockDb()

    const result = await callQuery(
      getByConversation as never,
      db,
      { conversationId: "conversation_missing" as never }
    )

    expect(result).toBeNull()
    expect(requireConversationOwner).not.toHaveBeenCalled()
  })

  it("mengembalikan context saat conversation dimiliki user", async () => {
    vi.mocked(getConversationIfOwner).mockResolvedValue({
      authUser: { _id: "user_1" } as never,
      conversation: { _id: "conversation_1", userId: "user_1" } as never,
    })

    const { db } = createMockDb()
    await db.insert("conversationAttachmentContexts", {
      conversationId: "conversation_1",
      userId: "user_1",
      activeFileIds: ["file_1"],
      updatedAt: Date.now(),
    })

    const result = await callQuery(
      getByConversation as never,
      db,
      { conversationId: "conversation_1" as never }
    )

    expect(result).toMatchObject({
      conversationId: "conversation_1",
      activeFileIds: ["file_1"],
    })
  })
})
