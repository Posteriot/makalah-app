import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

const repoRoot = path.resolve(__dirname, "..", "..", "..")
const routePath = path.join(repoRoot, "src/app/api/chat/route.ts")

describe("chat exact source guardrails", () => {
  it("requires exact-source questions to use inspectSourceDocument", () => {
    const routeSource = fs.readFileSync(routePath, "utf8")

    expect(routeSource).toContain("EXACT SOURCE INSPECTION RULES")
    expect(routeSource).toContain("inspectSourceDocument")
    expect(routeSource).toContain("exact title, author, published date, paragraph number, or verbatim quote")
  })

  it("forbids user-facing internal jargon in route instructions", () => {
    const routeSource = fs.readFileSync(routePath, "utf8")

    expect(routeSource).toContain("Never mention internal tools, RAG, retrieval, fetch pipelines, or available web sources")
    expect(routeSource).toContain("Respond in natural narrative language")
  })

  it("keeps exact-verification refusal wording in runtime instructions", () => {
    const routeSource = fs.readFileSync(routePath, "utf8")

    expect(routeSource).toContain("cannot be verified exactly from the verified source data")
    expect(routeSource).toContain("Do not infer article titles from URLs, slugs, or citation labels")
  })
})
