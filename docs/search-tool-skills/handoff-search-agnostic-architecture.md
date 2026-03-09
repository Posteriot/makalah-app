# Handoff: Search-Agnostic Compose Architecture

> **Untuk sesi baru.** Copy paste dokumen ini sebagai konteks awal.

## Apa yang Sudah Dikerjakan (branch `search-tool-skills`)

### Arsitektur Saat Ini

```
Retriever (Perplexity/Grok via OpenRouter)
    → normalizeCitations()
    → pass ALL sources + raw text to Gemini compose
    → Gemini reads SKILL.md → response with citations
```

### Perubahan Kunci yang Sudah Dilakukan

1. **Pipeline disederhanakan** dari 6-step ke 2-step:
   - SEBELUM: normalize → score by domain tier → enrich titles → filter unreachable → dedup by final URL → Gemini
   - SESUDAH: normalize → Gemini + SKILL.md
   - Hasil: 50% source loss → 0% source loss (6 → 14 sources)

2. **Blocklist dipindahkan dari code ke SKILL.md:**
   - `isBlockedSourceDomain()` filter dihapus dari route.ts
   - Blocklist ditulis sebagai natural language di SKILL.md section "BLOCKED DOMAINS"
   - Gemini menghormati blocklist tanpa enforcement programatik (validated: 0 blocked domains dikutip)

3. **Search system prompt diminimalkan:**
   - Perplexity/Grok hanya dapat: "You are a research assistant. Provide thorough, well-sourced answers..."
   - TIDAK ada blocklist di search system prompt (membatasi retrieval)
   - User message di-augment dengan diversity hints

4. **SKILL.md** sekarang punya sections:
   - BLOCKED DOMAINS — natural language blocklist
   - RESEARCH SOURCE STRATEGY — evaluasi kredibilitas sumber
   - RESPONSE COMPOSITION — persona peneliti, depth expectations
   - REFERENCE INTEGRITY — integritas sitasi
   - STAGE CONTEXT — instruksi per stage paper workflow

### File-File Kunci

| File | Fungsi |
|------|--------|
| `src/app/api/chat/route.ts` | Orchestrator — search mode routing, Phase 1 (search) → Phase 2 (compose) |
| `src/lib/ai/skills/web-search-quality/SKILL.md` | Instruksi untuk Gemini compose phase |
| `src/lib/ai/skills/web-search-quality/index.ts` | Parser SKILL.md, expose `getInstructions()` |
| `src/lib/ai/skills/index.ts` | Registry: `getSearchSkill()`, `composeSkillInstructions()` |
| `src/lib/citations/normalizer.ts` | `normalizeCitations(raw, provider)` — normalize ke format standar |
| `src/lib/ai/search-system-prompt.ts` | System prompt + user message augmentation untuk search models |
| `src/lib/ai/search-results-context.ts` | `buildSearchResultsContext()` — format sources + text untuk Gemini |
| `src/lib/ai/streaming.ts` | Model factory: `getWebSearchModel()`, `getWebSearchFallbackModel()` |
| `src/lib/ai/blocked-domains.ts` | Canonical blocklist (shared reference, TIDAK dipanggil di pipeline) |

### Prinsip Arsitektur yang Sudah Terbukti

1. **Tools = simple executors.** Retriever hanya ambil data, nggak menilai.
2. **Skills = intelligence layer.** SKILL.md mengajarkan Gemini BAGAIMANA menilai.
3. **Minimal code pipeline.** Hanya normalize format — jangan filter, score, enrich, atau dedup.
4. **LLM reasoning > hardcoded pipeline.** Validated oleh Anthropic Programmatic Tool Calling research (BrowseComp, DeepSearchQA benchmarks).
5. **Blocklist via natural language.** Gemini cukup cerdas untuk menghormati "NEVER cite" instruction.

Reference docs: `docs/search-tool-skills/README.md`, `architecture-constraints.md`

---

## Apa yang Akan Dikerjakan: Search-Agnostic Architecture

### Visi

Saat ini hanya 2 retriever (Perplexity primary, Grok fallback). Arsitekturnya sudah terbukti model-agnostic. Tujuan: **retriever apapun yang accessible via OpenRouter dan punya kemampuan search bisa dipasang sebagai search tool.**

```
┌─ Perplexity Sonar    (native search)              ─┐
│  Grok                (web_search_options)            │
│  Google Grounding    (via OpenRouter, bukan Gateway) │→ normalize → Gemini + SKILL.md
│  OpenAI Search       (via OpenRouter :online)        │
│  [model lain via OpenRouter]                         │
└─────────────────────────────────────────────────────┘
```

**PENTING:** Google Grounding harus via OpenRouter atau direct API — BUKAN via AI Gateway di mana Gemini compose tinggal. Kalau Grounding jalan di AI Gateway, search dan compose terjadi dalam satu pass (Gemini search+compose sekaligus), dan arsitektur dua-pass (search terpisah → compose terpisah) rusak.

### Yang Konstan (Tidak Berubah)

1. **Gemini compose + SKILL.md** — satu composer, satu set instruksi
2. **`buildSearchResultsContext()`** — format sources + text untuk Gemini
3. **`composeSkillInstructions()`** — inject SKILL.md ke compose phase
4. **Phase 1 → Phase 2 pattern** — search dulu (silent), compose kemudian (streamed)

### Yang Perlu Dibangun Per Retriever Baru

| Komponen | Deskripsi |
|----------|-----------|
| **Normalizer** | Setiap retriever punya format citation berbeda. Perlu `normalizeCitations(raw, 'google-grounding')` dsb. |
| **Model factory** | Fungsi baru di `streaming.ts` — `getGoogleGroundingModel()`, `getOpenAISearchModel()`, dsb. |
| **Mode routing** | `resolveSearchExecutionMode()` perlu tahu retriever mana yang available dan pilih |
| **Admin config** | Database config untuk enable/disable per retriever + model ID per retriever |

### Pertanyaan Desain yang Harus Dijawab

1. **Routing strategy:** Failover chain (A gagal → B → C) vs smart routing vs parallel merge?
   - Failover = simple, murah, tapi latency naik saat failover
   - Smart routing = optimal tapi butuh classifier
   - Parallel merge = diversifikasi maksimal tapi 2-3x cost
   - **Rekomendasi sesi sebelumnya:** mulai dengan failover chain (sudah proven), evolve ke smart routing kalau data cukup

2. **Prioritas retriever mana dulu?**
   - Google Grounding via OpenRouter — coverage Google Search, potentially gratis/murah
   - OpenAI Search via OpenRouter — coverage Bing, format mungkin paling standar
   - Pertimbangan: price/quality ratio per retriever

3. **Normalizer architecture:**
   - Extend `normalizeCitations()` dengan provider baru?
   - Atau satu normalizer per retriever di folder masing-masing?

4. **Admin panel:**
   - Satu dropdown "search provider" (pilih 1)?
   - Atau multi-select dengan priority order?
   - Atau primary + fallback (seperti sekarang) tapi dropdown-nya lebih banyak pilihan?

### Citation Format per Retriever (yang sudah diketahui)

| Retriever | Format Source | Normalizer |
|-----------|-------------|------------|
| Perplexity Sonar | `sources` array di stream metadata | `normalizeCitations(raw, 'perplexity')` ✅ |
| Grok (OpenRouter) | `annotations` di provider metadata | `normalizeCitations(raw, 'openrouter')` ✅ |
| Google Grounding | `groundingMetadata.groundingChunks` | Belum ada — perlu dibuat |
| OpenAI Search | TBD — perlu riset format | Belum ada — perlu riset |

### Constraint

- **Semua retriever harus via OpenRouter** (single API key, unified billing, model switching tanpa code change)
- **SKILL.md tidak perlu berubah** — instructions agnostic terhadap retriever
- **`search-system-prompt.ts` bisa reuse** — prompt generik, works untuk semua retriever
- **Telemetry perlu identifier** — log retriever mana yang dipake per request

---

## Konteks Teknis Tambahan

### Cara Perplexity Dipanggil Sekarang

```typescript
// streaming.ts
const openrouter = createOpenRouter({ apiKey })
return openrouter.chat(config.webSearch.webSearchModel) // "perplexity/sonar"
```

```typescript
// route.ts — Phase 1
const perplexityResult = streamText({
    model: webSearchModel,
    messages: searchMessages, // augmented with diversity hints
    ...samplingOptions,
})
searchText = await perplexityResult.text
const rawSources = await perplexityResult.sources
```

### Cara Grok Dipanggil Sekarang

```typescript
// streaming.ts
const openrouter = createOpenRouter({ apiKey })
return openrouter.chat(config.webSearch.webSearchFallbackModel, {
    web_search_options: {
        max_results: config.webSearch.fallbackMaxResults ?? 10,
        engine: config.webSearch.fallbackEngine,
    },
})
```

### Admin Config Fields (database)

```
webSearchModel: "perplexity/sonar"           // primary
webSearchFallbackModel: "x-ai/grok-3-mini"  // fallback
primaryWebSearchEnabled: true
fallbackWebSearchEnabled: true
fallbackWebSearchEngine: "auto" | "native" | "exa"
fallbackWebSearchMaxResults: 5
```

### Two-Pass Architecture (WAJIB dipertahankan)

```
Phase 1: Search (silent, not streamed to user)
  → retriever model dipanggil
  → await full text + sources
  → normalize citations

Phase 2: Compose (streamed to user)
  → Gemini dipanggil dengan:
    - system prompt (persona)
    - SKILL.md instructions
    - search results context (sources + text)
    - user conversation
  → response streamed ke client
```

Ini TIDAK boleh jadi single-pass (search + compose sekaligus). Gemini compose harus terpisah supaya SKILL.md bisa di-inject.

---

## Git State

- **Branch:** `search-tool-skills`
- **Worktree:** `/Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills`
- **Latest commits:**
  - `0d1b7ea` — docs: Anthropic Programmatic Tool Calling evidence
  - `cb164a7` — experiment: blocklist from code to SKILL.md
  - `08bac09` — simplify source pipeline to normalize → blacklist → Gemini
  - Earlier commits: pipeline simplification, telemetry schema migration, SKILL.md creation

---

## Mulai Dari Mana

1. **Riset dulu:** Format citation Google Grounding via OpenRouter dan OpenAI Search via OpenRouter. Cek apakah OpenRouter expose metadata yang sama.
2. **Pilih satu retriever** untuk experiment pertama (rekomendasi: Google Grounding — paling berbeda coverage-nya dari Perplexity).
3. **Buat normalizer** untuk format baru.
4. **Wire ke route.ts** sebagai mode ketiga.
5. **Test** — bandingkan source count dan diversity vs Perplexity.
