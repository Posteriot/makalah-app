# Skill Strengthening + Observability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform skill instructions from static gatekeeping rules into research methodology guidance, and add ai-ops indicator to verify skills are active and used.

**Architecture:** Only `instructions()` content changes in both skills. Validate logic untouched. Telemetry extended with search skill fields on existing `aiTelemetry` table. Ai-ops gets a new panel reusing existing Skill Monitor patterns.

**Tech Stack:** TypeScript, Vitest, Convex (schema + queries), React (ai-ops panel)

**Design Doc:** `docs/skill-wrapped-tools/skill-search-tool/skill-strengthening-design.md`

---

## Task 1: Rewrite Source Quality Skill Instructions

**Files:**
- Modify: `src/lib/ai/skills/source-quality.skill.ts`
- Modify: `src/lib/ai/skills/types.ts` (import ACTIVE_SEARCH_STAGES reference)
- Test: `__tests__/skills/source-quality.test.ts`

**Step 1: Write failing tests for new context-aware instructions**

Add to existing test file `__tests__/skills/source-quality.test.ts`:

```typescript
describe("instructions (strengthened)", () => {
  it("should return research methodology for non-paper chat mode", () => {
    const result = sourceQualitySkill.instructions({
      isPaperMode: false,
      currentStage: null,
      hasRecentSources: false,
      availableSources: [],
    })
    expect(result).not.toBeNull()
    expect(result).toContain("RESEARCH SOURCE STRATEGY")
    expect(result).toContain("Evaluate Source Substance")
    expect(result).toContain("Source Selection by Purpose")
    expect(result).toContain("Build Narrative FROM Sources")
    expect(result).toContain("Chat mode")
  })

  it("should include exploration guidance for gagasan stage", () => {
    const result = sourceQualitySkill.instructions({
      isPaperMode: true,
      currentStage: "gagasan",
      hasRecentSources: false,
      availableSources: [],
    })
    expect(result).toContain("Exploration phase")
    expect(result).toContain("breadth")
  })

  it("should include exploration guidance for topik stage", () => {
    const result = sourceQualitySkill.instructions({
      isPaperMode: true,
      currentStage: "topik",
      hasRecentSources: false,
      availableSources: [],
    })
    expect(result).toContain("Exploration phase")
  })

  it("should include literature review guidance for tinjauan_literatur", () => {
    const result = sourceQualitySkill.instructions({
      isPaperMode: true,
      currentStage: "tinjauan_literatur",
      hasRecentSources: false,
      availableSources: [],
    })
    expect(result).toContain("Literature review phase")
    expect(result).toContain("depth")
    expect(result).toContain("patterns across studies")
  })

  it("should include framing guidance for pendahuluan", () => {
    const result = sourceQualitySkill.instructions({
      isPaperMode: true,
      currentStage: "pendahuluan",
      hasRecentSources: false,
      availableSources: [],
    })
    expect(result).toContain("Framing phase")
    expect(result).toContain("primary data")
  })

  it("should include methodology guidance for metodologi", () => {
    const result = sourceQualitySkill.instructions({
      isPaperMode: true,
      currentStage: "metodologi",
      hasRecentSources: false,
      availableSources: [],
    })
    expect(result).toContain("Methodology phase")
    expect(result).toContain("precedent")
  })

  it("should include discussion guidance for diskusi", () => {
    const result = sourceQualitySkill.instructions({
      isPaperMode: true,
      currentStage: "diskusi",
      hasRecentSources: false,
      availableSources: [],
    })
    expect(result).toContain("Discussion phase")
    expect(result).toContain("cross-referencing")
  })

  it("should return null for passive search stages", () => {
    const passiveStages = [
      "outline", "abstrak", "hasil", "kesimpulan",
      "pembaruan_abstrak", "daftar_pustaka", "lampiran", "judul",
    ]
    for (const stage of passiveStages) {
      const result = sourceQualitySkill.instructions({
        isPaperMode: true,
        currentStage: stage,
        hasRecentSources: false,
        availableSources: [],
      })
      expect(result).toBeNull()
    }
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/skills/source-quality.test.ts`
Expected: New tests FAIL (current instructions don't contain "RESEARCH SOURCE STRATEGY", don't return null for passive stages)

**Step 3: Implement new instructions**

Replace the `instructions()` method in `src/lib/ai/skills/source-quality.skill.ts`:

```typescript
import { ACTIVE_SEARCH_STAGES } from "@/lib/ai/stage-skill-contracts"

// ... existing code ...

export const sourceQualitySkill: Skill<SourceQualityValidateArgs> = {
  name: "source-quality",
  wrappedTools: [],

  instructions(context: SkillContext): string | null {
    // Passive search stages: search is disabled, no instructions needed
    if (
      context.isPaperMode &&
      context.currentStage &&
      !ACTIVE_SEARCH_STAGES.includes(context.currentStage as PaperStageId)
    ) {
      return null
    }

    const base = `## RESEARCH SOURCE STRATEGY

You are a researcher, not a link collector.

### Evaluate Source Substance
Do not judge sources by domain alone. Evaluate:
- Does the source present PRIMARY DATA (statistics, surveys, studies)?
- Is there METHODOLOGY that can be assessed (sample size, method)?
- Does the source provide ANALYSIS, not just opinion?
- Sources without data/methodology = context only, not argument foundation.

### Source Selection by Purpose
- Factual/statistical claims → require primary data (BPS, World Bank, journals, studies)
- Current trends/events → recent news, then cross-check with institutional data
- Concepts/theory → academic literature, peer-reviewed journals
- Never force one source type for all purposes.

### Build Narrative FROM Sources
- Every cited source must CONTRIBUTE to the argument — explain its relevance, do not just attach and move on.
- Build from strongest to supporting: primary data → institutional analysis → news context.
- When sources contradict each other — acknowledge it, do not ignore.
- When available sources are insufficient for the claim you want to make → tell the user, request another search. Do not force weak sources.

### Diversification
- Minimum 2 different perspectives/domains for substantive claims
- Do not use 3+ sources from the same domain unless it is the specialist authority on that topic`

    const stageGuidance = getStageGuidance(context.currentStage)
    if (stageGuidance) {
      return `${base}\n\n### Stage Context\n${stageGuidance}`
    }
    return base
  },

  // validate and examples unchanged
}

function getStageGuidance(stage: string | null): string | null {
  switch (stage) {
    case "gagasan":
    case "topik":
      return "Exploration phase: seek breadth, not depth. 3-5 diverse sources to map the landscape."
    case "tinjauan_literatur":
      return "Literature review phase: seek depth. Minimum 5 sources, prioritize academic/journals. Identify patterns across studies, gaps not yet addressed, and position the user's research within the existing landscape."
    case "pendahuluan":
      return "Framing phase: sources to build problem context. Use primary data to establish significance, academic sources for theoretical grounding."
    case "metodologi":
      return "Methodology phase: cite sources that justify the approach. Find studies using similar methods as precedent."
    case "diskusi":
      return "Discussion phase: sources for cross-referencing findings. Compare with other studies — what aligns, what differs, and why."
    default:
      return "Chat mode: match depth to the question. Casual = 2-3 sources sufficient. Serious inquiry = treat as mini literature review."
  }
}
```

**Note:** Import `ACTIVE_SEARCH_STAGES` from `@/lib/ai/stage-skill-contracts` and the `PaperStageId` type. Check `stage-skill-contracts.ts` for exact import path and type name.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/skills/source-quality.test.ts`
Expected: ALL tests pass (old + new)

**Step 5: Commit**

```bash
git add src/lib/ai/skills/source-quality.skill.ts __tests__/skills/source-quality.test.ts
git commit -m "feat(skills): rewrite source-quality instructions as research methodology

Context-aware guidance: stage-specific for active search stages,
null for passive stages, chat mode for non-paper."
```

---

## Task 2: Rewrite Reference Integrity Skill Instructions

**Files:**
- Modify: `src/lib/ai/skills/reference-integrity.skill.ts`
- Test: `__tests__/skills/reference-integrity.test.ts`

**Step 1: Write failing tests for new instructions**

Add to existing test file `__tests__/skills/reference-integrity.test.ts`:

```typescript
describe("instructions (strengthened)", () => {
  it("should return research integrity methodology when sources available", () => {
    const result = referenceIntegritySkill.instructions({
      isPaperMode: false,
      currentStage: null,
      hasRecentSources: true,
      availableSources: [
        { url: "https://example.com/article", title: "Example" },
      ],
    })
    expect(result).not.toBeNull()
    expect(result).toContain("REFERENCE INTEGRITY")
    expect(result).toContain("Integration, Not Decoration")
    expect(result).toContain("Source Honesty")
    expect(result).toContain("Claim-Source Alignment")
    expect(result).toContain("When to Request More Sources")
  })

  it("should return null when no recent sources", () => {
    const result = referenceIntegritySkill.instructions({
      isPaperMode: false,
      currentStage: null,
      hasRecentSources: false,
      availableSources: [],
    })
    expect(result).toBeNull()
  })

  it("should include BAD/GOOD citation examples", () => {
    const result = referenceIntegritySkill.instructions({
      isPaperMode: true,
      currentStage: "gagasan",
      hasRecentSources: true,
      availableSources: [
        { url: "https://example.com/a", title: "A" },
      ],
    })
    expect(result).toContain("BAD:")
    expect(result).toContain("GOOD:")
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/skills/reference-integrity.test.ts`
Expected: New tests FAIL (current instructions don't contain "Integration, Not Decoration")

**Step 3: Implement new instructions**

Replace the `instructions()` method in `src/lib/ai/skills/reference-integrity.skill.ts`:

```typescript
instructions(context: SkillContext): string | null {
  if (!context.hasRecentSources) return null

  return `## REFERENCE INTEGRITY

You are accountable for every reference you cite.

### Integration, Not Decoration
- Every cited source must serve a PURPOSE in your argument.
- When you cite, explain WHY this source matters to the point you are making.
- Do not stack citations at the end of a paragraph as decoration.
  BAD:  "AI impacts employment [1][2][3]."
  GOOD: "McKinsey (2025) estimates 30% of tasks are automatable [1], though ILO data suggests net job creation in service sectors [2]."

### Source Honesty
- ONLY cite URLs from actual web search results. Never fabricate.
- If available sources are insufficient for a claim → say so explicitly and ask the user to search again. Do not stretch a source beyond what it actually says.
- If a source partially supports your claim → state what it supports and what remains unsupported.

### Claim-Source Alignment
- Factual claims require primary data sources. Do not cite a news article as evidence for a statistical claim when the article itself cites a study — find the original study if possible.
- Distinguish between what the source SAYS vs what you INTERPRET from it.
- When sources conflict, present both sides rather than cherry-picking.

### When to Request More Sources
- You are about to make a claim but no available source supports it.
- Available sources only cover one perspective on a contested topic.
- The user's question requires depth that current sources cannot provide.
- In these cases: tell the user what is missing and why another search would strengthen the response.`
},
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/skills/reference-integrity.test.ts`
Expected: ALL tests pass (old + new)

**Step 5: Commit**

```bash
git add src/lib/ai/skills/reference-integrity.skill.ts __tests__/skills/reference-integrity.test.ts
git commit -m "feat(skills): rewrite reference-integrity instructions as integrity methodology

Teaches integration over decoration, source honesty, claim-source
alignment, and when to request more sources."
```

---

## Task 3: Add Search Skill Telemetry Fields

**Files:**
- Modify: `convex/schema.ts` (add fields to aiTelemetry table)
- Modify: `convex/aiTelemetry.ts` (accept new fields in log mutation, add query)
- Modify: `src/lib/ai/telemetry.ts` (extend TelemetryParams)

**Step 1: Extend aiTelemetry schema**

In `convex/schema.ts`, find the `aiTelemetry` table definition. Add these optional fields:

```typescript
// Search skill telemetry fields
searchSkillApplied: v.optional(v.boolean()),
searchSkillName: v.optional(v.string()),       // "source-quality" | "reference-integrity"
searchSkillAction: v.optional(v.string()),      // "scored" | "validated" | "rejected"
sourcesScored: v.optional(v.number()),          // count of sources entering pipeline
sourcesFiltered: v.optional(v.number()),        // count of sources filtered out
sourcesPassedTiers: v.optional(v.string()),     // JSON: e.g. '{"academic":2,"news-major":3}'
referencesClaimed: v.optional(v.number()),      // count of references AI claimed
referencesMatched: v.optional(v.number()),      // count that matched search results
diversityWarning: v.optional(v.string()),       // diversity warning if any
```

**Step 2: Extend log mutation**

In `convex/aiTelemetry.ts`, update the `log` mutation args to accept the new fields. Update `isSkillRuntimeRecord()` to also return true when `searchSkillApplied === true`:

```typescript
function isSkillRuntimeRecord(record: {
  // ...existing fields...
  searchSkillApplied?: boolean
}): boolean {
  if (record.searchSkillApplied) return true
  // ...existing logic...
}
```

**Step 3: Extend TelemetryParams**

In `src/lib/ai/telemetry.ts`, add the new fields to `TelemetryParams`:

```typescript
type TelemetryParams = {
  // ...existing fields...
  searchSkillApplied?: boolean
  searchSkillName?: string
  searchSkillAction?: string
  sourcesScored?: number
  sourcesFiltered?: number
  sourcesPassedTiers?: string
  referencesClaimed?: number
  referencesMatched?: number
  diversityWarning?: string
}
```

**Step 4: Commit**

```bash
git add convex/schema.ts convex/aiTelemetry.ts src/lib/ai/telemetry.ts
git commit -m "feat(telemetry): add search skill fields to aiTelemetry schema"
```

---

## Task 4: Log Search Skill Events in Route.ts

**Files:**
- Modify: `src/app/api/chat/route.ts` (add skill telemetry to existing logAiTelemetry calls)

**Step 1: Capture source-quality results for telemetry**

After `validateWithScores()` is called in both Perplexity and Grok pipelines, capture the results into a variable that persists to the telemetry call:

```typescript
// After Perplexity pipeline validateWithScores():
const sourceQualityTelemetry = {
  searchSkillApplied: true,
  searchSkillName: "source-quality",
  searchSkillAction: qualityResult.valid ? "scored" : "rejected",
  sourcesScored: (qualityResult.scoredSources?.length ?? 0) + (qualityResult.filteredOut?.length ?? 0),
  sourcesFiltered: qualityResult.filteredOut?.length ?? 0,
  sourcesPassedTiers: JSON.stringify(
    (qualityResult.scoredSources ?? []).reduce((acc, s) => {
      acc[s.tier] = (acc[s.tier] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  ),
  diversityWarning: qualityResult.diversityWarning,
}
```

Then spread `...sourceQualityTelemetry` into the existing `logAiTelemetry()` call for websearch success.

**Step 2: Capture reference-integrity results for telemetry**

After `referenceIntegritySkill.validate()` is called in createArtifact/updateArtifact handlers, capture:

```typescript
const refIntegrityTelemetry = {
  searchSkillApplied: true,
  searchSkillName: "reference-integrity",
  searchSkillAction: validation.valid ? "validated" : "rejected",
  referencesClaimed: args.sources?.length ?? 0,
  referencesMatched: validation.valid
    ? args.sources?.length ?? 0
    : (args.sources?.length ?? 0) - unmatchedCount,
}
```

For tool-level validation, log via a NEW `logAiTelemetry()` call (since tool execute runs within a request that already has its own telemetry):

```typescript
logAiTelemetry({
  token: convexToken,
  userId: userId as Id<"users">,
  conversationId: currentConversationId as Id<"conversations">,
  provider: "openrouter",  // or current provider
  model: "tool-validation",
  isPrimaryProvider: true,
  failoverUsed: false,
  mode: isPaperMode ? "paper" : "normal",
  success: validation.valid,
  latencyMs: 0,
  ...refIntegrityTelemetry,
  ...telemetrySkillContext,
})
```

**Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(telemetry): log search skill validation events to aiTelemetry"
```

---

## Task 5: Add Search Skill Query to Convex

**Files:**
- Modify: `convex/aiTelemetry.ts` (add query for search skill overview)

**Step 1: Add getSearchSkillOverview query**

```typescript
export const getSearchSkillOverview = query({
  args: {
    requestorUserId: v.id("users"),
    period: v.union(v.literal("1h"), v.literal("24h"), v.literal("7d")),
  },
  handler: async (ctx, { requestorUserId, period }) => {
    // Auth check: admin or superadmin only (same pattern as getSkillRuntimeOverview)
    const user = await ctx.db.get(requestorUserId)
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      throw new Error("Unauthorized")
    }

    const cutoff = Date.now() - periodToMs(period)
    const records = await ctx.db
      .query("aiTelemetry")
      .withIndex("by_skill_runtime_created", (q) =>
        q.eq("isSkillRuntime", true).gte("createdAt", cutoff)
      )
      .collect()

    const searchSkillRecords = records.filter((r) => r.searchSkillApplied === true)

    let totalApplied = 0
    let totalRejected = 0
    let totalSourcesScored = 0
    let totalSourcesFiltered = 0
    const tierCounts: Record<string, number> = {}
    const bySkill: Record<string, { applied: number; rejected: number }> = {}

    for (const r of searchSkillRecords) {
      totalApplied++
      if (r.searchSkillAction === "rejected") totalRejected++
      totalSourcesScored += r.sourcesScored ?? 0
      totalSourcesFiltered += r.sourcesFiltered ?? 0

      if (r.sourcesPassedTiers) {
        try {
          const tiers = JSON.parse(r.sourcesPassedTiers) as Record<string, number>
          for (const [tier, count] of Object.entries(tiers)) {
            tierCounts[tier] = (tierCounts[tier] ?? 0) + count
          }
        } catch { /* ignore parse errors */ }
      }

      const name = r.searchSkillName ?? "unknown"
      if (!bySkill[name]) bySkill[name] = { applied: 0, rejected: 0 }
      bySkill[name].applied++
      if (r.searchSkillAction === "rejected") bySkill[name].rejected++
    }

    return {
      totalApplied,
      totalRejected,
      rejectionRate: totalApplied > 0 ? totalRejected / totalApplied : 0,
      totalSourcesScored,
      totalSourcesFiltered,
      tierDistribution: tierCounts,
      bySkill,
    }
  },
})
```

**Step 2: Add getSearchSkillTrace query**

Same pattern as `getSkillRuntimeTrace` but filtered to `searchSkillApplied === true`:

```typescript
export const getSearchSkillTrace = query({
  args: {
    requestorUserId: v.id("users"),
    period: v.union(v.literal("1h"), v.literal("24h"), v.literal("7d")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { requestorUserId, period, limit = 30 }) => {
    // Auth check same pattern
    const cutoff = Date.now() - periodToMs(period)
    const records = await ctx.db
      .query("aiTelemetry")
      .withIndex("by_skill_runtime_created", (q) =>
        q.eq("isSkillRuntime", true).gte("createdAt", cutoff)
      )
      .order("desc")
      .collect()

    return records
      .filter((r) => r.searchSkillApplied === true)
      .slice(0, limit)
      .map((r) => ({
        _id: r._id,
        createdAt: r.createdAt,
        conversationId: r.conversationId ?? null,
        searchSkillName: r.searchSkillName ?? "unknown",
        searchSkillAction: r.searchSkillAction ?? "unknown",
        sourcesScored: r.sourcesScored ?? null,
        sourcesFiltered: r.sourcesFiltered ?? null,
        sourcesPassedTiers: r.sourcesPassedTiers ?? null,
        referencesClaimed: r.referencesClaimed ?? null,
        referencesMatched: r.referencesMatched ?? null,
        diversityWarning: r.diversityWarning ?? null,
        stageScope: r.stageScope ?? null,
        mode: r.mode,
        success: r.success,
      }))
  },
})
```

**Step 3: Commit**

```bash
git add convex/aiTelemetry.ts
git commit -m "feat(telemetry): add search skill overview and trace queries"
```

---

## Task 6: Build Search Skill Monitor Panel

**Files:**
- Create: `src/components/ai-ops/panels/SearchSkillMonitorPanel.tsx`
- Modify: `src/components/ai-ops/AiOpsShell.tsx` (or wherever panels are composed — check how SkillMonitorSummaryPanel is mounted)

**Step 1: Create SearchSkillMonitorPanel**

Follow the pattern of `SkillMonitorSummaryPanel.tsx` + `SkillRuntimeTracePanel.tsx` combined into one panel. Use the same design system (Mechanical Grace):

**Summary section (top):**
- Total Applied (count)
- Rejections (count + rate, warn if > 10%)
- Sources Scored / Filtered
- Tier Distribution (mini bar: academic, institutional, news-major, unknown)

**Trace table (bottom):**

| Waktu | Context | Skill | Action | Detail |
|-------|---------|-------|--------|--------|
| time | stage/chat | source-quality | SCORED | 8 scored, 2 filtered (3 academic, 3 news-major, 2 unknown) |
| time | chat | reference-integrity | VALIDATED | 3 claimed, 3 matched |
| time | gagasan | reference-integrity | REJECTED | 1 unmatched URL |

Action badge colors (same pattern as SourceBadge in SkillRuntimeTracePanel):
- SCORED/VALIDATED → emerald
- REJECTED → rose/destructive

**Step 2: Mount in ai-ops**

Find where SkillMonitorSummaryPanel is mounted. Add SearchSkillMonitorPanel as a new section below or beside it. Use the same `useQuery` pattern with `api.aiTelemetry.getSearchSkillOverview` and `api.aiTelemetry.getSearchSkillTrace`.

Check `src/components/ai-ops/` for the shell/layout component that assembles panels. Follow its existing mounting pattern exactly.

**Step 3: Commit**

```bash
git add src/components/ai-ops/panels/SearchSkillMonitorPanel.tsx
git add <shell file if modified>
git commit -m "feat(ai-ops): add Search Skill Monitor panel with overview and trace"
```

---

## Task 7: Full Test Suite + Build Verification

**Step 1: Run all skill tests**

Run: `npx vitest run __tests__/skills/`
Expected: All tests pass (existing + new instruction tests)

**Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Lint**

Run: `npm run lint`
Expected: No new warnings/errors

**Step 5: Build**

Run: `npm run build`
Expected: Build succeeds (this also validates Convex schema changes compile)

**Step 6: Commit any fixes**

If any lint/type issues found, fix and commit.

---

## Summary: File Inventory

| File | Action | Task |
|------|--------|------|
| `src/lib/ai/skills/source-quality.skill.ts` | MODIFY | 1 |
| `__tests__/skills/source-quality.test.ts` | MODIFY | 1 |
| `src/lib/ai/skills/reference-integrity.skill.ts` | MODIFY | 2 |
| `__tests__/skills/reference-integrity.test.ts` | MODIFY | 2 |
| `convex/schema.ts` | MODIFY | 3 |
| `convex/aiTelemetry.ts` | MODIFY | 3, 5 |
| `src/lib/ai/telemetry.ts` | MODIFY | 3 |
| `src/app/api/chat/route.ts` | MODIFY | 4 |
| `src/components/ai-ops/panels/SearchSkillMonitorPanel.tsx` | CREATE | 6 |
| ai-ops shell/layout component | MODIFY | 6 |

**Total: 7 tasks, ~7 commits**
