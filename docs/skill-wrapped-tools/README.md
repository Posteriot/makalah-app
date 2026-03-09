# Skill-Wrapped Tools Pattern

Dokumen fondasi untuk pattern "Skill-Wrapped Tools" di Makalah App.

## Arsitektur: Two-Pass Search

### Prinsip Utama

**"Perplexity cari, Gemini tulis, Skills = ketrampilan menulis ilmiah untuk sang penulis."**

Perplexity Sonar adalah search tool — ia menemukan sumber. Gemini 2.5 Flash adalah penulis — ia menyusun narasi. Skills membekali Gemini dengan ketrampilan riset ilmiah: bagaimana mengevaluasi sumber, membangun argumen dari data, dan menjaga integritas referensi.

### Data Flow

```
User message
    │
    ▼
Phase 1: SEARCH (silent — user melihat "Mencari sumber...")
    ├─ Perplexity Sonar dipanggil via OpenRouter (TIDAK streaming ke user)
    ├─ Await completion (.text + .sources)
    ├─ Source pipeline: normalizeCitations → validateWithScores → enrichTitles → dedup
    └─ Result: ScoredSource[] (URL + title + tier + score)
    │
    ▼
Phase 2: COMPOSE (streaming — user melihat "Menyusun jawaban dari N sumber...")
    ├─ Gemini menerima:
    │   ├─ System prompt (MOKA identity)
    │   ├─ Skill instructions (RESEARCH SOURCE STRATEGY + REFERENCE INTEGRITY)
    │   ├─ Source list (URL + title + tier — TANPA raw text Perplexity)
    │   └─ User messages
    ├─ Gemini compose narasi dari nol, guided by skills
    └─ Citations: data-cited-text + data-cited-sources
    │
    ▼
Phase 3: PERSIST
    ├─ Save message + sources ke DB
    └─ Paper session: append references
```

### Kenapa Tanpa Raw Text

Perplexity menghasilkan raw search text (jawaban lengkap dengan struktur dan narasi). Jika raw text ini dikirim ke Gemini sebagai konteks, Gemini akan **rewrite ulang** teks Perplexity alih-alih compose dari nol. Hasilnya: output identik dengan Perplexity direct, skill instructions diabaikan.

Solusi: Gemini hanya menerima **daftar sources** (URL + title + tier), bukan raw text. Ini memaksa Gemini compose narasi sendiri mengikuti skill instructions.

### Fallback Chain

| Failure | Handling |
|---------|----------|
| Perplexity gagal (Phase 1) | Fallback ke Grok silent search. Grok juga gagal → Gemini jawab tanpa sources |
| Sources kosong | Gemini compose tanpa search context, masih dengan skill instructions |
| Gemini gagal (Phase 2) | Fallback ke OpenRouter model compose |

## Skill System

### Dua Skills Aktif

#### 1. Source Quality Skill (Pipeline Skill)

**File:** `src/lib/ai/skills/source-quality.skill.ts`

**Instructions** (`RESEARCH SOURCE STRATEGY`):
- Evaluasi substansi sumber (primary data, methodology, analysis)
- Source selection by purpose (factual → data, theory → academic, trends → news)
- Build narrative FROM sources (bukan list fakta)
- Diversifikasi perspektif
- Stage-specific guidance (gagasan, tinjauan_literatur, pendahuluan, dll)

**Validation** (`validateWithScores`):
- Score tiap URL berdasarkan domain tier (academic: 90, institutional: 80, news-major: 70, unknown: 40, blocked: 0)
- Bonus/penalty: article path (+5), homepage (-10), informative title (+5)
- Filter di bawah threshold (score < 30)
- Diversity check (3+ dari domain sama, 4+ dari tier sama)

**Insertion point:** Phase 1 source pipeline, setelah normalizeCitations, sebelum enrichment.

#### 2. Reference Integrity Skill (Tool-Boundary Skill)

**File:** `src/lib/ai/skills/reference-integrity.skill.ts`

**Instructions** (`REFERENCE INTEGRITY`):
- Integration, not decoration — setiap sitasi harus serve a purpose
- Source honesty — hanya cite URL dari search results
- Claim-source alignment — factual claims butuh primary data
- When to request more sources — acknowledge gaps

**Validation:**
- Cross-check referensi AI vs available search results
- createArtifact/updateArtifact: sources wajib ada, URL harus match
- updateStageData: reference URLs harus dari search results

**Insertion point:** Di dalam `execute()` handler tools (createArtifact, updateArtifact, updateStageData).

### Skill Module Interface

```typescript
interface Skill<TValidateArgs = unknown> {
  name: string
  wrappedTools: string[]
  instructions(context: SkillContext): string | null
  validate(args: TValidateArgs): ValidationResult
  examples: ToolExample[]
}
```

### Compose Flow

```typescript
// src/lib/ai/skills/index.ts
composeSkillInstructions(context: SkillContext): string
// → Panggil instructions() dari semua skills
// → Filter null (skill tidak relevan untuk context)
// → Join dengan \n\n
```

Context-aware: skill instructions berbeda tergantung:
- `isPaperMode` — paper session vs chat biasa
- `currentStage` — stage guidance berbeda per tahap
- `hasRecentSources` — reference integrity hanya aktif saat ada sources
- `availableSources` — list sources untuk cross-check

## Directory Structure

```
src/lib/ai/skills/
├── index.ts                          → Skill registry, compose, discover
├── types.ts                          → Interface Skill, ValidationResult, ToolExample
├── reference-integrity.skill.ts      → Integrity methodology + URL validation
└── source-quality.skill.ts           → Research strategy + domain scoring

src/lib/ai/
├── search-results-context.ts         → Format source list untuk Gemini (tanpa raw text)
├── search-execution-mode.ts          → Resolve: primary_perplexity | fallback_web_search | off
├── blocked-domains.ts                → Blocked domain list
└── stage-skill-contracts.ts          → Stage-skill mapping (active/passive search stages)
```

## Key Files di Route.ts

- **Phase 1 (Perplexity primary):** `route.ts` ~line 2315-2440
- **Phase 1 (Grok fallback):** `route.ts` ~line 3280-3430
- **Phase 2 (Gemini compose):** `route.ts` ~line 2443-2467 (primary), ~line 3432-3455 (fallback)
- **Skill injection:** `composeSkillInstructions(skillContext)` → system message
- **Source context:** `buildSearchResultsContext(scoredSources)` → system message

## UI Loading States

```
Phase 1 start:  { type: "data-search", data: { status: "searching" } }
Phase 1 done:   { type: "data-search", data: { status: "composing", sourceCount: N } }
Phase 2 start:  Gemini streaming begins (text-delta chunks)
Phase 2 done:   data-cited-text + data-cited-sources

User sees:
1. "Pencarian internet..." (shimmer) — Perplexity silent search
2. "Menyusun jawaban dari N sumber..." (shimmer) — transition
3. Text streaming dari Gemini
4. Citations di akhir
```

**Components:**
- `SearchStatusIndicator.tsx` — status display dengan shimmer (status-based, bukan string-based)
- `MessageBubble.tsx` — `extractSearchStatus()` parse data-search events termasuk "composing"

## Referensi

- [Anthropic Agent Skills Overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Anthropic Advanced Tool Use](https://www.anthropic.com/engineering/advanced-tool-use)
- Design doc: `docs/skill-wrapped-tools/skill-search-tool/two-pass-search-design.md`
- Implementation plan: `docs/plans/2026-03-09-two-pass-search.md`
