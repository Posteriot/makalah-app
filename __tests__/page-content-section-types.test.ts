import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const repoRoot = process.cwd()

function readFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8")
}

describe("pageContent section type schema", () => {
  it("accepts home-walkthrough in both runtime validators and schema", () => {
    const pageContentSource = readFile("convex/pageContent.ts")
    const schemaSource = readFile("convex/schema.ts")

    expect(pageContentSource).toContain('v.literal("home-walkthrough")')
    expect(schemaSource).toContain('v.literal("home-walkthrough")')
  })
})
