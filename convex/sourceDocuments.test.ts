import { describe, expect, it } from "vitest"
import { selectExactSourceDocument } from "./sourceDocuments"

describe("selectExactSourceDocument", () => {
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

  it("mengembalikan null jika tidak ada kecocokan", () => {
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
