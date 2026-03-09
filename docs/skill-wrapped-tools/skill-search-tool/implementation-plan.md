# Skill-Wrapped Tools: Search Pilot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement two skill modules (reference-integrity + source-quality) that replace system notes with enforced validation for web search tools.

**Architecture:** Skills are TypeScript modules in `src/lib/ai/skills/` with three layers each: instructions (prompt), validation (code), examples (behavioral). They wire into existing enforcement points — `execute()` handlers for tool-boundary skills, citation pipeline for pipeline skills. No new middleware or layers.

**Tech Stack:** TypeScript, Vercel AI SDK v5 (streamText + tool handlers), Vitest for tests

**Design Doc:** `docs/skill-wrapped-tools/skill-search-tool/design.md`
**Foundation Doc:** `docs/skill-wrapped-tools/README.md`

---

## Task 1: Create Skill Types

**Files:**
- Create: `src/lib/ai/skills/types.ts`

**Step 1: Write the failing test**

Create test file:

```typescript
// __tests__/skills/skill-types.test.ts
import { describe, it, expect } from "vitest"
import type {
  Skill,
  SkillContext,
  SourceEntry,
  ValidationResult,
  ToolExample,
} from "@/lib/ai/skills/types"

describe("Skill types", () => {
  it("should allow creating a valid Skill implementation", () => {
    const skill: Skill<{ foo: string }> = {
      name: "test-skill",
      wrappedTools: ["toolA"],
      instructions: () => "test instructions",
      validate: (args) => {
        if (!args.foo) return { valid: false, error: "missing foo" }
        return { valid: true }
      },
      examples: [],
    }

    expect(skill.name).toBe("test-skill")
    expect(skill.wrappedTools).toEqual(["toolA"])
    expect(skill.instructions({
      isPaperMode: false,
      currentStage: null,
      hasRecentSources: false,
      availableSources: [],
    })).toBe("test instructions")
    expect(skill.validate({ foo: "bar" })).toEqual({ valid: true })
    expect(skill.validate({ foo: "" })).toEqual({ valid: false, error: "missing foo" })
  })

  it("should allow null instructions for irrelevant context", () => {
    const skill: Skill = {
      name: "conditional",
      wrappedTools: [],
      instructions: (ctx) => ctx.hasRecentSources ? "active" : null,
      validate: () => ({ valid: true }),
      examples: [],
    }

    expect(skill.instructions({
      isPaperMode: false,
      currentStage: null,
      hasRecentSources: false,
      availableSources: [],
    })).toBeNull()

    expect(skill.instructions({
      isPaperMode: false,
      currentStage: null,
      hasRecentSources: true,
      availableSources: [],
    })).toBe("active")
  })

  it("should support ValidationResult with suggestion", () => {
    const result: ValidationResult = {
      valid: false,
      error: "bad input",
      suggestion: "try this instead",
    }
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.suggestion).toBe("try this instead")
    }
  })

  it("should support ToolExample structure", () => {
    const example: ToolExample = {
      toolName: "createArtifact",
      scenario: "test scenario",
      correctArgs: { type: "section", sources: [] },
      incorrectArgs: { type: "section" },
      explanation: "sources required",
    }
    expect(example.toolName).toBe("createArtifact")
    expect(example.incorrectArgs).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/skills/skill-types.test.ts`
Expected: FAIL — `Cannot find module '@/lib/ai/skills/types'`

**Step 3: Write minimal implementation**

```typescript
// src/lib/ai/skills/types.ts

/**
 * Context yang di-pass ke skill instructions().
 * Setiap skill bisa pakai subset yang relevan.
 */
export interface SkillContext {
  /** Apakah sedang dalam paper writing mode */
  isPaperMode: boolean
  /** Stage paper saat ini (null jika bukan paper mode) */
  currentStage: string | null
  /** Apakah ada web search sources di conversation terbaru */
  hasRecentSources: boolean
  /** Web sources dari search sebelumnya (untuk cross-validation) */
  availableSources: SourceEntry[]
}

export interface SourceEntry {
  url: string
  title: string
  publishedAt?: number
}

/**
 * Hasil validasi skill.
 * valid: true -> tool proceed normal
 * valid: false -> tool return error, AI retry
 */
export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string; suggestion?: string }

/**
 * Contoh penggunaan tool yang benar.
 * Di-inject ke tool description sebagai behavioral demonstration.
 */
export interface ToolExample {
  /** Nama tool yang di-contohkan */
  toolName: string
  /** Deskripsi singkat scenario */
  scenario: string
  /** Input args yang benar */
  correctArgs: Record<string, unknown>
  /** Input args yang SALAH (opsional, untuk kontras) */
  incorrectArgs?: Record<string, unknown>
  /** Penjelasan kenapa benar/salah */
  explanation: string
}

/**
 * Base interface untuk semua skills.
 *
 * TValidateArgs: tipe args yang diterima validate().
 * - Tool-Boundary Skill: args dari tool execute() handler
 * - Pipeline Skill: data dari processing pipeline
 */
export interface Skill<TValidateArgs = unknown> {
  /** Nama unik skill (untuk registry dan logging) */
  name: string

  /** Tools yang di-wrap oleh skill ini (kosong untuk Pipeline Skill) */
  wrappedTools: string[]

  /**
   * Generate instructions text berdasarkan context.
   * Output di-inject ke system message, menggantikan system notes.
   */
  instructions(context: SkillContext): string | null

  /**
   * Validasi - dipanggil dari dalam tool execute() handler
   * atau dari pipeline processing code.
   */
  validate(args: TValidateArgs): ValidationResult

  /**
   * Contoh penggunaan tool yang benar.
   * Behavioral demonstration untuk meningkatkan accuracy.
   */
  examples: ToolExample[]
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/skills/skill-types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add __tests__/skills/skill-types.test.ts src/lib/ai/skills/types.ts
git commit -m "feat(skills): add skill type definitions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Create Reference Integrity Skill

**Files:**
- Create: `src/lib/ai/skills/reference-integrity.skill.ts`
- Test: `__tests__/skills/reference-integrity.test.ts`
- Reference: `src/lib/ai/artifact-sources-policy.ts` (existing embryo — being absorbed)
- Reference: `src/lib/citations/apaWeb.ts` for `normalizeWebSearchUrl()`

**Important context:**
- `canonicalizeCitationUrl` is currently defined inline in route.ts (line 2319). This skill needs URL canonicalization. We'll create a simple inline version matching route.ts behavior (strip utm params, hash, trailing slash). We do NOT import from apaWeb — the design doc was wrong about `canonicalizeCitationUrl` being there.
- The `normalizeWebSearchUrl` function IS in apaWeb.ts (exported at line 118) but it does different things (unwraps Google proxy URLs). We need our own simple canonicalize for comparison.

**Step 1: Write the failing tests**

```typescript
// __tests__/skills/reference-integrity.test.ts
import { describe, it, expect } from "vitest"
import { referenceIntegritySkill } from "@/lib/ai/skills/reference-integrity.skill"
import type { SkillContext, SourceEntry } from "@/lib/ai/skills/types"

const makeContext = (overrides?: Partial<SkillContext>): SkillContext => ({
  isPaperMode: false,
  currentStage: null,
  hasRecentSources: false,
  availableSources: [],
  ...overrides,
})

const availableSources: SourceEntry[] = [
  { url: "https://arxiv.org/abs/2024.12345", title: "AI Study" },
  { url: "https://kompas.com/article/123", title: "Berita Pendidikan" },
  { url: "https://nature.com/articles/s999", title: "Nature Paper" },
]

describe("referenceIntegritySkill", () => {
  describe("metadata", () => {
    it("should have correct name and wrapped tools", () => {
      expect(referenceIntegritySkill.name).toBe("reference-integrity")
      expect(referenceIntegritySkill.wrappedTools).toContain("createArtifact")
      expect(referenceIntegritySkill.wrappedTools).toContain("updateArtifact")
      expect(referenceIntegritySkill.wrappedTools).toContain("updateStageData")
    })

    it("should have examples", () => {
      expect(referenceIntegritySkill.examples.length).toBeGreaterThan(0)
    })
  })

  describe("instructions", () => {
    it("should return null when no recent sources", () => {
      expect(referenceIntegritySkill.instructions(makeContext())).toBeNull()
    })

    it("should return instructions when recent sources exist", () => {
      const result = referenceIntegritySkill.instructions(
        makeContext({ hasRecentSources: true })
      )
      expect(result).toContain("REFERENCE INTEGRITY RULES")
      expect(result).toContain("AVAILABLE_WEB_SOURCES")
    })
  })

  describe("validate — createArtifact / updateArtifact", () => {
    it("should skip validation when no recent sources", () => {
      const result = referenceIntegritySkill.validate({
        toolName: "createArtifact",
        availableSources: [],
        hasRecentSources: false,
      })
      expect(result.valid).toBe(true)
    })

    it("should reject when sources missing but recent sources exist", () => {
      const result = referenceIntegritySkill.validate({
        toolName: "createArtifact",
        claimedSources: undefined,
        availableSources,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain("sources")
        expect(result.suggestion).toBeDefined()
      }
    })

    it("should reject when sources is empty array", () => {
      const result = referenceIntegritySkill.validate({
        toolName: "createArtifact",
        claimedSources: [],
        availableSources,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(false)
    })

    it("should pass when all claimed sources match available", () => {
      const result = referenceIntegritySkill.validate({
        toolName: "createArtifact",
        claimedSources: [
          { url: "https://arxiv.org/abs/2024.12345", title: "AI Study" },
        ],
        availableSources,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(true)
    })

    it("should reject when claimed URL not in available sources", () => {
      const result = referenceIntegritySkill.validate({
        toolName: "updateArtifact",
        claimedSources: [
          { url: "https://fabricated.com/fake-paper", title: "Fake" },
        ],
        availableSources,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain("fabricated.com")
      }
    })

    it("should match URLs with trailing slash difference", () => {
      const result = referenceIntegritySkill.validate({
        toolName: "createArtifact",
        claimedSources: [
          { url: "https://arxiv.org/abs/2024.12345/", title: "AI Study" },
        ],
        availableSources,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(true)
    })

    it("should match URLs ignoring utm params", () => {
      const result = referenceIntegritySkill.validate({
        toolName: "createArtifact",
        claimedSources: [
          { url: "https://kompas.com/article/123?utm_source=google", title: "Berita" },
        ],
        availableSources,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(true)
    })
  })

  describe("validate — updateStageData", () => {
    it("should skip when no claimed references", () => {
      const result = referenceIntegritySkill.validate({
        toolName: "updateStageData",
        claimedReferences: undefined,
        availableSources,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(true)
    })

    it("should skip references without URL", () => {
      const result = referenceIntegritySkill.validate({
        toolName: "updateStageData",
        claimedReferences: [
          { title: "Some Book", authors: "Author" },
        ],
        availableSources,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(true)
    })

    it("should pass when reference URLs match available sources", () => {
      const result = referenceIntegritySkill.validate({
        toolName: "updateStageData",
        claimedReferences: [
          { title: "AI Study", url: "https://arxiv.org/abs/2024.12345", authors: "Doe" },
        ],
        availableSources,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(true)
    })

    it("should reject when reference URL not in available sources", () => {
      const result = referenceIntegritySkill.validate({
        toolName: "updateStageData",
        claimedReferences: [
          { title: "Fake Paper", url: "https://fake-journal.com/paper", authors: "Nobody" },
        ],
        availableSources,
        hasRecentSources: true,
      })
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain("fake-journal.com")
      }
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/skills/reference-integrity.test.ts`
Expected: FAIL — Cannot find module

**Step 3: Write implementation**

```typescript
// src/lib/ai/skills/reference-integrity.skill.ts

import type { Skill, SkillContext, SourceEntry, ValidationResult, ToolExample } from './types'

// ═══════════════════════════════════════════════════════════════
// Validate Args
// ═══════════════════════════════════════════════════════════════

interface ReferenceValidateArgs {
  toolName: 'createArtifact' | 'updateArtifact' | 'updateStageData'
  claimedSources?: SourceEntry[]
  claimedReferences?: Array<{ title: string; url?: string; authors?: string }>
  availableSources: SourceEntry[]
  hasRecentSources: boolean
}

// ═══════════════════════════════════════════════════════════════
// URL Canonicalization (matches route.ts canonicalizeCitationUrl)
// ═══════════════════════════════════════════════════════════════

function canonicalizeUrl(raw: string): string {
  try {
    const u = new URL(raw)
    for (const key of Array.from(u.searchParams.keys())) {
      if (/^utm_/i.test(key)) u.searchParams.delete(key)
    }
    u.hash = ""
    const out = u.toString()
    return out.endsWith("/") ? out.slice(0, -1) : out
  } catch {
    return raw
  }
}

// ═══════════════════════════════════════════════════════════════
// Skill Implementation
// ═══════════════════════════════════════════════════════════════

export const referenceIntegritySkill: Skill<ReferenceValidateArgs> = {
  name: 'reference-integrity',

  wrappedTools: ['createArtifact', 'updateArtifact', 'updateStageData'],

  instructions(context: SkillContext): string | null {
    if (!context.hasRecentSources) return null

    return `══════════════════════════════════════════════════════════════
REFERENCE INTEGRITY RULES
══════════════════════════════════════════════════════════════

Kamu memiliki akses ke AVAILABLE_WEB_SOURCES dari web search sebelumnya.

ATURAN WAJIB:
1. Saat membuat artifact (createArtifact/updateArtifact) yang merujuk
   hasil search, WAJIB pass parameter 'sources' dengan URL yang COCOK
   dari AVAILABLE_WEB_SOURCES.

2. Saat menyimpan referensi di updateStageData (referensiAwal,
   referensiPendukung, referensi, sitasiAPA, sitasiTambahan),
   gunakan data dari AVAILABLE_WEB_SOURCES — bukan fabricated.

3. Jika ingin menyebut referensi yang BUKAN dari search results
   (misalnya dari training data), WAJIB tandai dengan:
   "Referensi dari pengetahuan umum, bukan dari hasil pencarian web"

YANG DILARANG:
- Fabricate URL yang tidak ada di search results
- Fabricate judul paper/artikel yang tidak ada di search results
- Fabricate nama penulis yang tidak ada di search results
- Pass sources kosong saat ada AVAILABLE_WEB_SOURCES

Tool akan MENOLAK jika referensi yang kamu claim tidak cocok dengan
search results yang tersedia.
══════════════════════════════════════════════════════════════`
  },

  validate(args: ReferenceValidateArgs): ValidationResult {
    const { toolName, claimedSources, claimedReferences, availableSources, hasRecentSources } = args

    // Skip validation jika tidak ada sources di conversation
    if (!hasRecentSources || availableSources.length === 0) {
      return { valid: true }
    }

    // Validate createArtifact / updateArtifact
    if (toolName === 'createArtifact' || toolName === 'updateArtifact') {
      if (!claimedSources || claimedSources.length === 0) {
        return {
          valid: false,
          error: `Parameter 'sources' wajib diisi untuk ${toolName} karena tersedia AVAILABLE_WEB_SOURCES di percakapan ini.`,
          suggestion: `Pass sources dari AVAILABLE_WEB_SOURCES: ${availableSources.slice(0, 3).map(s => s.url).join(', ')}`,
        }
      }

      const availableUrls = new Set(availableSources.map(s => canonicalizeUrl(s.url)))
      const unmatched = claimedSources.filter(s => !availableUrls.has(canonicalizeUrl(s.url)))

      if (unmatched.length > 0) {
        return {
          valid: false,
          error: `${unmatched.length} URL di parameter 'sources' tidak ditemukan di AVAILABLE_WEB_SOURCES: ${unmatched.map(s => s.url).join(', ')}`,
          suggestion: `Gunakan HANYA URL dari AVAILABLE_WEB_SOURCES. URL yang tersedia: ${availableSources.map(s => s.url).join(', ')}`,
        }
      }
    }

    // Validate updateStageData (referensi fields)
    if (toolName === 'updateStageData' && claimedReferences && claimedReferences.length > 0) {
      const refsWithUrl = claimedReferences.filter(r => r.url && r.url.trim() !== '')
      if (refsWithUrl.length > 0) {
        const availableUrls = new Set(availableSources.map(s => canonicalizeUrl(s.url)))
        const unmatchedRefs = refsWithUrl.filter(r => !availableUrls.has(canonicalizeUrl(r.url!)))

        if (unmatchedRefs.length > 0) {
          return {
            valid: false,
            error: `${unmatchedRefs.length} URL referensi tidak ditemukan di AVAILABLE_WEB_SOURCES: ${unmatchedRefs.map(r => r.url).join(', ')}`,
            suggestion: `Gunakan URL dari AVAILABLE_WEB_SOURCES, atau hapus URL jika referensi dari pengetahuan umum.`,
          }
        }
      }
    }

    return { valid: true }
  },

  examples: [
    {
      toolName: 'createArtifact',
      scenario: 'Membuat artifact setelah web search, ada AVAILABLE_WEB_SOURCES',
      correctArgs: {
        type: 'section',
        title: 'Tinjauan Literatur',
        content: 'Berdasarkan studi terbaru [1]...',
        sources: [
          { url: 'https://arxiv.org/abs/2024.12345', title: 'Recent Study on AI' },
        ],
      },
      explanation: 'sources parameter diisi dengan URL yang ada di AVAILABLE_WEB_SOURCES',
    },
    {
      toolName: 'createArtifact',
      scenario: 'Membuat artifact setelah web search, tapi sources kosong',
      incorrectArgs: {
        type: 'section',
        title: 'Tinjauan Literatur',
        content: 'Berdasarkan studi terbaru...',
      },
      correctArgs: {
        type: 'section',
        title: 'Tinjauan Literatur',
        content: 'Berdasarkan studi terbaru [1]...',
        sources: [
          { url: 'https://arxiv.org/abs/2024.12345', title: 'Recent Study on AI' },
        ],
      },
      explanation: 'SALAH: sources kosong padahal ada AVAILABLE_WEB_SOURCES. BENAR: sources diisi dari search results.',
    },
    {
      toolName: 'updateStageData',
      scenario: 'Menyimpan referensi tahap gagasan dengan URL dari search',
      correctArgs: {
        ringkasan: 'Ide: dampak AI terhadap pendidikan tinggi',
        data: {
          referensiAwal: [
            { title: 'AI in Higher Education', url: 'https://arxiv.org/abs/2024.12345', authors: 'Smith et al.', year: 2024 },
          ],
        },
      },
      explanation: 'URL di referensiAwal cocok dengan URL di AVAILABLE_WEB_SOURCES dari search sebelumnya',
    },
  ],
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/skills/reference-integrity.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add __tests__/skills/reference-integrity.test.ts src/lib/ai/skills/reference-integrity.skill.ts
git commit -m "feat(skills): add reference-integrity skill with URL cross-validation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Create Source Quality Skill

**Files:**
- Create: `src/lib/ai/skills/source-quality.skill.ts`
- Test: `__tests__/skills/source-quality.test.ts`
- Import from: `src/lib/ai/blocked-domains.ts` (BLOCKED_DOMAINS, isBlockedSourceDomain)

**Step 1: Write the failing tests**

```typescript
// __tests__/skills/source-quality.test.ts
import { describe, it, expect } from "vitest"
import { sourceQualitySkill } from "@/lib/ai/skills/source-quality.skill"
import type { SkillContext } from "@/lib/ai/skills/types"

const ctx: SkillContext = {
  isPaperMode: false,
  currentStage: null,
  hasRecentSources: false,
  availableSources: [],
}

describe("sourceQualitySkill", () => {
  describe("metadata", () => {
    it("should have correct name and empty wrappedTools (pipeline skill)", () => {
      expect(sourceQualitySkill.name).toBe("source-quality")
      expect(sourceQualitySkill.wrappedTools).toEqual([])
    })
  })

  describe("instructions", () => {
    it("should always return instructions", () => {
      const result = sourceQualitySkill.instructions(ctx)
      expect(result).toContain("SOURCE QUALITY CRITERIA")
      expect(result).toContain("ACADEMIC")
      expect(result).toContain("BLOCKED")
    })
  })

  describe("validate (simple pass/fail)", () => {
    it("should pass for empty sources", () => {
      expect(sourceQualitySkill.validate({ sources: [] })).toEqual({ valid: true })
    })

    it("should pass for academic sources", () => {
      const result = sourceQualitySkill.validate({
        sources: [{ url: "https://arxiv.org/abs/2024.1", title: "Study" }],
      })
      expect(result.valid).toBe(true)
    })

    it("should fail when all sources are blocked", () => {
      const result = sourceQualitySkill.validate({
        sources: [
          { url: "https://wikipedia.org/wiki/AI", title: "Wikipedia" },
          { url: "https://medium.com/post", title: "Blog" },
        ],
      })
      expect(result.valid).toBe(false)
    })
  })

  describe("validateWithScores", () => {
    it("should return scored sources for mixed input", () => {
      const result = sourceQualitySkill.validateWithScores({
        sources: [
          { url: "https://arxiv.org/abs/2024.1", title: "AI Research Paper" },
          { url: "https://kompas.com/article/123", title: "Berita Pendidikan Indonesia" },
          { url: "https://wikipedia.org/wiki/AI", title: "Wikipedia AI" },
        ],
      })

      expect(result.valid).toBe(true)
      expect(result.scoredSources).toBeDefined()
      expect(result.scoredSources!.length).toBe(2) // wikipedia filtered out
      expect(result.filteredOut).toBeDefined()
      expect(result.filteredOut!.length).toBe(1) // wikipedia
    })

    it("should score academic domains highest", () => {
      const result = sourceQualitySkill.validateWithScores({
        sources: [
          { url: "https://nature.com/articles/s123", title: "Nature Study on Climate" },
        ],
      })
      expect(result.scoredSources![0].tier).toBe("academic")
      expect(result.scoredSources![0].score).toBeGreaterThanOrEqual(90)
    })

    it("should score .edu domains as academic", () => {
      const result = sourceQualitySkill.validateWithScores({
        sources: [
          { url: "https://cs.stanford.edu/papers/123", title: "Stanford CS Paper on ML" },
        ],
      })
      expect(result.scoredSources![0].tier).toBe("academic")
    })

    it("should score .ac.id domains as academic", () => {
      const result = sourceQualitySkill.validateWithScores({
        sources: [
          { url: "https://journal.ui.ac.id/article/1", title: "UI Journal Article" },
        ],
      })
      expect(result.scoredSources![0].tier).toBe("academic")
    })

    it("should score .go.id domains as institutional", () => {
      const result = sourceQualitySkill.validateWithScores({
        sources: [
          { url: "https://bps.go.id/data/population", title: "BPS Population Data 2024" },
        ],
      })
      expect(result.scoredSources![0].tier).toBe("institutional")
    })

    it("should penalize homepage URLs", () => {
      const result = sourceQualitySkill.validateWithScores({
        sources: [
          { url: "https://reuters.com/", title: "Reuters Homepage" },
        ],
      })
      // news-major base 70 - 10 homepage = 60
      expect(result.scoredSources![0].score).toBeLessThan(70)
    })

    it("should bonus specific article paths", () => {
      const result = sourceQualitySkill.validateWithScores({
        sources: [
          { url: "https://reuters.com/world/climate-change-2024", title: "Reuters Climate Report 2024" },
        ],
      })
      // news-major base 70 + 5 path + 5 title = 80
      expect(result.scoredSources![0].score).toBeGreaterThan(70)
    })

    it("should detect single-domain homogeneity", () => {
      const result = sourceQualitySkill.validateWithScores({
        sources: [
          { url: "https://kompas.com/article/1", title: "Kompas Article One About Economy" },
          { url: "https://kompas.com/article/2", title: "Kompas Article Two About Education" },
          { url: "https://kompas.com/article/3", title: "Kompas Article Three About Health" },
        ],
      })
      expect(result.diversityWarning).toBeDefined()
      expect(result.diversityWarning).toContain("domain yang sama")
    })

    it("should not warn about diversity for varied domains", () => {
      const result = sourceQualitySkill.validateWithScores({
        sources: [
          { url: "https://arxiv.org/abs/2024.1", title: "AI Research Paper on NLP" },
          { url: "https://kompas.com/article/1", title: "Kompas Education Article" },
          { url: "https://worldbank.org/report/1", title: "World Bank Annual Report" },
        ],
      })
      expect(result.diversityWarning).toBeUndefined()
    })

    it("should fail when all sources score below threshold", () => {
      const result = sourceQualitySkill.validateWithScores({
        sources: [
          { url: "https://reddit.com/r/topic", title: "Reddit Thread" },
          { url: "https://medium.com/post", title: "Blog Post" },
        ],
      })
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain("quality check")
      }
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/skills/source-quality.test.ts`
Expected: FAIL — Cannot find module

**Step 3: Write implementation**

```typescript
// src/lib/ai/skills/source-quality.skill.ts

import type { Skill, SkillContext, SourceEntry, ValidationResult, ToolExample } from './types'
import { BLOCKED_DOMAINS } from '@/lib/ai/blocked-domains'

// ═══════════════════════════════════════════════════════════════
// Source Quality Scoring
// ═══════════════════════════════════════════════════════════════

type DomainTier = 'academic' | 'institutional' | 'news-major' | 'news-local' | 'unknown' | 'blocked'

interface ScoredSource extends SourceEntry {
  tier: DomainTier
  score: number
  reasons: string[]
}

interface SourceQualityValidateArgs {
  sources: SourceEntry[]
}

interface SourceQualityResult extends ValidationResult {
  scoredSources?: ScoredSource[]
  filteredOut?: ScoredSource[]
  diversityWarning?: string
}

// ═══════════════════════════════════════════════════════════════
// Domain Classification
// ═══════════════════════════════════════════════════════════════

const ACADEMIC_DOMAINS = [
  'arxiv.org', 'pubmed.ncbi.nlm.nih.gov', 'scholar.google.com',
  'sciencedirect.com', 'nature.com', 'springer.com', 'wiley.com',
  'ieee.org', 'acm.org', 'jstor.org', 'researchgate.net',
  'tandfonline.com', 'journals.sagepub.com', 'mdpi.com',
]

const INSTITUTIONAL_DOMAINS = [
  'worldbank.org', 'who.int', 'un.org', 'imf.org', 'oecd.org',
  'irena.org', 'iea.org', 'mckinsey.com', 'brookings.edu',
  'pewresearch.org', 'rand.org',
]

const MAJOR_NEWS_DOMAINS = [
  'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk',
  'nytimes.com', 'theguardian.com', 'washingtonpost.com',
  'kompas.com', 'tempo.co', 'katadata.co.id', 'tirto.id',
  'cnnindonesia.com', 'cnbcindonesia.com',
]

function classifyDomain(url: string): DomainTier {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    const matchesDomain = (domains: string[]) =>
      domains.some(d => hostname === d || hostname.endsWith(`.${d}`))

    if (matchesDomain(BLOCKED_DOMAINS)) return 'blocked'
    if (matchesDomain(ACADEMIC_DOMAINS)) return 'academic'
    if (hostname.endsWith('.edu') || hostname.endsWith('.ac.id') || hostname.endsWith('.ac.uk')) return 'academic'
    if (matchesDomain(INSTITUTIONAL_DOMAINS)) return 'institutional'
    if (hostname.endsWith('.go.id') || hostname.endsWith('.gov')) return 'institutional'
    if (matchesDomain(MAJOR_NEWS_DOMAINS)) return 'news-major'

    return 'unknown'
  } catch {
    return 'unknown'
  }
}

// ═══════════════════════════════════════════════════════════════
// Scoring
// ═══════════════════════════════════════════════════════════════

const TIER_BASE_SCORES: Record<DomainTier, number> = {
  academic: 90,
  institutional: 80,
  'news-major': 70,
  'news-local': 50,
  unknown: 40,
  blocked: 0,
}

function scoreSource(source: SourceEntry): ScoredSource {
  const tier = classifyDomain(source.url)
  let score = TIER_BASE_SCORES[tier]
  const reasons: string[] = [`Domain tier: ${tier} (base: ${score})`]

  try {
    const pathname = new URL(source.url).pathname
    if (pathname.length > 5 && pathname !== '/') {
      score += 5
      reasons.push('+5: specific article path')
    } else {
      score -= 10
      reasons.push('-10: homepage/root URL')
    }
  } catch { /* keep current score */ }

  if (source.title && source.title.length > 20 && source.title !== source.url) {
    score += 5
    reasons.push('+5: informative title')
  }

  return { ...source, tier, score: Math.max(0, Math.min(100, score)), reasons }
}

function checkDiversity(scored: ScoredSource[]): string | undefined {
  if (scored.length < 3) return undefined

  const domains = scored.map(s => {
    try { return new URL(s.url).hostname } catch { return '' }
  })
  const uniqueDomains = new Set(domains)
  if (uniqueDomains.size === 1 && scored.length >= 3) {
    return `Semua ${scored.length} sumber berasal dari domain yang sama (${domains[0]}). Diversifikasi sumber untuk kredibilitas lebih tinggi.`
  }

  const tiers = new Set(scored.map(s => s.tier))
  if (tiers.size === 1 && scored.length >= 4) {
    return `Semua sumber dari kategori ${scored[0].tier}. Pertimbangkan variasi (academic + news + institutional).`
  }

  return undefined
}

// ═══════════════════════════════════════════════════════════════
// Skill Implementation
// ═══════════════════════════════════════════════════════════════

const MIN_QUALITY_SCORE = 30

export const sourceQualitySkill: Skill<SourceQualityValidateArgs> & {
  validateWithScores(args: SourceQualityValidateArgs): SourceQualityResult
} = {
  name: 'source-quality',

  wrappedTools: [],

  instructions(_context: SkillContext): string | null {
    return `══════════════════════════════════════════════════════════════
SOURCE QUALITY CRITERIA
══════════════════════════════════════════════════════════════

Search GLOBALLY. Cast a wide net across credible source types.

KUALITAS SUMBER (urutan prioritas):
1. ACADEMIC (score 90+): arxiv, PubMed, ScienceDirect, Nature,
   university repositories (.edu, .ac.id)
2. INSTITUTIONAL (score 80+): World Bank, UN agencies, IRENA, IEA,
   government data (.go.id, .gov), think tanks (McKinsey, Brookings)
3. NEWS MAJOR (score 70+): Reuters, AP, BBC, NYT, Kompas, Tempo,
   Katadata, Tirto, CNN Indonesia
4. UNKNOWN (score 40): domain tidak dikenal — diterima tapi prioritas rendah

BLOCKED (score 0, otomatis difilter):
Wikipedia, personal blogs (blogspot, wordpress, medium, substack),
forums (quora, reddit), unverified (scribd, brainly, coursehero)

DIVERSITAS:
- Hindari semua sumber dari satu domain saja
- Kombinasikan academic + news + institutional untuk kredibilitas
- Prefer specific article URL, bukan homepage

Sumber otomatis di-score dan difilter oleh sistem.
══════════════════════════════════════════════════════════════`
  },

  validate(args: SourceQualityValidateArgs): ValidationResult {
    return this.validateWithScores(args)
  },

  validateWithScores(args: SourceQualityValidateArgs): SourceQualityResult {
    const { sources } = args
    if (!sources || sources.length === 0) {
      return { valid: true }
    }

    const scored = sources.map(scoreSource)
    const passing = scored.filter(s => s.score >= MIN_QUALITY_SCORE)
    const filtered = scored.filter(s => s.score < MIN_QUALITY_SCORE)
    const diversityWarning = checkDiversity(passing)

    if (passing.length === 0) {
      return {
        valid: false,
        error: `Semua ${sources.length} sumber gagal quality check (score < ${MIN_QUALITY_SCORE}). Sumber terbaik: ${scored[0]?.url} (score: ${scored[0]?.score}).`,
        suggestion: 'Cari ulang dengan fokus pada sumber academic atau institutional.',
        scoredSources: [],
        filteredOut: filtered,
      }
    }

    return {
      valid: true,
      scoredSources: passing,
      filteredOut: filtered.length > 0 ? filtered : undefined,
      diversityWarning,
    }
  },

  examples: [
    {
      toolName: 'pipeline:citation-processing',
      scenario: 'Search return campuran sumber berkualitas dan low-quality',
      correctArgs: {
        sources: [
          { url: 'https://arxiv.org/abs/2024.12345', title: 'AI Study' },
          { url: 'https://kompas.com/article/123', title: 'Berita Pendidikan' },
        ],
      },
      explanation: 'arxiv (academic, score 90) dan kompas (news-major, score 70) lolos filter. Diversitas baik.',
    },
    {
      toolName: 'pipeline:citation-processing',
      scenario: 'Search return hanya blog dan forum',
      incorrectArgs: {
        sources: [
          { url: 'https://medium.com/some-post', title: 'Blog Post' },
          { url: 'https://reddit.com/r/topic', title: 'Reddit Thread' },
        ],
      },
      correctArgs: {
        sources: [
          { url: 'https://nature.com/articles/s12345', title: 'Nature Study' },
          { url: 'https://reuters.com/article/topic', title: 'Reuters Report' },
        ],
      },
      explanation: 'SALAH: medium dan reddit = blocked (score 0). BENAR: nature (academic) dan reuters (news-major).',
    },
  ],
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/skills/source-quality.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add __tests__/skills/source-quality.test.ts src/lib/ai/skills/source-quality.skill.ts
git commit -m "feat(skills): add source-quality skill with domain scoring and diversity check

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Create Skill Registry

**Files:**
- Create: `src/lib/ai/skills/index.ts`
- Test: `__tests__/skills/skill-registry.test.ts`

**Step 1: Write the failing tests**

```typescript
// __tests__/skills/skill-registry.test.ts
import { describe, it, expect } from "vitest"
import {
  composeSkillInstructions,
  getSkill,
  getToolExamples,
  referenceIntegritySkill,
  sourceQualitySkill,
} from "@/lib/ai/skills"
import type { SkillContext } from "@/lib/ai/skills/types"

const makeContext = (overrides?: Partial<SkillContext>): SkillContext => ({
  isPaperMode: false,
  currentStage: null,
  hasRecentSources: false,
  availableSources: [],
  ...overrides,
})

describe("Skill Registry", () => {
  describe("composeSkillInstructions", () => {
    it("should return only source-quality instructions when no recent sources", () => {
      const result = composeSkillInstructions(makeContext())
      expect(result).toContain("SOURCE QUALITY CRITERIA")
      expect(result).not.toContain("REFERENCE INTEGRITY RULES")
    })

    it("should return both instructions when recent sources exist", () => {
      const result = composeSkillInstructions(makeContext({ hasRecentSources: true }))
      expect(result).toContain("SOURCE QUALITY CRITERIA")
      expect(result).toContain("REFERENCE INTEGRITY RULES")
    })
  })

  describe("getSkill", () => {
    it("should find reference-integrity skill", () => {
      const skill = getSkill("reference-integrity")
      expect(skill).toBeDefined()
      expect(skill!.name).toBe("reference-integrity")
    })

    it("should find source-quality skill", () => {
      const skill = getSkill("source-quality")
      expect(skill).toBeDefined()
    })

    it("should return undefined for unknown skill", () => {
      expect(getSkill("nonexistent")).toBeUndefined()
    })
  })

  describe("getToolExamples", () => {
    it("should return examples for createArtifact", () => {
      const result = getToolExamples("createArtifact")
      expect(result).toContain("createArtifact")
      expect(result).toContain("sources")
    })

    it("should return examples for updateStageData", () => {
      const result = getToolExamples("updateStageData")
      expect(result).toContain("referensiAwal")
    })

    it("should return empty string for tool with no examples", () => {
      expect(getToolExamples("unknownTool")).toBe("")
    })
  })

  describe("re-exports", () => {
    it("should re-export skills", () => {
      expect(referenceIntegritySkill.name).toBe("reference-integrity")
      expect(sourceQualitySkill.name).toBe("source-quality")
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/skills/skill-registry.test.ts`
Expected: FAIL — Cannot find module `@/lib/ai/skills`

**Step 3: Write implementation**

```typescript
// src/lib/ai/skills/index.ts

import type { Skill, SkillContext } from './types'
import { referenceIntegritySkill } from './reference-integrity.skill'
import { sourceQualitySkill } from './source-quality.skill'

/** Registry semua active skills */
const skills: Skill<unknown>[] = [
  referenceIntegritySkill as Skill<unknown>,
  sourceQualitySkill as Skill<unknown>,
]

/**
 * Compose instructions dari semua active skills berdasarkan context.
 * Return gabungan instructions text untuk di-inject ke system message.
 */
export function composeSkillInstructions(context: SkillContext): string {
  return skills
    .map(skill => skill.instructions(context))
    .filter((text): text is string => text !== null)
    .join('\n\n')
}

/**
 * Get skill by name (untuk direct access dari tool handlers).
 */
export function getSkill<T>(name: string): Skill<T> | undefined {
  return skills.find(s => s.name === name) as Skill<T> | undefined
}

/**
 * Compose tool examples dari semua skills untuk tool tertentu.
 * Di-inject ke tool description untuk behavioral demonstration.
 */
export function getToolExamples(toolName: string): string {
  const relevantExamples = skills
    .flatMap(s => s.examples)
    .filter(e => e.toolName === toolName)

  if (relevantExamples.length === 0) return ''

  return relevantExamples
    .map(e => `Example (${e.scenario}):\n${JSON.stringify(e.correctArgs, null, 2)}\n→ ${e.explanation}`)
    .join('\n\n')
}

// Re-export for convenience
export { referenceIntegritySkill } from './reference-integrity.skill'
export { sourceQualitySkill } from './source-quality.skill'
export type { SkillContext, ValidationResult, ToolExample } from './types'
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/skills/skill-registry.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add __tests__/skills/skill-registry.test.ts src/lib/ai/skills/index.ts
git commit -m "feat(skills): add skill registry with compose, getSkill, getToolExamples

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Wire Reference Integrity into createArtifact/updateArtifact

**Files:**
- Modify: `src/app/api/chat/route.ts` (lines ~1416-1428 and ~1508-1520)

**Context:**
- Current code uses `enforceArtifactSourcesPolicy()` which only checks if sources exist (not empty)
- New code uses `referenceIntegritySkill.validate()` which also cross-checks URLs against available sources
- Variable `hasRecentSourcesInDb` and `recentSources` are already available in scope (line 674-695)
- We need to also pass `recentSources` (the actual source objects) which requires capturing it from the try/catch block

**Step 1: Read current state of route.ts lines around the `recentSources` variable**

Run: Read `src/app/api/chat/route.ts` lines 669-695 to understand what data is available.

Key facts:
- `hasRecentSourcesInDb` (boolean) — already in scope
- `recentSources` — the actual array from DB, but currently scoped inside try block
- We need the actual `recentSources` array accessible to tool handlers

**Step 2: Modify route.ts — hoist recentSources variable**

At line 673-674, change:
```typescript
// BEFORE:
let sourcesContext = ""
let hasRecentSourcesInDb = false

// AFTER:
let sourcesContext = ""
let hasRecentSourcesInDb = false
let recentSourcesList: Array<{ url: string; title: string; publishedAt?: number }> = []
```

Inside the try block (after line 681), add:
```typescript
if (recentSources && recentSources.length > 0) {
    hasRecentSourcesInDb = true
    recentSourcesList = recentSources  // <-- ADD THIS LINE
    const sourcesJson = ...
```

**Step 3: Replace enforceArtifactSourcesPolicy in createArtifact handler**

At line ~1416-1428, change:
```typescript
// BEFORE:
const policy = enforceArtifactSourcesPolicy({
    hasRecentSourcesInDb,
    sources,
    operation: "createArtifact",
})
if (!policy.allowed) {
    return {
        success: false,
        error: policy.error,
    }
}

// AFTER:
const refValidation = referenceIntegritySkill.validate({
    toolName: 'createArtifact',
    claimedSources: sources,
    availableSources: recentSourcesList,
    hasRecentSources: hasRecentSourcesInDb,
})
if (!refValidation.valid) {
    return {
        success: false,
        error: refValidation.error,
    }
}
```

**Step 4: Replace enforceArtifactSourcesPolicy in updateArtifact handler**

At line ~1508-1520, make the same replacement for `updateArtifact`.

**Step 5: Add import, remove old import**

At top of file:
```typescript
// ADD:
import { referenceIntegritySkill } from "@/lib/ai/skills"

// REMOVE:
import { enforceArtifactSourcesPolicy } from "@/lib/ai/artifact-sources-policy"
```

**Step 6: Run build to verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "refactor: replace enforceArtifactSourcesPolicy with referenceIntegritySkill.validate

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Wire Reference Integrity into updateStageData (paper-tools.ts)

**Files:**
- Modify: `src/lib/ai/paper-tools.ts` (factory params + execute handler)
- Modify: `src/app/api/chat/route.ts` (factory call site, line ~1673)

**Context:**
- `createPaperTools()` factory currently accepts `{ userId, conversationId, convexToken }`
- We need to extend it with `{ availableSources, hasRecentSources }` so the `updateStageData` execute handler can validate references
- The factory is called from route.ts where these values are already available

**Step 1: Extend factory context type in paper-tools.ts**

At line 11-14 of paper-tools.ts:
```typescript
// BEFORE:
export const createPaperTools = (context: {
    userId: Id<"users">,
    conversationId: Id<"conversations">
    convexToken?: string
}) => {

// AFTER:
export const createPaperTools = (context: {
    userId: Id<"users">,
    conversationId: Id<"conversations">
    convexToken?: string
    availableSources?: Array<{ url: string; title: string; publishedAt?: number }>
    hasRecentSources?: boolean
}) => {
```

**Step 2: Add validation in updateStageData execute handler**

In paper-tools.ts, inside the `updateStageData` execute handler (after line 147 where `const stage = session.currentStage`), add reference validation for stages that have reference fields:

```typescript
// After: const stage = session.currentStage;

// Reference integrity validation (if sources available)
if (context.hasRecentSources && context.availableSources && context.availableSources.length > 0) {
    // Extract reference-like fields from data
    const refFields = ['referensiAwal', 'referensiPendukung', 'referensi', 'sitasiAPA', 'sitasiTambahan']
    const allRefs: Array<{ title: string; url?: string; authors?: string }> = []
    if (data) {
        for (const field of refFields) {
            const val = data[field]
            if (Array.isArray(val)) {
                allRefs.push(...val.filter((r: unknown) => r && typeof r === 'object'))
            }
        }
    }

    if (allRefs.length > 0) {
        const { referenceIntegritySkill } = await import('@/lib/ai/skills')
        const refValidation = referenceIntegritySkill.validate({
            toolName: 'updateStageData',
            claimedReferences: allRefs,
            availableSources: context.availableSources,
            hasRecentSources: true,
        })
        if (!refValidation.valid) {
            return { success: false, error: refValidation.error }
        }
    }
}
```

Note: Using dynamic import to avoid circular dependency issues. This is a safe pattern since it only runs when validation is needed.

**Step 3: Update factory call site in route.ts**

At line ~1673 in route.ts:
```typescript
// BEFORE:
...createPaperTools({
    userId: userId as Id<"users">,
    conversationId: currentConversationId as Id<"conversations">,
    convexToken,

// AFTER:
...createPaperTools({
    userId: userId as Id<"users">,
    conversationId: currentConversationId as Id<"conversations">,
    convexToken,
    availableSources: recentSourcesList,
    hasRecentSources: hasRecentSourcesInDb,
```

**Step 4: Run build to verify**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/lib/ai/paper-tools.ts src/app/api/chat/route.ts
git commit -m "feat: wire reference-integrity skill into updateStageData via factory context

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Wire Source Quality into Perplexity Citation Pipeline

**Files:**
- Modify: `src/app/api/chat/route.ts` (lines ~2348-2384 — Perplexity citation processing)

**Context:**
- Currently: `normalizeCitations()` → `isGarbageUrl()` filter → enrichment → `isLowValueCitationUrl()` filter
- After: `normalizeCitations()` → `sourceQualitySkill.validateWithScores()` (replaces isGarbageUrl + isLowValueCitationUrl) → enrichment → dedup
- `isGarbageUrl` and `isLowValueCitationUrl` are defined inline in route.ts — we keep them for the Grok fallback pipeline (Task 8) until both pipelines are migrated

**Step 1: Add import**

At top of route.ts:
```typescript
import { referenceIntegritySkill, sourceQualitySkill } from "@/lib/ai/skills"
```

(Merge with existing referenceIntegritySkill import from Task 5.)

**Step 2: Replace Perplexity citation filtering**

At lines ~2348-2384, replace the filtering logic:

```typescript
// BEFORE:
// Layer 1: Structural pre-filter — remove garbage URLs
let sources: SourceEntry[] = normalizedCitations
    .filter(c => !isGarbageUrl(c.url))
    .map(c => ({
        url: normalizeWebSearchUrl(c.url),
        title: c.title || c.url,
    }))

// Enrichment
if (sources.length > 0) {
    sources = await enrichSourcesWithFetchedTitles(sources, { ... })
    sources = sources.filter((s) => !(s as { _unreachable?: true })._unreachable)

    // Dedup
    const deduped = new Map<string, SourceEntry>()
    for (const src of sources) {
        const key = canonicalizeCitationUrl(src.url)
        if (!deduped.has(key)) {
            deduped.set(key, src)
        }
    }
    sources = Array.from(deduped.values())

    // Low-value filter
    const hasHighValue = sources.some(s => !isLowValueCitationUrl(s.url))
    if (hasHighValue) {
        sources = sources.filter(s => !isLowValueCitationUrl(s.url))
    }
}

// AFTER:
// Skill-based quality scoring (replaces isGarbageUrl + isLowValueCitationUrl)
const qualityInput = normalizedCitations.map(c => ({
    url: normalizeWebSearchUrl(c.url),
    title: c.title || c.url,
}))
const qualityResult = sourceQualitySkill.validateWithScores({ sources: qualityInput })

let sources: SourceEntry[] = qualityResult.scoredSources
    ? qualityResult.scoredSources.map(s => ({ url: s.url, title: s.title }))
    : qualityInput.filter(c => !isGarbageUrl(c.url)) // fallback to old behavior

if (qualityResult.filteredOut?.length) {
    console.log(`[source-quality] Filtered ${qualityResult.filteredOut.length} low-quality sources`)
}
if (qualityResult.diversityWarning) {
    console.log(`[source-quality] ${qualityResult.diversityWarning}`)
}

// Enrichment (unchanged)
if (sources.length > 0) {
    sources = await enrichSourcesWithFetchedTitles(sources, {
        concurrency: 4,
        timeoutMs: 2500,
    })
    sources = sources.filter((s) => !(s as { _unreachable?: true })._unreachable)

    // Dedup (unchanged)
    const deduped = new Map<string, SourceEntry>()
    for (const src of sources) {
        const key = canonicalizeCitationUrl(src.url)
        if (!deduped.has(key)) {
            deduped.set(key, src)
        }
    }
    sources = Array.from(deduped.values())
    // Note: isLowValueCitationUrl filter REMOVED — replaced by scoring above
}
```

**Step 3: Run build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "refactor: replace isGarbageUrl/isLowValueCitationUrl with sourceQualitySkill scoring in Perplexity pipeline

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Wire Source Quality into Grok Fallback Citation Pipeline

**Files:**
- Modify: `src/app/api/chat/route.ts` (lines ~3247-3261 — Grok fallback citation processing)

**Context:**
- Same pattern as Task 7 but for the Grok/OpenRouter fallback pipeline
- Currently uses `isGarbageUrl()` + `isLowValueCitationUrl()` + `isVertexProxyUrl()`
- Keep `isVertexProxyUrl()` check (separate concern — Google proxy URLs)

**Step 1: Replace Grok fallback citation filtering**

At lines ~3247-3261:

```typescript
// BEFORE:
const nonGarbageCitations = normalizedCitations.filter(c => !isGarbageUrl(c.url))

const filteredCitations = (() => {
    const hasHighValue = nonGarbageCitations.some(
        c => !isVertexProxyUrl(c.url) && !isLowValueCitationUrl(c.url)
    )
    if (hasHighValue) {
        return nonGarbageCitations.filter(
            c => !isVertexProxyUrl(c.url) && !isLowValueCitationUrl(c.url)
        )
    }
    const hasNonProxy = nonGarbageCitations.some(c => !isVertexProxyUrl(c.url))
    if (hasNonProxy) return nonGarbageCitations.filter(c => !isVertexProxyUrl(c.url))
    return nonGarbageCitations
})()

// AFTER:
// Skill-based quality scoring (include publishedAt in input so it flows through scoring)
const grokQualityInput = normalizedCitations
    .filter(c => !isVertexProxyUrl(c.url)) // Keep proxy filter (separate concern)
    .map(c => ({
        url: c.url,
        title: c.title || c.url,
        ...(c.publishedAt ? { publishedAt: c.publishedAt } : {}),
    }))
const grokQualityResult = sourceQualitySkill.validateWithScores({ sources: grokQualityInput })

const filteredCitations = grokQualityResult.scoredSources
    ? grokQualityResult.scoredSources.map(s => ({
        url: s.url,
        title: s.title,
        ...(s.publishedAt ? { publishedAt: s.publishedAt } : {}),
    }))
    : normalizedCitations.filter(c => !isGarbageUrl(c.url) && !isVertexProxyUrl(c.url)) // fallback

if (grokQualityResult.filteredOut?.length) {
    console.log(`[source-quality:grok] Filtered ${grokQualityResult.filteredOut.length} low-quality sources`)
}
```

**Step 2: Run build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "refactor: replace isGarbageUrl/isLowValueCitationUrl with sourceQualitySkill in Grok fallback pipeline

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Replace System Notes with Skill Instructions

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Context:**
- Replace `sourcesContext` inline string (line 684-690) with `referenceIntegritySkill.instructions()`
- Replace `getSourcePolicyPrompt()` injection (lines 2144 and 3104) with `sourceQualitySkill.instructions()`
- The `sourcesContext` currently includes the raw JSON of available sources AND guidance text. We still need the raw JSON for the AI to see the actual URLs. The skill instructions replace only the guidance text.

**Step 1: Modify sourcesContext construction**

At line 683-690:

```typescript
// BEFORE:
sourcesContext = `
AVAILABLE_WEB_SOURCES (dari hasil web search sebelumnya):
${sourcesJson}

PENTING: Jika kamu membuat artifact yang BERBASIS informasi dari sumber-sumber di atas,
WAJIB pass array sources ini ke parameter 'sources' di tool createArtifact atau updateArtifact.
Ini memungkinkan inline citation [1], [2] berfungsi dengan benar di artifact.`

// AFTER:
// Note: SkillContext type imported at top of file with other skill imports
const skillContext: SkillContext = {
    isPaperMode: !!paperModePrompt,
    currentStage: paperSession?.currentStage ?? null,
    hasRecentSources: true,
    availableSources: recentSourcesList,
}
const refInstructions = referenceIntegritySkill.instructions(skillContext)
sourcesContext = `AVAILABLE_WEB_SOURCES (dari hasil web search sebelumnya):
${sourcesJson}
${refInstructions ?? ''}`
```

**Step 2: Replace getSourcePolicyPrompt() at line 2144**

```typescript
// BEFORE:
{ role: "system" as const, content: getSourcePolicyPrompt() },

// AFTER:
{ role: "system" as const, content: sourceQualitySkill.instructions({
    isPaperMode: !!paperModePrompt,
    currentStage: paperSession?.currentStage ?? null,
    hasRecentSources: hasRecentSourcesInDb,
    availableSources: recentSourcesList,
}) ?? '' },
```

**Step 3: Replace getSourcePolicyPrompt() at line 3104 (Grok fallback)**

Same replacement as Step 2.

**Step 4: Remove `getSourcePolicyPrompt` import**

```typescript
// REMOVE:
import { getSourcePolicyPrompt } from "@/lib/ai/search-source-policy"
```

**Step 5: Update skill imports at top of file**

```typescript
import { referenceIntegritySkill, sourceQualitySkill, type SkillContext } from "@/lib/ai/skills"
```

Note: `composeSkillInstructions()` tersedia di registry tapi TIDAK dipakai di sini karena kedua skill instructions perlu di-inject ke lokasi berbeda di message array (sourcesContext vs search messages). Individual `skill.instructions()` calls lebih tepat.

**Step 6: Run build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "refactor: replace system notes (sourcesContext, getSourcePolicyPrompt) with skill instructions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Inject Tool Examples into Tool Descriptions

**Files:**
- Modify: `src/app/api/chat/route.ts` (tool definitions for createArtifact, updateArtifact)
- Modify: `src/lib/ai/paper-tools.ts` (tool definition for updateStageData)

**Context:**
- Anthropic's research shows tool use examples boost accuracy from 72% to 90%
- We append examples to existing tool descriptions using `getToolExamples()`
- This is the third layer of skills (instructions + validation + **examples**)

**Step 1: Append examples to createArtifact description**

In route.ts, find the `createArtifact: tool({` definition and append examples to its `description`:

```typescript
// Find the description string for createArtifact and append:
const createArtifactExamples = getToolExamples('createArtifact')

// In the tool definition, after the existing description string:
description: `[existing description]${createArtifactExamples ? `\n\n${createArtifactExamples}` : ''}`,
```

**Step 2: Append examples to updateStageData description**

In paper-tools.ts, same pattern:

```typescript
import { getToolExamples } from '@/lib/ai/skills'

// In the tool definition:
const stageDataExamples = getToolExamples('updateStageData')
// Append to description
```

**Step 3: Run build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/api/chat/route.ts src/lib/ai/paper-tools.ts
git commit -m "feat(skills): inject tool use examples into tool descriptions for accuracy boost

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Run Full Test Suite + Build Verification

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS (including existing tests)

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Run lint**

Run: `npm run lint`
Expected: No new errors

**Step 4: Fix any issues found**

If any test/build/lint fails, fix the issue and commit.

**Step 5: Commit if any fixes**

```bash
git add -A
git commit -m "fix: resolve test/build/lint issues from skills integration

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 12: Deprecate Old Files

**Files:**
- Modify: `src/lib/ai/artifact-sources-policy.ts` (add deprecation notice)
- Modify: `src/lib/ai/search-source-policy.ts` (add deprecation notice)

**Step 1: Add deprecation comments**

In `artifact-sources-policy.ts`:
```typescript
/**
 * @deprecated Absorbed by referenceIntegritySkill in src/lib/ai/skills/reference-integrity.skill.ts
 * This file is kept for reference during transition. Safe to delete after skill pilot validates.
 */
```

In `search-source-policy.ts`:
```typescript
/**
 * @deprecated Absorbed by sourceQualitySkill in src/lib/ai/skills/source-quality.skill.ts
 * This file is kept for reference during transition. Safe to delete after skill pilot validates.
 */
```

**Step 2: Verify no remaining imports of deprecated functions**

Run: `grep -r "enforceArtifactSourcesPolicy\|getSourcePolicyPrompt" src/ --include="*.ts" --include="*.tsx"`
Expected: No matches in production code (only in the deprecated files themselves)

**Step 3: Commit**

```bash
git add src/lib/ai/artifact-sources-policy.ts src/lib/ai/search-source-policy.ts
git commit -m "chore: mark artifact-sources-policy and search-source-policy as deprecated

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary: File Inventory

| File | Action | Task |
|------|--------|------|
| `src/lib/ai/skills/types.ts` | CREATE | 1 |
| `src/lib/ai/skills/reference-integrity.skill.ts` | CREATE | 2 |
| `src/lib/ai/skills/source-quality.skill.ts` | CREATE | 3 |
| `src/lib/ai/skills/index.ts` | CREATE | 4 |
| `__tests__/skills/skill-types.test.ts` | CREATE | 1 |
| `__tests__/skills/reference-integrity.test.ts` | CREATE | 2 |
| `__tests__/skills/source-quality.test.ts` | CREATE | 3 |
| `__tests__/skills/skill-registry.test.ts` | CREATE | 4 |
| `src/app/api/chat/route.ts` | MODIFY | 5, 6, 7, 8, 9, 10 |
| `src/lib/ai/paper-tools.ts` | MODIFY | 6, 10 |
| `src/lib/ai/artifact-sources-policy.ts` | DEPRECATE | 12 |
| `src/lib/ai/search-source-policy.ts` | DEPRECATE | 12 |

**Total: 12 tasks, ~12 commits**
