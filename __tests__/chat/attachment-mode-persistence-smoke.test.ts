import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const read = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8")

describe("attachment mode persistence", () => {
  it("persists attachmentMode in schema and message mutation contract", () => {
    const schemaSource = read("convex/schema.ts")
    const messagesSource = read("convex/messages.ts")

    expect(schemaSource).toContain("attachmentMode")
    expect(messagesSource).toContain("attachmentMode")
    expect(messagesSource).toContain("v.union(v.literal(\"explicit\"), v.literal(\"inherit\"))")
  })
})
