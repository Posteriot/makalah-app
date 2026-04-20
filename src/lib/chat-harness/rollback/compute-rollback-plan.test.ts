import { describe, it, expect } from "vitest"
import { computeRollbackPlan, type RollbackPlan, type RollbackRejection } from "./compute-rollback-plan"

function expectValid(result: ReturnType<typeof computeRollbackPlan>): RollbackPlan {
  expect(result.valid).toBe(true)
  return result as RollbackPlan
}

function expectRejected(result: ReturnType<typeof computeRollbackPlan>): RollbackRejection {
  expect(result.valid).toBe(false)
  return result as RollbackRejection
}

describe("computeRollbackPlan", () => {
  // ─── Valid rollbacks ───

  it("rolls back one stage: topik → gagasan is blocked (minimum is topik)", () => {
    const result = expectRejected(computeRollbackPlan("topik", "gagasan"))
    expect(result.reason).toContain("Minimum rollback target")
  })

  it("rolls back one stage: outline → topik", () => {
    const plan = expectValid(computeRollbackPlan("outline", "topik"))
    expect(plan.targetStage).toBe("topik")
    expect(plan.stagesToWipe).toEqual(["outline"])
    expect(plan.unapproveCount).toBe(1)
  })

  it("rolls back two stages: metodologi → pendahuluan", () => {
    const plan = expectValid(computeRollbackPlan("metodologi", "pendahuluan"))
    expect(plan.targetStage).toBe("pendahuluan")
    expect(plan.stagesToWipe).toEqual(["metodologi", "tinjauan_literatur"])
    expect(plan.unapproveCount).toBe(2)
  })

  it("rolls back three stages: hasil → pendahuluan", () => {
    const plan = expectValid(computeRollbackPlan("hasil", "pendahuluan"))
    expect(plan.targetStage).toBe("pendahuluan")
    expect(plan.stagesToWipe).toEqual(["hasil", "metodologi", "tinjauan_literatur"])
    expect(plan.unapproveCount).toBe(3)
  })

  it("rolls back many stages: judul → topik", () => {
    const plan = expectValid(computeRollbackPlan("judul", "topik"))
    expect(plan.targetStage).toBe("topik")
    // judul is index 13, topik is index 1 → 12 stages wiped
    expect(plan.unapproveCount).toBe(12)
    expect(plan.stagesToWipe[0]).toBe("judul")
    expect(plan.stagesToWipe[plan.stagesToWipe.length - 1]).toBe("outline")
  })

  it("rolls back from completed state to topik", () => {
    const plan = expectValid(computeRollbackPlan("completed", "topik"))
    expect(plan.targetStage).toBe("topik")
    // completed → judul → ... → topik = 12 unapproves
    expect(plan.stagesToWipe[0]).toBe("judul")
    expect(plan.unapproveCount).toBe(12)
  })

  it("rolls back adjacent stages: pendahuluan → abstrak", () => {
    const plan = expectValid(computeRollbackPlan("pendahuluan", "abstrak"))
    expect(plan.stagesToWipe).toEqual(["pendahuluan"])
    expect(plan.unapproveCount).toBe(1)
  })

  it("wipe order is most-recent-first", () => {
    const plan = expectValid(computeRollbackPlan("diskusi", "outline"))
    // diskusi(8) → outline(2): wipe diskusi, hasil, metodologi, tinjauan_literatur, pendahuluan, abstrak
    expect(plan.stagesToWipe).toEqual([
      "diskusi",
      "hasil",
      "metodologi",
      "tinjauan_literatur",
      "pendahuluan",
      "abstrak",
    ])
  })

  // ─── Rejections ───

  it("rejects rollback to gagasan (below minimum)", () => {
    const result = expectRejected(computeRollbackPlan("outline", "gagasan"))
    expect(result.reason).toContain("Minimum rollback target")
    expect(result.reason).toContain("start a new chat")
  })

  it("rejects rollback to same stage", () => {
    const result = expectRejected(computeRollbackPlan("pendahuluan", "pendahuluan"))
    expect(result.reason).toContain("not before current")
  })

  it("rejects forward rollback (target after current)", () => {
    const result = expectRejected(computeRollbackPlan("topik", "outline"))
    expect(result.reason).toContain("not before current")
  })

  it("rejects unknown target stage", () => {
    const result = expectRejected(computeRollbackPlan("outline", "nonexistent"))
    expect(result.reason).toContain("Unknown stage")
  })

  it("rejects unknown current stage", () => {
    const result = expectRejected(computeRollbackPlan("nonexistent" as any, "topik"))
    expect(result.reason).toContain("Unknown current stage")
  })

  // ─── Description and consequences ───

  it("generates meaningful description", () => {
    const plan = expectValid(computeRollbackPlan("metodologi", "topik"))
    expect(plan.description).toContain("Metodologi")
    expect(plan.description).toContain("Topik")
  })

  it("lists consequences including wipe count and deletion warning", () => {
    const plan = expectValid(computeRollbackPlan("metodologi", "pendahuluan"))
    expect(plan.consequences.length).toBeGreaterThanOrEqual(3)
    expect(plan.consequences[0]).toContain("2 stage")
    expect(plan.consequences.some(c => c.includes("dihapus"))).toBe(true)
    expect(plan.consequences.some(c => c.includes("drafting"))).toBe(true)
  })

  // ─── Edge cases ───

  it("minimum valid rollback: outline → topik (one step above minimum)", () => {
    const plan = expectValid(computeRollbackPlan("outline", "topik"))
    expect(plan.unapproveCount).toBe(1)
    expect(plan.stagesToWipe).toEqual(["outline"])
  })

  it("maximum valid rollback: completed → topik", () => {
    const plan = expectValid(computeRollbackPlan("completed", "topik"))
    expect(plan.unapproveCount).toBe(12)
  })

  it("abstrak → topik wipes abstrak and outline", () => {
    const plan = expectValid(computeRollbackPlan("abstrak", "topik"))
    expect(plan.stagesToWipe).toEqual(["abstrak", "outline"])
    expect(plan.unapproveCount).toBe(2)
  })
})
