# Search Tool Skills — Design Document

Design implementasi dua skills pertama untuk search tool enforcement.

Prasyarat: baca `docs/skill-wrapped-tools/README.md` untuk konsep dasar.

## Scope

Dua skills yang dibangun sebagai pilot:

| Skill | Jenis | Menggantikan |
|-------|-------|-------------|
| **reference-integrity** | Tool-Boundary | `enforceArtifactSourcesPolicy()`, `AVAILABLE_WEB_SOURCES` prompt context |
| **source-quality** | Pipeline | `getSourcePolicyPrompt()`, sebagian filtering logic di citation pipeline |

## 1. Skill Interface (types.ts)

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
 * valid: true → tool proceed normal
 * valid: false → tool return error, AI retry
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

  /** Tools yang di-wrap oleh skill ini */
  wrappedTools: string[]

  /**
   * Generate instructions text berdasarkan context.
   * Output di-inject ke system message, menggantikan system notes.
   */
  instructions(context: SkillContext): string | null

  /**
   * Validasi — dipanggil dari dalam tool execute() handler
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

## 2. Reference Integrity Skill

### Problem Statement

Saat ini, AI bisa:
- Claim "Menurut studi Smith et al. (2024)..." tanpa referensi itu ada di search results
- Panggil `updateStageData` dengan `referensiAwal` yang fabricated (title/authors/url dibuat-buat)
- Panggil `createArtifact` tanpa `sources` parameter meski ada `AVAILABLE_WEB_SOURCES`

`enforceArtifactSourcesPolicy()` hanya cek apakah `sources` ada (bukan kosong) — tidak cek apakah sources yang di-claim AI **cocok** dengan actual search results.

### Design

```typescript
// src/lib/ai/skills/reference-integrity.skill.ts

import type { Skill, SkillContext, SourceEntry, ValidationResult, ToolExample } from './types'

// ═══════════════════════════════════════════════════════════════
// Validate Args — apa yang diterima validate()
// ═══════════════════════════════════════════════════════════════

interface ReferenceValidateArgs {
  /** Nama tool yang dipanggil */
  toolName: 'createArtifact' | 'updateArtifact' | 'updateStageData'
  /** Sources yang AI pass ke tool */
  claimedSources?: SourceEntry[]
  /** Referensi dalam stageData (untuk updateStageData) */
  claimedReferences?: Array<{ title: string; url?: string; authors?: string }>
  /** Sources yang tersedia dari search results */
  availableSources: SourceEntry[]
  /** Apakah ada recent sources di DB */
  hasRecentSources: boolean
}

// ═══════════════════════════════════════════════════════════════
// Skill Implementation
// ═══════════════════════════════════════════════════════════════

export const referenceIntegritySkill: Skill<ReferenceValidateArgs> = {
  name: 'reference-integrity',

  wrappedTools: ['createArtifact', 'updateArtifact', 'updateStageData'],

  instructions(context: SkillContext): string | null {
    // Hanya inject jika ada sources di conversation
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
   "⚠️ Referensi dari pengetahuan umum, bukan dari hasil pencarian web"

YANG DILARANG:
✗ Fabricate URL yang tidak ada di search results
✗ Fabricate judul paper/artikel yang tidak ada di search results
✗ Fabricate nama penulis yang tidak ada di search results
✗ Pass sources kosong saat ada AVAILABLE_WEB_SOURCES

Tool akan MENOLAK jika referensi yang kamu claim tidak cocok dengan
search results yang tersedia.
══════════════════════════════════════════════════════════════`
  },

  validate(args: ReferenceValidateArgs): ValidationResult {
    const { toolName, claimedSources, claimedReferences, availableSources, hasRecentSources } = args

    // ─── Guard: Skip validation jika tidak ada sources di conversation ───
    if (!hasRecentSources || availableSources.length === 0) {
      return { valid: true }
    }

    // ─── Validate createArtifact / updateArtifact ───
    if (toolName === 'createArtifact' || toolName === 'updateArtifact') {
      // Case 1: Sources wajib ada tapi kosong
      if (!claimedSources || claimedSources.length === 0) {
        return {
          valid: false,
          error: `Parameter 'sources' wajib diisi untuk ${toolName} karena tersedia AVAILABLE_WEB_SOURCES di percakapan ini.`,
          suggestion: `Pass sources dari AVAILABLE_WEB_SOURCES: ${availableSources.slice(0, 3).map(s => s.url).join(', ')}`,
        }
      }

      // Case 2: URL yang di-claim ada yang tidak cocok dengan available sources
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

    // ─── Validate updateStageData (referensi fields) ───
    if (toolName === 'updateStageData' && claimedReferences && claimedReferences.length > 0) {
      // Cek referensi yang punya URL — URL harus cocok dengan available sources
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
        // sources MISSING
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

// ═══════════════════════════════════════════════════════════════
// Helper
// ═══════════════════════════════════════════════════════════════

/**
 * Canonicalize URL untuk perbandingan.
 * Logika identik dengan canonicalizeCitationUrl() yang ada inline
 * di route.ts (line ~2319): strip utm params, hash, trailing slash.
 * Didefinisikan di sini (bukan import) karena versi route.ts tidak di-export.
 */
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
```

### Integration Point

Di dalam `execute()` handler tool yang sudah ada:

```typescript
// route.ts — createArtifact handler (existing code)
execute: async ({ type, title, content, format, description, sources }) => {
  // SEBELUM: hanya enforceArtifactSourcesPolicy
  // SESUDAH: digantikan oleh referenceIntegritySkill.validate()

  const validation = referenceIntegritySkill.validate({
    toolName: 'createArtifact',
    claimedSources: sources,
    availableSources: recentSourcesFromDb, // dari context
    hasRecentSources: hasRecentSourcesInDb,
  })
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  // ... proceed normal
}
```

### Apa yang Digantikan

| Sebelum | Sesudah |
|---------|---------|
| `enforceArtifactSourcesPolicy()` di `artifact-sources-policy.ts` | `referenceIntegritySkill.validate()` — superset, cek URL match juga |
| `sourcesContext` string di route.ts (line 684-690) | `referenceIntegritySkill.instructions()` — lebih structured + contoh |
| `AVAILABLE_WEB_SOURCES` prompt guidance | Integrated dalam skill instructions + validation enforcement |

### Apa yang TIDAK Digantikan

- `PAPER_TOOLS_ONLY_NOTE` — ini tentang tool availability, bukan reference integrity. Tetap terpisah.
- `getResearchIncompleteNote()` — ini tentang search decision, bukan reference quality. Tetap terpisah.

(Koreksi dari versi sebelumnya yang salah menyatakan skill ini menggantikan keduanya.)

## 3. Source Quality Skill

### Problem Statement

Saat ini, source quality enforcement hanya:
- `getSourcePolicyPrompt()` — prompt guidance (AI bisa ignore)
- `blocked-domains.ts` — hardcoded blocklist (13 domains)
- `isLowValueCitationUrl()` dan `isGarbageUrl()` — basic heuristic di route.ts

Tidak ada scoring system yang menilai kualitas sumber secara gradual (bukan binary block/allow).

### Design

```typescript
// src/lib/ai/skills/source-quality.skill.ts

import type { Skill, SkillContext, SourceEntry, ValidationResult, ToolExample } from './types'

// ═══════════════════════════════════════════════════════════════
// Source Quality Scoring
// ═══════════════════════════════════════════════════════════════

/** Kategori domain berdasarkan kualitas */
type DomainTier = 'academic' | 'institutional' | 'news-major' | 'news-local' | 'unknown' | 'blocked'

interface ScoredSource extends SourceEntry {
  tier: DomainTier
  score: number        // 0-100
  reasons: string[]    // Kenapa score ini
}

interface SourceQualityValidateArgs {
  /** Sources dari search results yang akan divalidasi */
  sources: SourceEntry[]
}

interface SourceQualityResult extends ValidationResult {
  /** Sources yang sudah di-score dan filter */
  scoredSources?: ScoredSource[]
  /** Sources yang di-filter out (untuk logging) */
  filteredOut?: ScoredSource[]
  /** Diversity warning jika terlalu homogen */
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

// Import dari blocked-domains.ts (single source of truth)
import { BLOCKED_DOMAINS } from '@/lib/ai/blocked-domains'

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
// Scoring Logic
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

  // Bonus: URL mengarah ke specific article (bukan homepage)
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

  // Bonus: title informatif (bukan generic)
  if (source.title && source.title.length > 20 && source.title !== source.url) {
    score += 5
    reasons.push('+5: informative title')
  }

  return { ...source, tier, score: Math.max(0, Math.min(100, score)), reasons }
}

function checkDiversity(scored: ScoredSource[]): string | undefined {
  if (scored.length < 3) return undefined

  // Cek apakah semua dari domain yang sama
  const domains = scored.map(s => {
    try { return new URL(s.url).hostname } catch { return '' }
  })
  const uniqueDomains = new Set(domains)
  if (uniqueDomains.size === 1 && scored.length >= 3) {
    return `Semua ${scored.length} sumber berasal dari domain yang sama (${domains[0]}). Diversifikasi sumber untuk kredibilitas lebih tinggi.`
  }

  // Cek apakah semua dari tier yang sama
  const tiers = new Set(scored.map(s => s.tier))
  if (tiers.size === 1 && scored.length >= 4) {
    return `Semua sumber dari kategori ${scored[0].tier}. Pertimbangkan variasi (academic + news + institutional).`
  }

  return undefined
}

// ═══════════════════════════════════════════════════════════════
// Skill Implementation
// ═══════════════════════════════════════════════════════════════

/** Minimum score untuk source lolos filter (tunable) */
const MIN_QUALITY_SCORE = 30

export const sourceQualitySkill: Skill<SourceQualityValidateArgs> & {
  /** Extended: return scored sources untuk pipeline processing */
  validateWithScores(args: SourceQualityValidateArgs): SourceQualityResult
} = {
  name: 'source-quality',

  wrappedTools: [], // Pipeline skill — tidak wrap AI tools

  instructions(_context: SkillContext): string | null {
    // Selalu inject — berlaku baik saat search mode maupun sebagai
    // awareness untuk AI tentang bagaimana sumber dinilai.
    // Context-awareness: kedepan bisa conditional per stage jika perlu.
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
    // Simple validate — binary pass/fail
    const result = this.validateWithScores(args)
    return result
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

### Integration Point

Di citation processing pipeline di route.ts — setelah `normalizeCitations()`, sebelum enrichment:

```typescript
// route.ts — citation pipeline (existing code location: ~line 2348-2384)

// SEBELUM: hanya isGarbageUrl filter
// SESUDAH: sourceQualitySkill.validateWithScores() menggantikan

const normalizedCitations = normalizeCitations(rawSources, 'perplexity')

// Skill-based quality filter (menggantikan basic isGarbageUrl)
const qualityResult = sourceQualitySkill.validateWithScores({
  sources: normalizedCitations.map(c => ({ url: c.url, title: c.title || c.url })),
})

let sources: SourceEntry[]
if (qualityResult.scoredSources) {
  sources = qualityResult.scoredSources.map(s => ({
    url: normalizeWebSearchUrl(s.url),
    title: s.title,
  }))
  // Log filtered sources for debugging
  if (qualityResult.filteredOut?.length) {
    console.log(`[source-quality] Filtered ${qualityResult.filteredOut.length} low-quality sources`)
  }
  if (qualityResult.diversityWarning) {
    console.log(`[source-quality] Diversity: ${qualityResult.diversityWarning}`)
  }
} else {
  // Fallback: keep existing behavior
  sources = normalizedCitations
    .filter(c => !isGarbageUrl(c.url))
    .map(c => ({ url: normalizeWebSearchUrl(c.url), title: c.title || c.url }))
}
```

### Apa yang Digantikan

| Sebelum | Sesudah |
|---------|---------|
| `getSourcePolicyPrompt()` di `search-source-policy.ts` | `sourceQualitySkill.instructions()` — lebih structured dengan scoring criteria |
| `isGarbageUrl()` filter di route.ts | `sourceQualitySkill.validateWithScores()` — superset, scoring + diversity |
| `isLowValueCitationUrl()` di route.ts | Integrated dalam scoring (homepage detection = -10 score) |

### Apa yang TIDAK Digantikan

- `blocked-domains.ts` — tetap sebagai source of truth untuk blocked list. Skill references ini tapi tidak menggantikan.
- `isBlockedSourceDomain()` di `normalizeCitations()` — tetap di tempatnya sebagai universal post-filter. Skill menambah layer scoring di atasnya.
- Enrichment logic (`enrichSourcesWithFetchedTitles`) — tetap terpisah, bukan concern skill ini.

## 4. Skill Registry (index.ts)

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
 * Bisa di-inject ke tool description.
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

## 5. Integration Plan

### Step 1: Buat skill modules (tanpa mengubah route.ts)

File baru:
- `src/lib/ai/skills/types.ts`
- `src/lib/ai/skills/reference-integrity.skill.ts`
- `src/lib/ai/skills/source-quality.skill.ts`
- `src/lib/ai/skills/index.ts`

### Step 2: Wire reference-integrity ke tool handlers

**createArtifact / updateArtifact (route.ts):**
- Ganti `enforceArtifactSourcesPolicy()` dengan `referenceIntegritySkill.validate()`
- Straightforward: handler sudah di route.ts, punya akses ke `hasRecentSourcesInDb` dan `recentSources`

**updateStageData (paper-tools.ts) — PERLU PERUBAHAN FACTORY:**
- `createPaperTools()` saat ini menerima `{ userId, conversationId, convexToken }`
- PERLU extend context: tambah `{ availableSources, hasRecentSources }` ke factory params
- Factory sudah dipanggil dari route.ts (line ~1673) dimana data ini tersedia
- Alternatif: query `messages.getRecentSources` dari dalam execute handler (tapi tambah latency)

### Step 3: Wire source-quality ke citation pipeline

Di route.ts, modifikasi citation processing:
- Insert `sourceQualitySkill.validateWithScores()` setelah `normalizeCitations()`
- Replace `isGarbageUrl()` filter dengan skill scoring

### Step 4: Inject tool examples ke tool descriptions

Di route.ts, saat mendefinisikan tools:
- Append `getToolExamples('createArtifact')` ke `createArtifact` tool description
- Append `getToolExamples('updateStageData')` ke `updateStageData` tool description
- Ini salah satu dari tiga layer Anthropic (instructions, validation, **examples**)
  yang proven meningkatkan accuracy dari 72% ke 90%

### Step 5: Replace system notes dengan skill instructions

Di route.ts:
- Ganti `sourcesContext` string dengan `composeSkillInstructions(context)`
- Ganti `getSourcePolicyPrompt()` injection dengan skill instructions
- Hapus `enforceArtifactSourcesPolicy` import (sudah di-absorb skill)

### Step 6: Test & validate

- Pastikan existing behavior tidak break
- Test reference validation: AI retry saat claim fabricated reference
- Test source scoring: low-quality sources terfilter, diversity warning muncul

## 6. File yang Terpengaruh

| File | Perubahan |
|------|-----------|
| `src/lib/ai/skills/types.ts` | **BARU** |
| `src/lib/ai/skills/reference-integrity.skill.ts` | **BARU** |
| `src/lib/ai/skills/source-quality.skill.ts` | **BARU** |
| `src/lib/ai/skills/index.ts` | **BARU** |
| `src/app/api/chat/route.ts` | MODIFIKASI: wire skills, replace system notes |
| `src/lib/ai/artifact-sources-policy.ts` | DEPRECATED: di-absorb ke reference-integrity skill |
| `src/lib/ai/search-source-policy.ts` | DEPRECATED: di-absorb ke source-quality skill |

## 7. Backward Compatibility

- `blocked-domains.ts` TETAP — tidak diubah, tidak di-deprecated
- `normalizeCitations()` TETAP — skill menambah layer, tidak mengganti
- `paper-search-helpers.ts` TETAP — search decision bukan scope skill ini
- Tool schema (Zod) TIDAK BERUBAH — skill validate di handler level, bukan schema level
- Response format TIDAK BERUBAH — `{ success, error }` pattern tetap sama

## 8. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|---------|
| URL canonicalization beda antara skill dan existing code | False positive/negative validation | Pakai fungsi canonicalize yang sama (sudah ada di route.ts) |
| Source quality scoring terlalu agresif, filter sumber valid | Kehilangan sumber bagus | MIN_QUALITY_SCORE = 30 (rendah), hanya blocked domains yang benar-benar terfilter |
| AI retry loop tak terbatas saat validation selalu gagal | Stream timeout | Vercel AI SDK `stopWhen: stepCountIs(maxToolSteps)` sudah ada sebagai safeguard |
| Reference integrity terlalu strict untuk referensi dari training data | AI tidak bisa cite pengetahuan umum | Instructions explisit mengizinkan referensi non-search dengan label "pengetahuan umum" |
