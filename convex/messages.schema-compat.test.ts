import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()

describe("messages schema compatibility", () => {
  it("keeps legacy planSnapshot support in both schema and mutation args", () => {
    const schemaSource = readFileSync(join(repoRoot, "convex/schema.ts"), "utf8")
    const messagesSource = readFileSync(join(repoRoot, "convex/messages.ts"), "utf8")

    expect(schemaSource).toContain("planSnapshot:")
    expect(messagesSource).toContain("planSnapshot:")
  })

  it("keeps legacy _plan support for paper stage data", () => {
    const schemaSource = readFileSync(join(repoRoot, "convex/schema.ts"), "utf8")
    const paperTypesSource = readFileSync(join(repoRoot, "convex/paperSessions/types.ts"), "utf8")

    expect(paperTypesSource).toContain("_plan:")
    expect(schemaSource).toContain("decisionEpoch: v.optional(v.number())")
    expect(schemaSource).toContain("gagasan: v.optional(GagasanData)")
    expect(schemaSource).toContain("topik: v.optional(TopikData)")
    expect(schemaSource).toContain("abstrak: v.optional(AbstrakData)")
    expect(schemaSource).toContain("pendahuluan: v.optional(PendahuluanData)")
    expect(schemaSource).toContain("tinjauan_literatur: v.optional(TinjauanLiteraturData)")
    expect(schemaSource).toContain("metodologi: v.optional(MetodologiData)")
  })
})
