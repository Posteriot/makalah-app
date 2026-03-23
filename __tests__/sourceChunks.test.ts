import { beforeEach, describe, expect, it, vi } from "vitest"

import { hasSource, ingestChunks, searchByEmbedding } from "../convex/sourceChunks"
import { requireConversationOwner } from "../convex/authHelpers"

vi.mock("../convex/authHelpers", () => ({
  requireConversationOwner: vi.fn(),
}))

type MockRecord = {
  _id: string
  _creationTime: number
  [key: string]: unknown
}

type EqFilter = Array<{ field: string; value: unknown }>
type SourceChunksMutationHandler<TArgs, TResult> = {
  _handler: (ctx: unknown, args: TArgs) => Promise<TResult>
}

function createMockDb() {
  const tables = new Map<string, MockRecord[]>()
  let sequence = 0

  const ensureTable = (table: string) => {
    if (!tables.has(table)) tables.set(table, [])
    return tables.get(table)!
  }

  const applyFilters = (rows: MockRecord[], filters: EqFilter) =>
    rows.filter((row) => filters.every((filter) => row[filter.field] === filter.value))

  return {
    async insert(table: string, doc: Record<string, unknown>) {
      const record: MockRecord = {
        _id: `${table}_${++sequence}`,
        _creationTime: Date.now() + sequence,
        ...doc,
      }
      ensureTable(table).push(record)
      return record._id
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
        async first() {
          return run()[0] ?? null
        },
      }

      return builder
    },
  }
}

describe("sourceChunks auth guard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireConversationOwner).mockResolvedValue({
      authUser: { _id: "user_1" } as never,
      conversation: { _id: "conversation_1", userId: "user_1" } as never,
    })
  })

  it("verifies conversation ownership before ingesting chunks", async () => {
    const db = createMockDb()

    await (
      ingestChunks as unknown as SourceChunksMutationHandler<
        {
          conversationId: string
          sourceType: "web" | "upload"
          sourceId: string
          chunks: Array<{
            chunkIndex: number
            content: string
            embedding: number[]
            metadata: Record<string, unknown>
          }>
        },
        unknown
      >
    )._handler(
      { db } as never,
      {
        conversationId: "conversation_1" as never,
        sourceType: "web",
        sourceId: "https://example.com",
        chunks: [
          {
            chunkIndex: 0,
            content: "isi chunk",
            embedding: [0.1, 0.2],
            metadata: {},
          },
        ],
      },
    )

    expect(requireConversationOwner).toHaveBeenCalledWith(
      expect.objectContaining({ db }),
      "conversation_1",
    )
  })

  it("verifies conversation ownership before checking source existence", async () => {
    const db = createMockDb()

    await (
      hasSource as unknown as SourceChunksMutationHandler<
        { conversationId: string; sourceId: string },
        unknown
      >
    )._handler(
      { db } as never,
      {
        conversationId: "conversation_1" as never,
        sourceId: "https://example.com",
      },
    )

    expect(requireConversationOwner).toHaveBeenCalledWith(
      expect.objectContaining({ db }),
      "conversation_1",
    )
  })

  it("blocks vector search when the caller does not own the conversation", async () => {
    const vectorSearch = vi.fn()

    await expect(
      (
        searchByEmbedding as unknown as SourceChunksMutationHandler<
          { conversationId: string; embedding: number[] },
          unknown
        >
      )._handler(
        {
          auth: {
            getUserIdentity: vi.fn().mockResolvedValue({ subject: "ba_user_1" }),
          },
          runQuery: vi.fn().mockResolvedValue(null),
          vectorSearch,
        } as never,
        {
          conversationId: "conversation_1" as never,
          embedding: [0.1, 0.2],
        },
      ),
    ).rejects.toThrow("Unauthorized")

    expect(vectorSearch).not.toHaveBeenCalled()
  })
})
