import { beforeEach, describe, expect, it, vi } from "vitest"
import { getBySource, selectExactSourceDocument } from "./sourceDocuments"
import { getConversationIfOwner } from "./authHelpers"

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
    query(table: string) {
      const filters: EqFilter = []
      let selectedIndex: string | null = null

      const run = () => {
        const rows = ensureTable(table)
        if (selectedIndex === "by_conversation") {
          return applyFilters(rows, filters.filter((filter) => filter.field === "conversationId"))
        }
        if (selectedIndex === "by_source") {
          return applyFilters(rows, filters)
        }
        return applyFilters(rows, filters)
      }

      const builder = {
        withIndex(
          index: string,
          callback: (q: { eq: (field: string, value: unknown) => unknown }) => unknown
        ) {
          selectedIndex = index
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

async function callQuery<TArgs, TResult>(
  fn: {
    _handler: (
      ctx: { db: ReturnType<typeof createMockDb>["db"] },
      args: TArgs
    ) => Promise<TResult>
  },
  db: ReturnType<typeof createMockDb>["db"],
  args: TArgs
) {
  return fn._handler({ db }, args)
}

describe("sourceDocuments lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getConversationIfOwner).mockResolvedValue({
      authUser: { _id: "user_1" } as never,
      conversation: { _id: "conv_1", userId: "user_1" } as never,
    })
  })

  it("memilih dokumen saat sourceId cocok dengan originalUrl", () => {
    const documents = [
      {
        _id: "doc_1",
        _creationTime: 1,
        conversationId: "conv_1",
        sourceId: "https://resolved.example.com/article",
        originalUrl: "https://original.example.com/article",
        resolvedUrl: "https://resolved.example.com/article",
        createdAt: 10,
        updatedAt: 10,
      },
    ] as never

    const matchedDocument = selectExactSourceDocument(
      documents,
      "https://original.example.com/article"
    )

    expect(matchedDocument?.sourceId).toBe("https://resolved.example.com/article")
  })

  it("memilih dokumen saat sourceId cocok dengan resolvedUrl", () => {
    const documents = [
      {
        _id: "doc_1",
        _creationTime: 1,
        conversationId: "conv_1",
        sourceId: "https://resolved.example.com/article",
        originalUrl: "https://original.example.com/article",
        resolvedUrl: "https://resolved.example.com/article",
        createdAt: 10,
        updatedAt: 10,
      },
    ] as never

    const matchedDocument = selectExactSourceDocument(
      documents,
      "https://resolved.example.com/article"
    )

    expect(matchedDocument?.sourceId).toBe("https://resolved.example.com/article")
  })

  it("query path menemukan dokumen lewat originalUrl walau persisted sourceId resolvedUrl", async () => {
    const { db } = createMockDb()
    await db.insert("sourceDocuments", {
      conversationId: "conv_1",
      sourceId: "https://resolved.example.com/article",
      originalUrl: "https://original.example.com/article",
      resolvedUrl: "https://resolved.example.com/article",
      paragraphs: [{ index: 1, text: "Paragraf pertama" }],
      documentText: "Paragraf pertama",
      createdAt: 10,
      updatedAt: 10,
    })

    const result = await callQuery(
      getBySource as never,
      db,
      {
        conversationId: "conv_1",
        sourceId: "https://original.example.com/article",
      }
    )

    expect(result?.sourceId).toBe("https://resolved.example.com/article")
    expect(result?.originalUrl).toBe("https://original.example.com/article")
    expect(result?.resolvedUrl).toBe("https://resolved.example.com/article")
  })

  it("query path mengembalikan null jika sumber tidak ada", async () => {
    const { db } = createMockDb()
    await db.insert("sourceDocuments", {
      conversationId: "conv_1",
      sourceId: "https://resolved.example.com/article",
      originalUrl: "https://original.example.com/article",
      resolvedUrl: "https://resolved.example.com/article",
      paragraphs: [{ index: 1, text: "Paragraf pertama" }],
      documentText: "Paragraf pertama",
      createdAt: 10,
      updatedAt: 10,
    })

    const result = await callQuery(
      getBySource as never,
      db,
      {
        conversationId: "conv_1",
        sourceId: "https://missing.example.com/article",
      }
    )

    expect(result).toBeNull()
  })

  it("mengembalikan null jika tidak ada kecocokan pada helper", () => {
    const documents = [
      {
        _id: "doc_1",
        _creationTime: 1,
        conversationId: "conv_1",
        sourceId: "https://resolved.example.com/article",
        originalUrl: "https://original.example.com/article",
        resolvedUrl: "https://resolved.example.com/article",
        createdAt: 10,
        updatedAt: 10,
      },
    ] as never

    expect(selectExactSourceDocument(documents, "https://missing.example.com/article")).toBeNull()
  })
})
