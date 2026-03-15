# Handoff: Priority Search Targeting

> **Purpose**: Konteks untuk brainstorming di sesi baru.
> **Branch**: `search-tool-skills-v2` (worktree: `.worktrees/search-tool-skills-v2/`)
> **Date**: 2026-03-13
> **DO NOT PUSH** — user wants all commits together on this branch.

---

## Problem Statement

Search results saat ini **terlalu random**. Retriever (Perplexity/Grok/Google Grounding) mengembalikan sumber-sumber acak, seringkali melewatkan sumber otoritatif yang seharusnya muncul. Contoh:

- **Jurnal/database akademik**: ResearchGate, Scopus, SINTA, Garuda, Google Scholar — jarang muncul
- **Universitas terkemuka Indonesia**: UI, UGM, ITB, UIN, Unair — repository mereka hampir tidak pernah dikutip
- **Media massa terkemuka**: Kompas, Tempo, Republika — bahkan untuk topik Indonesia, Kompas tidak pernah masuk

## User Intent

> "Prioritas sebagai rujukan model, bukan pengikat absolut."

- **BUKAN blocklist** — jangan larang sumber lain
- **BUKAN hard requirement** — jangan gagalkan search kalau sumber prioritas tidak muncul
- **PRIORITAS** — dorong retriever untuk menyertakan sumber ini, tapi biarkan model menilai sendiri mana yang relevan
- **Guidance** — ini petunjuk, bukan aturan rigid
- Berlaku untuk **paper mode DAN chat mode** — user menyebut media massa (Kompas, Tempo, Republika) yang relevan di kedua mode

## Current Architecture (Relevant Parts)

### Retriever Phase (Phase 1)

```
orchestrator.ts:89-94 — actual call order:

1. getSearchSystemPrompt()               ← system message pertama di array
2. sanitizedMessages (user + assistant)   ← conversation history
3. augmentUserMessageForSearch(array)     ← WRAPS entire array, modifies last user message
   ↓
Perplexity / Grok / Google Grounding     ← retriever searches the web
   ↓
Raw results + citations
```

**`search-system-prompt.ts`** — dua fungsi, keduanya saat ini tanpa context parameter:

1. `getSearchSystemPrompt()` — System prompt untuk retriever, elemen pertama di message array:
   ```
   "You are a research assistant. Provide thorough, well-sourced answers
    with inline citations from diverse sources."
   ```

2. `augmentUserMessageForSearch(messages)` — Menerima seluruh message array, memodifikasi `content` dari **user message terakhir**:
   ```
   [Search broadly. Cite at least 10 sources from many different domains.
    Include both domestic and international sources.
    Do not over-rely on any single domain.]
   ```

**Retriever behavior per provider:**
- **Perplexity/Grok**: User message content langsung jadi basis search query → hints di user message langsung mempengaruhi retrieval
- **Google Grounding**: Menggunakan `google.tools.googleSearch({})` sebagai tool → model memutuskan sendiri query apa yang dikirim ke Google Search berdasarkan seluruh conversation context (system prompt + user message). Pengaruh hints lebih indirect.

### Compose Phase (Phase 2)

```
Retriever results
    ↓
COMPOSE_PHASE_DIRECTIVE (override)
searchResultsContext (sources + text)
systemPrompt (persona)
SKILL.md instructions (via composeSkillInstructions)
    ↓
Gemini compose → final response to user
```

**`SKILL.md`** (`src/lib/ai/skills/web-search-quality/SKILL.md`) punya 5 section:
- `## BLOCKED DOMAINS` — wikipedia, medium, etc.
- `## RESEARCH SOURCE STRATEGY` — credibility evaluation criteria
- `## RESPONSE COMPOSITION` — depth expectations, source usage
- `## REFERENCE INTEGRITY` — claim-source alignment
- `## STAGE CONTEXT` — per-stage guidance (subsections `### gagasan`, `### topik`, dll, plus `### default`)

**`index.ts` section loading behavior:**
`getInstructions()` di `index.ts:107-120` hanya load 3 section secara explicit by name: `RESEARCH SOURCE STRATEGY`, `RESPONSE COMPOSITION`, `REFERENCE INTEGRITY`. Section lain (termasuk `BLOCKED DOMAINS`) di-parse ke `sections` Map tapi **tidak di-inject ke compose instructions**. Section `STAGE CONTEXT` di-load terpisah via `stageGuidance` Map (`index.ts:122-136`).

### Orchestrator Config

`WebSearchOrchestratorConfig` (`web-search/types.ts:26-42`) sudah punya field-field:
- `paperModePrompt?: string` — truthy saat paper mode aktif
- `currentStage?: string` — stage paper saat ini
- `messages` — conversation history
- `systemPrompt: string` — main app system prompt

Kedua field ini tersedia di orchestrator saat memanggil `getSearchSystemPrompt()` dan `augmentUserMessageForSearch()`.

## Architecture Constraints (Existing)

Dari `CLAUDE.md`:
- **Tools must be simple executors.** Do not add filtering, scoring, or quality judgment to tool pipelines.
- **Skills provide intelligence.** Quality judgment, blocklists, evaluation criteria belong in SKILL.md.
- **Minimize code between tool output and LLM input.** Every intermediate processing step is a potential data loss point.
- **LLMs reason better than hardcoded pipelines.**

Dari `architecture-constraints.md`:
- Retriever = "dumb pipe" — search and return, no filtering
- Blocklist enforcement di SKILL.md (natural language) — bukan code filter
- Search system prompt strategy: "Retrievers receive a minimal system prompt... NO blocklist in search system prompt"
- "Perplexity uses user message content as search query basis — system prompt affects text, not retrieval"

## Relevant Files

| File | Content |
|------|---------|
| `src/lib/ai/search-system-prompt.ts` | `getSearchSystemPrompt()` + `augmentUserMessageForSearch()` — satu-satunya injection point ke retriever |
| `src/lib/ai/web-search/orchestrator.ts` | Two-pass flow; calls both functions at line 89-94 |
| `src/lib/ai/web-search/types.ts` | `WebSearchOrchestratorConfig` interface |
| `src/lib/ai/skills/web-search-quality/SKILL.md` | Compose-phase quality instructions |
| `src/lib/ai/skills/web-search-quality/index.ts` | Skill loader; `getInstructions()` explicit section loading |
| `src/lib/ai/skills/types.ts` | `SkillContext` interface |
| `src/lib/ai/blocked-domains.ts` | `BLOCKED_DOMAINS` list + `isBlockedSourceDomain()` |
| `src/lib/ai/web-search/retrievers/perplexity.ts` | Perplexity retriever implementation |
| `src/lib/ai/web-search/retrievers/grok.ts` | Grok retriever implementation |
| `src/lib/ai/web-search/retrievers/google-grounding.ts` | Google Grounding retriever — uses `google.tools.googleSearch({})` |
| `docs/search-tool-skills/enforcement/README.md` | Full search architecture documentation |
| `docs/search-tool-skills/architecture-constraints.md` | Design constraints and principles |
| `__tests__/skills/web-search-quality-index.test.ts` | Existing skill tests |

**Tidak ada test file existing** untuk `search-system-prompt.ts`.

## Git State

Branch `search-tool-skills-v2`, latest commits:
```
6630be83 docs: update enforcement README skill directory and availability table
db3c11df chore: remove dead code, fix stale tests, add enforcement docs
d8f2f6e2 fix: make markdown table rows immune to citation formatter processing
c200e9f3 fix: resolve compose phase conflicts and enable skill loading for all stages
adbada47 docs: update tests and architecture docs for full regex elimination
bb6e2653 refactor: remove weak-signal regex from hasPreviousSearchResults
78ac3b18 refactor: move save/submit detection from regex to LLM router intentType
8e5c0447 refactor: move compile daftar pustaka detection from regex to LLM router intentType
5929b89c refactor: remove isExplicitSearchRequest and isExplicitSyncRequest regex
be4c5565 feat: extend LLM router schema with intentType enum and enhance prompt
e60c5c47 docs: switch from reason string matching to intentType enum schema
da1bd3d0 docs: add design doc and plan for regex elimination and instruction strengthening
0cb03d8a refactor: remove unused regex functions from paper-search-helpers
4d1f3e44 docs: update architecture docs for unified LLM router
e9637bdb refactor: unify search mode decision under LLM router for all stages
706910ee refactor: make search orchestrator retriever-agnostic
a940f708 chore: sync generated types and update search model comments
1fd442de feat: add migration to fix web search deadlock in DB stage skills
ddb0b43a fix: convert Convex tool responses and route.ts model instructions to English
fec84646 refactor: convert all model instructions from Indonesian to English
```

Working tree: clean, 520 tests passing, 0 failures.
**DO NOT PUSH** — all commits stay together until entire feature set is complete.
