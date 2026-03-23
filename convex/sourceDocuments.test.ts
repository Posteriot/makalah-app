import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  deleteByConversation,
  getBySource,
  listSourceSummariesByConversation,
  selectExactSourceDocument,
  upsertDocument,
} from "./sourceDocuments"
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
type MockDb = ReturnType<typeof createMockDb>["db"]

type HandlerFn<TArgs, TResult> = {
  _handler: (ctx: { db: MockDb }, args: TArgs) => Promise<TResult>
}

type SourceDocumentLookupResult = {
  sourceId: string
  originalUrl: string
  resolvedUrl: string
} | null

type SourceDocumentSummaryResult = Array<{
  sourceId: string
  originalUrl: string
  resolvedUrl: string
  title?: string
  author?: string
  publishedAt?: string
  siteName?: string
}>

type UpsertDocumentResult = {
  success: true
  inserted: boolean
  id: string
}

type DeleteByConversationResult = {
  deleted: number
}

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
    async patch(id: string, changes: Record<string, unknown>) {
      const target = byId.get(id)
      if (!target) return
      const nextRecord = { ...target.record, ...changes }
      target.record = nextRecord
      const rows = ensureTable(target.table)
      const index = rows.findIndex((row) => row._id === id)
      if (index !== -1) {
        rows[index] = nextRecord
      }
      byId.set(id, { table: target.table, record: nextRecord })
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
  fn: HandlerFn<TArgs, TResult>,
  db: MockDb,
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
    vi.mocked(requireConversationOwner).mockResolvedValue({
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
      getBySource as unknown as HandlerFn<
        { conversationId: string; sourceId: string },
        SourceDocumentLookupResult
      >,
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
      getBySource as unknown as HandlerFn<
        { conversationId: string; sourceId: string },
        SourceDocumentLookupResult
      >,
      db,
      {
        conversationId: "conv_1",
        sourceId: "https://missing.example.com/article",
      }
    )

    expect(result).toBeNull()
  })

  it("listSourceSummariesByConversation mengembalikan ringkasan exact source per conversation secara deterministik", async () => {
    const { db } = createMockDb()
    await db.insert("sourceDocuments", {
      conversationId: "conv_1",
      sourceId: "source-a",
      originalUrl: "https://example.com/a-original",
      resolvedUrl: "https://example.com/a-resolved",
      title: "Judul A",
      author: "Penulis A",
      publishedAt: "2026-03-21",
      siteName: "Media A",
      paragraphs: [{ index: 1, text: "A" }],
      documentText: "A",
      createdAt: 20,
      updatedAt: 20,
    })
    await db.insert("sourceDocuments", {
      conversationId: "conv_2",
      sourceId: "source-x",
      originalUrl: "https://example.com/x-original",
      resolvedUrl: "https://example.com/x-resolved",
      title: "Judul X",
      author: "Penulis X",
      publishedAt: "2026-03-20",
      siteName: "Media X",
      paragraphs: [{ index: 1, text: "X" }],
      documentText: "X",
      createdAt: 5,
      updatedAt: 5,
    })
    await db.insert("sourceDocuments", {
      conversationId: "conv_1",
      sourceId: "source-b",
      originalUrl: "https://example.com/b-original",
      resolvedUrl: "https://example.com/b-resolved",
      title: "Judul B",
      author: "Penulis B",
      publishedAt: "2026-03-22",
      siteName: "Media B",
      paragraphs: [{ index: 1, text: "B" }],
      documentText: "B",
      createdAt: 10,
      updatedAt: 10,
    })
    await db.insert("sourceDocuments", {
      conversationId: "conv_1",
      sourceId: "source-c",
      originalUrl: "https://example.com/c-original",
      resolvedUrl: "https://example.com/c-resolved",
      title: "Judul C",
      author: "Penulis C",
      publishedAt: "2026-03-23",
      siteName: "Media C",
      paragraphs: [{ index: 1, text: "C" }],
      documentText: "C",
      createdAt: 20,
      updatedAt: 20,
    })

    vi.mocked(getConversationIfOwner).mockResolvedValueOnce({
      authUser: { _id: "user_1" } as never,
      conversation: { _id: "conv_1", userId: "user_1" } as never,
    })

    const results = await callQuery(
      listSourceSummariesByConversation as unknown as HandlerFn<
        { conversationId: string },
        SourceDocumentSummaryResult
      >,
      db,
      { conversationId: "conv_1" }
    )

    expect(results).toEqual([
      {
        sourceId: "source-b",
        originalUrl: "https://example.com/b-original",
        resolvedUrl: "https://example.com/b-resolved",
        title: "Judul B",
        author: "Penulis B",
        publishedAt: "2026-03-22",
        siteName: "Media B",
      },
      {
        sourceId: "source-a",
        originalUrl: "https://example.com/a-original",
        resolvedUrl: "https://example.com/a-resolved",
        title: "Judul A",
        author: "Penulis A",
        publishedAt: "2026-03-21",
        siteName: "Media A",
      },
      {
        sourceId: "source-c",
        originalUrl: "https://example.com/c-original",
        resolvedUrl: "https://example.com/c-resolved",
        title: "Judul C",
        author: "Penulis C",
        publishedAt: "2026-03-23",
        siteName: "Media C",
      },
    ])
  })

  it("upsertDocument menyisipkan dokumen baru saat belum ada record exact", async () => {
    const { db } = createMockDb()

    const result = await (
      upsertDocument as unknown as HandlerFn<
        {
          conversationId: string
          sourceId: string
          originalUrl: string
          resolvedUrl: string
          title?: string
          author?: string
          publishedAt?: string
          siteName?: string
          paragraphs: Array<{ index: number; text: string }>
          documentText: string
        },
        UpsertDocumentResult
      >
    )._handler(
      { db },
      {
        conversationId: "conv_1",
        sourceId: "https://resolved.example.com/article",
        originalUrl: "https://original.example.com/article",
        resolvedUrl: "https://resolved.example.com/article",
        title: "Judul Artikel",
        author: "Penulis",
        publishedAt: "2026-03-23",
        siteName: "Contoh Media",
        paragraphs: [{ index: 1, text: "Paragraf pertama" }],
        documentText: "Paragraf pertama",
      }
    )

    expect(result).toMatchObject({
      success: true,
      inserted: true,
    })

    const inserted = await db.query("sourceDocuments").collect()
    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toMatchObject({
      conversationId: "conv_1",
      sourceId: "https://resolved.example.com/article",
      originalUrl: "https://original.example.com/article",
      resolvedUrl: "https://resolved.example.com/article",
      title: "Judul Artikel",
      author: "Penulis",
      publishedAt: "2026-03-23",
      siteName: "Contoh Media",
      paragraphs: [{ index: 1, text: "Paragraf pertama" }],
      documentText: "Paragraf pertama",
    })
  })

  it("upsertDocument memperbarui canonical record dan membersihkan duplikat", async () => {
    const { db } = createMockDb()
    const canonicalId = await db.insert("sourceDocuments", {
      conversationId: "conv_1",
      sourceId: "https://resolved.example.com/article",
      originalUrl: "https://original.example.com/article",
      resolvedUrl: "https://resolved.example.com/article",
      title: "Lama",
      paragraphs: [{ index: 1, text: "Lama" }],
      documentText: "Lama",
      createdAt: 10,
      updatedAt: 10,
    })
    const duplicateId = await db.insert("sourceDocuments", {
      conversationId: "conv_1",
      sourceId: "https://resolved.example.com/article",
      originalUrl: "https://original.example.com/article",
      resolvedUrl: "https://resolved.example.com/article",
      title: "Duplikat",
      paragraphs: [{ index: 1, text: "Duplikat" }],
      documentText: "Duplikat",
      createdAt: 11,
      updatedAt: 11,
    })

    const result = await (
      upsertDocument as unknown as HandlerFn<
        {
          conversationId: string
          sourceId: string
          originalUrl: string
          resolvedUrl: string
          title?: string
          author?: string
          paragraphs: Array<{ index: number; text: string }>
          documentText: string
        },
        UpsertDocumentResult
      >
    )._handler(
      { db },
      {
        conversationId: "conv_1",
        sourceId: "https://resolved.example.com/article",
        originalUrl: "https://original.example.com/article",
        resolvedUrl: "https://resolved.example.com/article",
        title: "Baru",
        author: "Penulis",
        paragraphs: [{ index: 1, text: "Baru" }],
        documentText: "Baru",
      }
    )

    expect(result).toMatchObject({
      success: true,
      inserted: false,
      id: canonicalId,
    })

    const stored = await db.query("sourceDocuments").collect()
    expect(stored).toHaveLength(1)
    expect(stored[0]?._id).toBe(canonicalId)
    expect(stored[0]).toMatchObject({
      title: "Baru",
      author: "Penulis",
      paragraphs: [{ index: 1, text: "Baru" }],
      documentText: "Baru",
    })
    expect(stored.find((doc) => doc._id === duplicateId)).toBeUndefined()
  })

  it("deleteByConversation menghapus semua sourceDocuments milik conversation aktif", async () => {
    const { db } = createMockDb()
    await db.insert("sourceDocuments", {
      conversationId: "conv_1",
      sourceId: "https://resolved.example.com/article-1",
      originalUrl: "https://original.example.com/article-1",
      resolvedUrl: "https://resolved.example.com/article-1",
      paragraphs: [{ index: 1, text: "A" }],
      documentText: "A",
      createdAt: 10,
      updatedAt: 10,
    })
    await db.insert("sourceDocuments", {
      conversationId: "conv_1",
      sourceId: "https://resolved.example.com/article-2",
      originalUrl: "https://original.example.com/article-2",
      resolvedUrl: "https://resolved.example.com/article-2",
      paragraphs: [{ index: 1, text: "B" }],
      documentText: "B",
      createdAt: 11,
      updatedAt: 11,
    })
    await db.insert("sourceDocuments", {
      conversationId: "conv_2",
      sourceId: "https://resolved.example.com/other",
      originalUrl: "https://original.example.com/other",
      resolvedUrl: "https://resolved.example.com/other",
      paragraphs: [{ index: 1, text: "C" }],
      documentText: "C",
      createdAt: 12,
      updatedAt: 12,
    })

    const result = await (
      deleteByConversation as unknown as HandlerFn<
        { conversationId: string },
        DeleteByConversationResult
      >
    )._handler(
      { db },
      { conversationId: "conv_1" }
    )

    expect(result).toEqual({ deleted: 2 })
    expect(await db.query("sourceDocuments").withIndex("by_conversation", (q) => q.eq("conversationId", "conv_1")).collect()).toHaveLength(0)
    expect(await db.query("sourceDocuments").withIndex("by_conversation", (q) => q.eq("conversationId", "conv_2")).collect()).toHaveLength(1)
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
