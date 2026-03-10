# web-search-quality Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor scattered search skill code into a single self-contained `web-search-quality` skill folder following adapted Anthropic skill architecture.

**Architecture:** Migrate two TypeScript skill modules (`source-quality.skill.ts` + `reference-integrity.skill.ts`) into one skill folder with SKILL.md (instructions), scripts/ (deterministic validation), and references/ (data). Server parses SKILL.md at startup, caches in-memory, injects into Gemini compose prompt. Route.ts consumption simplified to 3 call sites.

**Tech Stack:** TypeScript, gray-matter (YAML parsing), Next.js API route, Vitest

**Design Doc:** `docs/search-tool-skills/web-search-quality-skill-design.md`

**Constraints:**
- ALL instructions in SKILL.md MUST be English (model native language)
- `src/lib/ai/skills/` is scoped to search web tools only
- Paper workflow notes stay in route.ts (different domain)

---

## Task 1: Install gray-matter

**Files:**
- Modify: `package.json`

**Step 1: Install gray-matter**

Run: `npm install gray-matter`

**Step 2: Verify installation**

Run: `npm ls gray-matter`
Expected: `gray-matter@X.X.X` listed

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add gray-matter for SKILL.md frontmatter parsing"
```

---

## Task 2: Create shared types

**Files:**
- Create: `src/lib/ai/skills/types.ts` (overwrite existing)

**Step 1: Write the types file**

Replace existing `types.ts` with simplified version — remove generic `Skill<T>` interface, keep only what's needed:

```typescript
export interface SkillContext {
  isPaperMode: boolean
  currentStage: string | null
  hasRecentSources: boolean
  availableSources: SourceEntry[]
}

export interface SourceEntry {
  url: string
  title: string
  publishedAt?: number
}

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string; suggestion?: string }
```

**Step 2: Verify no compile errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: May show existing errors, but no NEW errors from types.ts

**Step 3: Commit**

```bash
git add src/lib/ai/skills/types.ts
git commit -m "refactor: simplify skill types — remove generic Skill<T> interface"
```

---

## Task 3: Create references/domain-tiers.ts

**Files:**
- Create: `src/lib/ai/skills/web-search-quality/references/domain-tiers.ts`

**Step 1: Write the data module**

Extract domain lists and score constants from `source-quality.skill.ts` into a data-only module. No logic, no functions — only type, constants, and arrays.

```typescript
export type DomainTier =
  | "academic"
  | "institutional"
  | "news-major"
  | "news-local"
  | "unknown"
  | "blocked"

export const BASE_SCORES: Record<DomainTier, number> = {
  academic: 90,
  institutional: 80,
  "news-major": 70,
  "news-local": 50,
  unknown: 40,
  blocked: 0,
}

export const MIN_QUALITY_SCORE = 30

export const ACADEMIC_DOMAINS = [
  "scholar.google.com",
  "pubmed.ncbi.nlm.nih.gov",
  "arxiv.org",
  "jstor.org",
  "researchgate.net",
  "semanticscholar.org",
  "sciencedirect.com",
  "springer.com",
  "nature.com",
  "wiley.com",
  "ieee.org",
  "acm.org",
  "plos.org",
  "doi.org",
]

export const INSTITUTIONAL_DOMAINS = [
  "who.int",
  "worldbank.org",
  "un.org",
  "imf.org",
  "oecd.org",
  "bps.go.id",
  "bi.go.id",
]

export const MAJOR_NEWS_DOMAINS = [
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "nytimes.com",
  "theguardian.com",
  "washingtonpost.com",
  "ft.com",
  "bloomberg.com",
  "economist.com",
  "kompas.com",
  "tempo.co",
  "cnnindonesia.com",
]
```

**Step 2: Verify no compile errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/lib/ai/skills/web-search-quality/references/domain-tiers.ts
git commit -m "refactor: extract domain tier data to references/domain-tiers.ts"
```

---

## Task 4: Create scripts/score-sources.ts

**Files:**
- Create: `src/lib/ai/skills/web-search-quality/scripts/score-sources.ts`
- Test: `__tests__/skills/score-sources.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest"
import {
  classifyDomain,
  scoreSources,
} from "@/lib/ai/skills/web-search-quality/scripts/score-sources"

describe("score-sources", () => {
  describe("classifyDomain", () => {
    it("classifies academic domains", () => {
      expect(classifyDomain("https://arxiv.org/abs/2401.12345")).toBe("academic")
      expect(classifyDomain("https://scholar.google.com/scholar?q=test")).toBe("academic")
      expect(classifyDomain("https://repository.ui.ac.id/paper")).toBe("academic")
    })

    it("classifies institutional domains", () => {
      expect(classifyDomain("https://bps.go.id/data")).toBe("institutional")
      expect(classifyDomain("https://data.worldbank.org/indicator")).toBe("institutional")
    })

    it("classifies major news", () => {
      expect(classifyDomain("https://kompas.com/article")).toBe("news-major")
      expect(classifyDomain("https://reuters.com/world")).toBe("news-major")
    })

    it("classifies blocked domains", () => {
      expect(classifyDomain("https://en.wikipedia.org/wiki/Test")).toBe("blocked")
      expect(classifyDomain("https://reddit.com/r/test")).toBe("blocked")
    })

    it("classifies unknown domains", () => {
      expect(classifyDomain("https://randomsite.com/article")).toBe("unknown")
    })
  })

  describe("scoreSources", () => {
    it("filters sources below quality threshold", () => {
      const result = scoreSources([
        { url: "https://en.wikipedia.org/wiki/AI", title: "AI Wikipedia" },
        { url: "https://arxiv.org/abs/2401.12345", title: "Deep Learning Research Paper" },
      ])
      expect(result.valid).toBe(true)
      expect(result.scoredSources).toHaveLength(1)
      expect(result.scoredSources[0].url).toContain("arxiv.org")
      expect(result.filteredOut).toHaveLength(1)
    })

    it("returns invalid when all sources are below threshold", () => {
      const result = scoreSources([
        { url: "https://en.wikipedia.org/wiki/AI", title: "AI" },
        { url: "https://reddit.com/r/ai", title: "Reddit AI" },
      ])
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it("returns valid with empty sources", () => {
      const result = scoreSources([])
      expect(result.valid).toBe(true)
    })

    it("detects low diversity (3+ from same domain)", () => {
      const result = scoreSources([
        { url: "https://kompas.com/article-1", title: "Article One About Topic" },
        { url: "https://kompas.com/article-2", title: "Article Two About Topic" },
        { url: "https://kompas.com/article-3", title: "Article Three About Topic" },
      ])
      expect(result.valid).toBe(true)
      expect(result.diversityWarning).toBeDefined()
      expect(result.diversityWarning).toContain("kompas.com")
    })

    it("applies scoring bonuses and penalties", () => {
      const result = scoreSources([
        { url: "https://arxiv.org/", title: "ArXiv" },
        { url: "https://arxiv.org/abs/2401.12345", title: "Deep Learning Research Paper" },
      ])
      expect(result.scoredSources).toHaveLength(2)
      const homepage = result.scoredSources.find(s => s.url === "https://arxiv.org/")!
      const article = result.scoredSources.find(s => s.url.includes("abs"))!
      expect(article.score).toBeGreaterThan(homepage.score)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/skills/score-sources.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Migrate logic from `source-quality.skill.ts` (lines 92-255) into `scripts/score-sources.ts`. Import domain data from `references/domain-tiers.ts` and blocked domains from `@/lib/ai/blocked-domains`.

Exported functions:
- `classifyDomain(url: string): DomainTier`
- `scoreSource(url: string, title: string): ScoredSource`
- `checkDiversity(scored: ScoredSource[]): string | undefined`
- `scoreSources(sources: SourceEntry[]): ScoreResult` (main export, replaces `validateWithScores`)

Exported types:
- `ScoredSource { url, title, tier, score }`
- `ScoreResult { valid, scoredSources, filteredOut, diversityWarning?, error?, suggestion? }`

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/skills/score-sources.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add __tests__/skills/score-sources.test.ts src/lib/ai/skills/web-search-quality/scripts/score-sources.ts
git commit -m "feat: create score-sources.ts script for web-search-quality skill"
```

---

## Task 5: Create scripts/check-references.ts

**Files:**
- Create: `src/lib/ai/skills/web-search-quality/scripts/check-references.ts`
- Test: `__tests__/skills/check-references.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest"
import {
  checkReferences,
  canonicalizeUrl,
} from "@/lib/ai/skills/web-search-quality/scripts/check-references"

describe("check-references", () => {
  describe("canonicalizeUrl", () => {
    it("strips UTM parameters", () => {
      expect(canonicalizeUrl("https://example.com/page?utm_source=google&utm_medium=cpc"))
        .toBe("https://example.com/page")
    })

    it("strips hash fragments", () => {
      expect(canonicalizeUrl("https://example.com/page#section"))
        .toBe("https://example.com/page")
    })

    it("strips trailing slash", () => {
      expect(canonicalizeUrl("https://example.com/page/"))
        .toBe("https://example.com/page")
    })

    it("handles invalid URLs gracefully", () => {
      expect(canonicalizeUrl("not-a-url")).toBe("not-a-url")
    })
  })

  describe("checkReferences", () => {
    const available = [
      { url: "https://arxiv.org/abs/2401.12345", title: "Paper A" },
      { url: "https://bps.go.id/data/123", title: "BPS Data" },
    ]

    it("validates matching sources for createArtifact", () => {
      const result = checkReferences({
        toolName: "createArtifact",
        claimedSources: [{ url: "https://arxiv.org/abs/2401.12345", title: "Paper A" }],
        availableSources: available,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(true)
    })

    it("rejects fabricated URLs for createArtifact", () => {
      const result = checkReferences({
        toolName: "createArtifact",
        claimedSources: [{ url: "https://fabricated.com/fake", title: "Fake" }],
        availableSources: available,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain("fabricated.com")
    })

    it("requires sources when search results are available for createArtifact", () => {
      const result = checkReferences({
        toolName: "createArtifact",
        claimedSources: [],
        availableSources: available,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(false)
    })

    it("passes when no recent sources exist", () => {
      const result = checkReferences({
        toolName: "createArtifact",
        claimedSources: [],
        availableSources: [],
        hasRecentSources: false,
      })
      expect(result.valid).toBe(true)
    })

    it("validates updateStageData references with URL matching", () => {
      const result = checkReferences({
        toolName: "updateStageData",
        claimedReferences: [
          { title: "Paper A", url: "https://arxiv.org/abs/2401.12345", authors: "Author" },
        ],
        availableSources: available,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(true)
    })

    it("allows updateStageData references without URL", () => {
      const result = checkReferences({
        toolName: "updateStageData",
        claimedReferences: [
          { title: "Paper A", authors: "Author" },
        ],
        availableSources: available,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(true)
    })

    it("matches URLs with UTM parameters stripped", () => {
      const result = checkReferences({
        toolName: "createArtifact",
        claimedSources: [
          { url: "https://arxiv.org/abs/2401.12345?utm_source=google", title: "Paper A" },
        ],
        availableSources: available,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(true)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/skills/check-references.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Migrate logic from `reference-integrity.skill.ts` (lines 11-124) into `scripts/check-references.ts`.

Exported functions:
- `canonicalizeUrl(raw: string): string`
- `checkReferences(args: ReferenceCheckArgs): ValidationResult`

Exported types:
- `ReferenceCheckArgs { toolName, claimedSources?, claimedReferences?, availableSources, hasRecentSources }`

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/skills/check-references.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add __tests__/skills/check-references.test.ts src/lib/ai/skills/web-search-quality/scripts/check-references.ts
git commit -m "feat: create check-references.ts script for web-search-quality skill"
```

---

## Task 6: Create SKILL.md

**Files:**
- Create: `src/lib/ai/skills/web-search-quality/SKILL.md`

**Step 1: Write SKILL.md**

Migrate instruction content from `source-quality.skill.ts` `instructions()` and `reference-integrity.skill.ts` `instructions()`. **Translate all instructions to English.** Structure:

```markdown
---
name: web-search-quality
description: >
  Strengthens Gemini 2.5 Flash in processing web search results from
  Perplexity/Grok. Source scoring, quality filtering, professional-grade
  research narration, and reference integrity validation.
scope: search-web
timing:
  pre-compose: scripts/score-sources.ts
  at-compose: instructions
  post-compose: scripts/check-references.ts
---

## RESEARCH SOURCE STRATEGY

[Migrate from source-quality.skill.ts instructions() — translate to English]
[Content: evaluate substance, source selection by purpose, build narrative, diversification]

## REFERENCE INTEGRITY

[Migrate from reference-integrity.skill.ts instructions() — translate to English]
[Content: integration not decoration, source honesty, claim-source alignment, when to request more]

## STAGE CONTEXT

### gagasan
Exploration phase: seek breadth, not depth. 3-5 diverse sources to map the landscape.

### topik
[Migrate from getStageGuidance() — translate to English]

### tinjauan_literatur
[Migrate from getStageGuidance()]

### pendahuluan
[Migrate from getStageGuidance()]

### metodologi
[Migrate from getStageGuidance()]

### diskusi
[Migrate from getStageGuidance()]

### default
Chat mode: match depth to the question. Casual = 2-3 sources sufficient. Serious inquiry = treat as mini literature review.
```

**Important:** ALL content in English. No Indonesian in instructions.

**Step 2: Verify file is valid Markdown with valid YAML frontmatter**

Run: `node -e "const m = require('gray-matter'); const f = require('fs'); const r = m(f.readFileSync('src/lib/ai/skills/web-search-quality/SKILL.md','utf-8')); console.log('name:', r.data.name); console.log('sections:', r.content.match(/^## /gm)?.length ?? 0)"`
Expected: `name: web-search-quality`, `sections: 3`

**Step 3: Commit**

```bash
git add src/lib/ai/skills/web-search-quality/SKILL.md
git commit -m "feat: create SKILL.md for web-search-quality skill"
```

---

## Task 7: Create web-search-quality/index.ts

**Files:**
- Create: `src/lib/ai/skills/web-search-quality/index.ts`
- Test: `__tests__/skills/web-search-quality-index.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest"
import { webSearchQualitySkill } from "@/lib/ai/skills/web-search-quality"

describe("web-search-quality skill", () => {
  it("has correct name", () => {
    expect(webSearchQualitySkill.name).toBe("web-search-quality")
  })

  it("returns instructions for chat mode", () => {
    const result = webSearchQualitySkill.getInstructions({
      isPaperMode: false,
      currentStage: null,
      hasRecentSources: true,
      availableSources: [{ url: "https://arxiv.org/abs/123", title: "Test" }],
    })
    expect(result).not.toBeNull()
    expect(result).toContain("RESEARCH SOURCE STRATEGY")
    expect(result).toContain("REFERENCE INTEGRITY")
  })

  it("returns null for passive paper stages", () => {
    const result = webSearchQualitySkill.getInstructions({
      isPaperMode: true,
      currentStage: "outline",
      hasRecentSources: true,
      availableSources: [{ url: "https://arxiv.org/abs/123", title: "Test" }],
    })
    expect(result).toBeNull()
  })

  it("includes stage guidance for active paper stages", () => {
    const result = webSearchQualitySkill.getInstructions({
      isPaperMode: true,
      currentStage: "tinjauan_literatur",
      hasRecentSources: true,
      availableSources: [{ url: "https://arxiv.org/abs/123", title: "Test" }],
    })
    expect(result).not.toBeNull()
    expect(result).toContain("STAGE CONTEXT")
  })

  it("returns null when no recent sources and not paper mode", () => {
    const result = webSearchQualitySkill.getInstructions({
      isPaperMode: false,
      currentStage: null,
      hasRecentSources: false,
      availableSources: [],
    })
    expect(result).toBeNull()
  })

  it("exposes scoreSources function", () => {
    const result = webSearchQualitySkill.scoreSources([
      { url: "https://arxiv.org/abs/123", title: "A Research Paper Title" },
    ])
    expect(result.valid).toBe(true)
    expect(result.scoredSources).toHaveLength(1)
  })

  it("exposes checkReferences function", () => {
    const result = webSearchQualitySkill.checkReferences({
      toolName: "createArtifact",
      claimedSources: [{ url: "https://arxiv.org/abs/123", title: "Test" }],
      availableSources: [{ url: "https://arxiv.org/abs/123", title: "Test" }],
      hasRecentSources: true,
    })
    expect(result.valid).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/skills/web-search-quality-index.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Key implementation details:
- Read SKILL.md using `fs.readFileSync` + `path.join(__dirname, "SKILL.md")`
- Parse frontmatter with `gray-matter`
- Split body by `## ` headers into `Map<string, string>`
- Split `## STAGE CONTEXT` by `### ` into `Map<string, string>`
- Cache parsed result in module-level variable
- Import `ACTIVE_SEARCH_STAGES` from `@/lib/ai/stage-skill-contracts` for passive stage check
- `getInstructions()` returns null for passive stages or when no sources and not paper mode
- `getInstructions()` composes: RESEARCH SOURCE STRATEGY + REFERENCE INTEGRITY + matching stage guidance

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/skills/web-search-quality-index.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/lib/ai/skills/web-search-quality/index.ts __tests__/skills/web-search-quality-index.test.ts
git commit -m "feat: create web-search-quality skill entry point with SKILL.md parsing"
```

---

## Task 8: Create top-level skills registry

**Files:**
- Modify: `src/lib/ai/skills/index.ts` (overwrite existing)

**Step 1: Write the new registry**

Replace existing `index.ts` with focused search skill registry:

```typescript
import { webSearchQualitySkill, type WebSearchSkill } from "./web-search-quality"
import type { SkillContext } from "./types"

export function getSearchSkill(): WebSearchSkill {
  return webSearchQualitySkill
}

export function composeSkillInstructions(context: SkillContext): string {
  return webSearchQualitySkill.getInstructions(context) ?? ""
}

export { webSearchQualitySkill } from "./web-search-quality"
export type { WebSearchSkill } from "./web-search-quality"
export type { SkillContext, ValidationResult, SourceEntry } from "./types"
```

**Step 2: Verify no compile errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/lib/ai/skills/index.ts
git commit -m "refactor: replace generic skill registry with focused search skill entry"
```

---

## Task 9: Update route.ts imports and consumption

**Files:**
- Modify: `src/app/api/chat/route.ts`

This is the most critical task. Changes spread across 3748 lines. Execute carefully in sub-steps.

**Step 1: Update imports (line ~49)**

Replace:
```typescript
import { referenceIntegritySkill, validateWithScores, getToolExamples, composeSkillInstructions, type SkillContext } from "@/lib/ai/skills"
```

With:
```typescript
import { getSearchSkill, composeSkillInstructions, type SkillContext } from "@/lib/ai/skills"
```

Add at top of POST handler (after auth checks, before skill usage):
```typescript
const skill = getSearchSkill()
```

**Step 2: Replace validateWithScores calls**

2 call sites:

1. **Perplexity path** (line ~2328-2363): Replace `validateWithScores({ sources: qualityInput })` with `skill.scoreSources(qualityInput)`
2. **Grok fallback path** (line ~3327-3369): Replace `validateWithScores({ sources: grokQualityInput })` with `skill.scoreSources(grokQualityInput)`

Note: `ScoreResult` type has same shape as old `SourceQualityResult` — no downstream changes needed.

**Step 3: Replace referenceIntegritySkill.validate calls**

2 call sites:

1. **createArtifact tool** (line ~1428): Replace `referenceIntegritySkill.validate({...})` with `skill.checkReferences({...})`
2. **updateArtifact tool** (line ~1539): Replace `referenceIntegritySkill.validate({...})` with `skill.checkReferences({...})`

Args shape is the same — no downstream changes needed.

**Step 4: Clean up SkillContext assembly duplication**

Currently assembled at 3 locations (lines ~689, ~2433, ~3429). Extract to a helper at top of handler scope:

```typescript
function buildSkillContext(overrides?: Partial<SkillContext>): SkillContext {
  return {
    isPaperMode: !!paperModePrompt,
    currentStage: paperSession?.currentStage ?? null,
    hasRecentSources: false,
    availableSources: [],
    ...overrides,
  }
}
```

Replace all 3 inline assemblies with `buildSkillContext({ hasRecentSources: true, availableSources: ... })`.

**Step 5: Remove hardcoded tool instruction strings**

Remove `📚 SOURCES:...` strings from createArtifact and updateArtifact tool descriptions (lines ~1405, ~1520). These instructions now live in SKILL.md and are injected via `getInstructions()`.

Also remove `getToolExamples()` calls from tool descriptions.

**Step 6: Simplify AVAILABLE_WEB_SOURCES construction**

At line ~696, currently:
```typescript
sourcesContext = `AVAILABLE_WEB_SOURCES...\n${skillInstructions}`
```

Simplify — skill instructions are injected separately at compose phase. Sources context should just be the sources list.

**Step 7: Verify build**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new errors

**Step 8: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "refactor: route.ts consumes web-search-quality skill via unified interface"
```

---

## Task 10: Update paper-tools.ts import

**Files:**
- Modify: `src/lib/ai/paper-tools.ts`

**Step 1: Remove getToolExamples import and usage**

At line 2: Remove `import { getToolExamples } from "@/lib/ai/skills"`
At line ~120-122: Remove `getToolExamples("updateStageData")` template literal. Keep the rest of the description string intact.

**Step 2: Verify build**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/lib/ai/paper-tools.ts
git commit -m "refactor: remove getToolExamples from paper-tools.ts — now in SKILL.md"
```

---

## Task 11: Delete old skill files

**Files:**
- Delete: `src/lib/ai/skills/source-quality.skill.ts`
- Delete: `src/lib/ai/skills/reference-integrity.skill.ts`

**Step 1: Verify no remaining imports of old files**

Run: `grep -r "source-quality.skill\|reference-integrity.skill" src/ --include="*.ts" --include="*.tsx"`
Expected: No matches

**Step 2: Delete files**

```bash
rm src/lib/ai/skills/source-quality.skill.ts
rm src/lib/ai/skills/reference-integrity.skill.ts
```

**Step 3: Verify build still passes**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 4: Commit**

```bash
git add -u src/lib/ai/skills/
git commit -m "refactor: remove old skill files — consolidated into web-search-quality/"
```

---

## Task 12: Run full test suite and build

**Files:** None (verification only)

**Step 1: Run all skill tests**

Run: `npx vitest run __tests__/skills/`
Expected: ALL PASS

**Step 2: Run full test suite**

Run: `npm run test`
Expected: No regressions

**Step 3: Run lint**

Run: `npm run lint`
Expected: No new lint errors

**Step 4: Verify production build**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit any lint fixes if needed**

```bash
git add -A
git commit -m "fix: lint and build fixes after skill refactor"
```

---

## Task Summary

| Task | Description | Type |
|------|-------------|------|
| 1 | Install gray-matter | Setup |
| 2 | Create shared types.ts | Foundation |
| 3 | Create references/domain-tiers.ts | Data |
| 4 | Create scripts/score-sources.ts + tests | Script (TDD) |
| 5 | Create scripts/check-references.ts + tests | Script (TDD) |
| 6 | Create SKILL.md | Instructions |
| 7 | Create web-search-quality/index.ts + tests | Entry point (TDD) |
| 8 | Create top-level skills/index.ts | Registry |
| 9 | Update route.ts consumption | Integration |
| 10 | Update paper-tools.ts import | Cleanup |
| 11 | Delete old skill files | Cleanup |
| 12 | Run full test suite + build | Verification |
