import { beforeEach, describe, expect, it, vi } from "vitest"
import { get, listByConversation } from "./artifacts"
import { verifyAuthUserId } from "./authHelpers"

vi.mock("./authHelpers", () => ({
  verifyAuthUserId: vi.fn(),
  requireAuthUserId: vi.fn(),
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
    async get(id: string) {
      for (const rows of tables.values()) {
        const found = rows.find((row) => row._id === id)
        if (found) return found
      }
      return null
    },
    query(table: string) {
      const filters: EqFilter = []
      let orderDirection: "asc" | "desc" | undefined

      const run = () => {
        const filtered = applyFilters(ensureTable(table), filters)

        if (!orderDirection) return [...filtered]

        return [...filtered].sort((a, b) =>
          orderDirection === "desc"
            ? Number(b._creationTime) - Number(a._creationTime)
            : Number(a._creationTime) - Number(b._creationTime)
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

describe("artifacts.listByConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAuthUserId).mockResolvedValue({ _id: "user_1" } as never)
  })

  it("mengembalikan artifact owner walau conversation sudah hilang", async () => {
    const { db } = createMockDb()

    await db.insert("artifacts", {
      conversationId: "conversation_orphan",
      userId: "user_1",
      title: "Draft Topik",
      type: "section",
      version: 1,
    })

    const result = await callQuery(
      listByConversation as never,
      db,
      {
        conversationId: "conversation_orphan" as never,
        userId: "user_1" as never,
      }
    ) as Array<Record<string, unknown>>

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      conversationId: "conversation_orphan",
      userId: "user_1",
      title: "Draft Topik",
    })
  })

  it("tetap memfilter artifact milik user lain pada conversation yang sama", async () => {
    const { db } = createMockDb()

    await db.insert("artifacts", {
      conversationId: "conversation_shared",
      userId: "user_1",
      title: "Artifact Erik",
      type: "section",
      version: 1,
    })

    await db.insert("artifacts", {
      conversationId: "conversation_shared",
      userId: "user_2",
      title: "Artifact Orang Lain",
      type: "section",
      version: 1,
    })

    const result = await callQuery(
      listByConversation as never,
      db,
      {
        conversationId: "conversation_shared" as never,
        userId: "user_1" as never,
      }
    ) as Array<Record<string, unknown>>

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      title: "Artifact Erik",
      userId: "user_1",
    })
  })

  it("mengembalikan kosong saat auth user tidak cocok", async () => {
    const { db } = createMockDb()
    vi.mocked(verifyAuthUserId).mockResolvedValue(null)

    await db.insert("artifacts", {
      conversationId: "conversation_shared",
      userId: "user_1",
      title: "Artifact Erik",
      type: "section",
      version: 1,
    })

    const result = await callQuery(
      listByConversation as never,
      db,
      {
        conversationId: "conversation_shared" as never,
        userId: "user_1" as never,
      }
    ) as Array<Record<string, unknown>>

    expect(result).toEqual([])
  })
})

describe("artifacts.get", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyAuthUserId).mockResolvedValue({ _id: "user_1" } as never)
  })

  it("mengembalikan null saat auth user tidak cocok", async () => {
    const { db } = createMockDb()
    vi.mocked(verifyAuthUserId).mockResolvedValue(null)

    const artifactId = await db.insert("artifacts", {
      conversationId: "conversation_1",
      userId: "user_1",
      title: "Draft Topik",
      type: "section",
      version: 1,
    })

    const result = await callQuery(
      get as never,
      db,
      {
        artifactId: artifactId as never,
        userId: "user_1" as never,
      }
    )

    expect(result).toBeNull()
  })
})
