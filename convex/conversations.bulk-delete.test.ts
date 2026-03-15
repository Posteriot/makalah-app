import { beforeEach, describe, expect, it, vi } from "vitest"
import { bulkDeleteConversations } from "./conversations"
import { requireConversationOwner } from "./authHelpers"

vi.mock("./authHelpers", () => ({
  verifyAuthUserId: vi.fn(),
  requireAuthUserId: vi.fn(),
  requireConversationOwner: vi.fn(),
  getConversationIfOwner: vi.fn(),
  requireAuthUser: vi.fn(),
}))

type MockRecord = {
  _id: string
  _creationTime: number
  [key: string]: unknown
}

type EqFilter = Array<{ field: string; value: unknown }>

function createMockDb() {
  const tables = new Map<string, MockRecord[]>()
  const byId = new Map<string, { table: string; record: MockRecord }>()
  let sequence = 0

  const ensureTable = (table: string) => {
    if (!tables.has(table)) tables.set(table, [])
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
      byId.set(id, { table, record })
      return id
    },
    async get(id: string) {
      return byId.get(id)?.record ?? null
    },
    async delete(id: string) {
      const target = byId.get(id)
      if (!target) return
      tables.set(
        target.table,
        ensureTable(target.table).filter((record) => record._id !== id)
      )
      byId.delete(id)
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
        async collect() {
          return run()
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

async function callMutation<TArgs, TResult>(
  fn: { _handler: (ctx: { db: ReturnType<typeof createMockDb>["db"]; storage: { delete: ReturnType<typeof vi.fn> } }, args: TArgs) => Promise<TResult> },
  db: ReturnType<typeof createMockDb>["db"],
  args: TArgs,
  storageDelete = vi.fn()
) {
  return fn._handler({ db, storage: { delete: storageDelete } }, args)
}

describe("bulk delete conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("menghapus semua conversation yang dipilih beserta message terkait", async () => {
    const { db } = createMockDb()
    const conversationA = await db.insert("conversations", {
      userId: "user_1",
      title: "Chat A",
      lastMessageAt: 1,
    })
    const conversationB = await db.insert("conversations", {
      userId: "user_1",
      title: "Chat B",
      lastMessageAt: 2,
    })
    const untouched = await db.insert("conversations", {
      userId: "user_1",
      title: "Chat C",
      lastMessageAt: 3,
    })
    await db.insert("messages", {
      conversationId: conversationA,
      content: "A",
    })
    await db.insert("messages", {
      conversationId: conversationB,
      content: "B",
    })

    vi.mocked(requireConversationOwner).mockImplementation(async (_ctx, conversationId) => ({
      authUser: { _id: "user_1" } as never,
      conversation: (await db.get(conversationId as string)) as never,
    }))

    const result = await callMutation<
      { conversationIds: string[] },
      { deletedCount: number }
    >(bulkDeleteConversations as never, db, {
      conversationIds: [conversationA, conversationB] as never,
    })

    expect(result.deletedCount).toBe(2)
    expect(await db.get(conversationA)).toBeNull()
    expect(await db.get(conversationB)).toBeNull()
    expect(await db.get(untouched)).not.toBeNull()
    expect(
      await db.query("messages").withIndex("by_conversation", (q) => q.eq("conversationId", conversationA)).collect()
    ).toHaveLength(0)
  })

  it("menghapus blob storage file saat bulk delete", async () => {
    const { db } = createMockDb()
    const conversation = await db.insert("conversations", {
      userId: "user_1",
      title: "Chat A",
      lastMessageAt: 1,
    })
    await db.insert("files", {
      userId: "user_1",
      conversationId: conversation,
      storageId: "storage_bulk_1",
      name: "draft.pdf",
      type: "application/pdf",
      size: 10,
    })

    vi.mocked(requireConversationOwner).mockImplementation(async (_ctx, conversationId) => ({
      authUser: { _id: "user_1" } as never,
      conversation: (await db.get(conversationId as string)) as never,
    }))

    const storageDelete = vi.fn().mockResolvedValue(undefined)
    await callMutation<
      { conversationIds: string[] },
      { deletedCount: number }
    >(bulkDeleteConversations as never, db, {
      conversationIds: [conversation] as never,
    }, storageDelete)

    expect(storageDelete).toHaveBeenCalledWith("storage_bulk_1")
  })
})
