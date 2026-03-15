import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanupEmptyConversations } from "./conversations"
import { requireAuthUserId } from "./authHelpers"

vi.mock("./authHelpers", () => ({
  verifyAuthUserId: vi.fn(),
  requireAuthUserId: vi.fn(),
  requireAuthUser: vi.fn(),
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
    async delete(id: string) {
      for (const [table, rows] of tables.entries()) {
        const nextRows = rows.filter((row) => row._id !== id)
        if (nextRows.length !== rows.length) {
          tables.set(table, nextRows)
          return
        }
      }
    },
    query(table: string) {
      const filters: EqFilter = []
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
          return applyFilters(ensureTable(table), filters)
        },
        async first() {
          return applyFilters(ensureTable(table), filters)[0] ?? null
        },
        async unique() {
          return applyFilters(ensureTable(table), filters)[0] ?? null
        },
      }

      return builder
    },
    tableRows(table: string) {
      return ensureTable(table)
    },
  }

  return { db }
}

async function callMutation<TArgs, TResult>(
  fn: {
    _handler: (
      ctx: {
        db: ReturnType<typeof createMockDb>["db"]
        storage: { delete: ReturnType<typeof vi.fn> }
      },
      args: TArgs
    ) => Promise<TResult>
  },
  db: ReturnType<typeof createMockDb>["db"],
  storageDelete: ReturnType<typeof vi.fn>,
  args: TArgs
) {
  return fn._handler({ db, storage: { delete: storageDelete } }, args)
}

describe("cleanupEmptyConversations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuthUserId).mockResolvedValue({ _id: "user_1" } as never)
  })

  it("menghapus subtree conversation kosong lewat cascade penuh", async () => {
    const { db } = createMockDb()
    const storageDelete = vi.fn().mockResolvedValue(undefined)

    const conversationId = await db.insert("conversations", {
      userId: "user_1",
      title: "Kosong",
    })
    const sessionId = await db.insert("paperSessions", {
      userId: "user_1",
      conversationId,
      currentStage: "gagasan",
    })
    await db.insert("rewindHistory", {
      sessionId,
      userId: "user_1",
    })
    await db.insert("conversationAttachmentContexts", {
      conversationId,
      userId: "user_1",
    })
    await db.insert("files", {
      conversationId,
      userId: "user_1",
      storageId: "storage_1",
    })
    await db.insert("artifacts", {
      conversationId,
      userId: "user_1",
      title: "Draft",
      type: "section",
      version: 1,
    })

    await callMutation(
      cleanupEmptyConversations as never,
      db,
      storageDelete,
      { userId: "user_1" as never }
    )

    expect(storageDelete).toHaveBeenCalledWith("storage_1")
    expect(db.tableRows("conversations")).toHaveLength(0)
    expect(db.tableRows("paperSessions")).toHaveLength(0)
    expect(db.tableRows("rewindHistory")).toHaveLength(0)
    expect(db.tableRows("conversationAttachmentContexts")).toHaveLength(0)
    expect(db.tableRows("files")).toHaveLength(0)
    expect(db.tableRows("artifacts")).toHaveLength(0)
  })
})
