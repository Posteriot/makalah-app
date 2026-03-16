# Tools + Skills Architecture — Principles & Evidence

## Core Insight: Simple Tools, Smart Skills

Validated through iterative experimentation on the `search-tool-skills` branch:

> **Complex tool pipelines limit LLM intelligence. Keep tools simple, deliver intelligence through skills.**

### The Four Layers

| Layer | Role | Example |
|-------|------|---------|
| **Tool** | Simple executor — fetch data, no judgment | Perplexity/Grok/Google Grounding retrievers, FetchWeb content extraction, RAG vector search |
| **Skill (Retriever)** | Teach retriever model HOW to search | `getSearchSystemPrompt()`: priority sources, search query strategy |
| **Skill (Compose)** | Teach compose model HOW to judge and present | SKILL.md: credibility evaluation, blocklist, content verification, identity disambiguation, narration rules |
| **RAG** | Persistent source memory — chunk, embed, retrieve verbatim | `sourceChunks` table in Convex with vector search for exact quoting and cross-source retrieval |
| **Code Pipeline** | Minimal deterministic transform | Normalize URLs, format citations, resolve redirects, truncate for context window |

### Where This Applies

This architecture is not search-specific. Any domain where an LLM needs knowledge guidance follows the same pattern:

| Domain | Tools (Simple Executors) | Skills (Knowledge Layer) | RAG | Code Pipeline |
|--------|--------------------------|--------------------------|-----|---------------|
| **Web Search** | Retriever chain (Perplexity, Grok, Google Grounding) + FetchWeb (fetch+readability+turndown, Tavily fallback) | Retriever: `getSearchSystemPrompt()`. Compose: `SKILL.md` (evaluation, content verification, identity disambiguation, no inline domains) | Chunks stored in `sourceChunks` with embeddings. Tools: `quoteFromSource`, `searchAcrossSources` | Normalize citations, resolve proxy URLs, truncate for compose context |
| **File Upload** | File extractors (PDF, DOCX, PPTX, XLSX, TXT, image OCR) | Same SKILL.md for content evaluation | Same `sourceChunks` table — shared pipeline with web search | Extract text, inject as `fileContext` |
| **Paper Stages** | `startPaperSession`, `updateStageData`, `submitStageForValidation` | Stage instructions in `paper-stages/*.ts` (migration candidate) | RAG tools available in paper mode for verbatim quoting | `formatStageData` context injection |

## Principle 1: Tools Must Be Free

> "AI works better when you give tools and freedom instead of forcing them into rigid, hand-designed workflows" — Boris Cherny

**Don't constrain what tools can gather.** A retriever with a blocklist in its system prompt = a retriever with hobbled retrieval. A free retriever = more sources, more diversity.

In practice:
- ❌ Blocklist in search model's system prompt (constrains retrieval)
- ❌ Programmatic domain filtering via API parameters (rigid, binary include/exclude)
- ✅ Priority source guidance in system prompt — teaches retriever model what to actively seek and how to construct targeted queries (e.g., "Search specifically for content from: Kompas (kompas.com), Tempo (tempo.co)"). This is teaching, not restricting.
- ✅ Diversity hints in user message with priority source names — dual-channel delivery alongside system prompt
- ✅ Retrievers free to gather from anywhere — priority sources are guidance, not filters

**Paper stage equivalent:**
- ❌ Hardcoded validation that blocks stage progression based on rigid field counts
- ✅ Skill instructions that teach LLM when research is insufficient and what to do about it

## Principle 2: Skills Provide Intelligence

**Quality judgment = LLM's job, not code's job.** This applies to BOTH the retriever model and the compose model.

LLMs like Gemini are trained to follow instructions. A blocklist written as "NEVER cite wikipedia.org" in SKILL.md is effective as a primary intelligence layer. The code-level `isBlockedSourceDomain()` in the citation normalizer serves as a deterministic safety net — binary yes/no, zero risk of losing legitimate sources. Together they form defense-in-depth. Similarly, priority source guidance in the retriever system prompt teaches the retriever model to actively seek authoritative sources — more effective than API-level domain filtering.

Skills operate at two phases:
- **Retriever phase:** `getSearchSystemPrompt()` teaches the retriever model search strategy — what priority sources to seek, how to construct targeted queries. This is the retriever's skill-equivalent.
- **Compose phase:** `SKILL.md` teaches the compose model how to evaluate, filter, and present sources — blocklists, credibility criteria, priority source preference, narration rules.

In practice:
- ❌ Domain tier scoring (academic: 90, news: 70, blog: 30)
- ❌ Diversity enforcement algorithm
- ❌ API-level `search_domain_filter` (rigid binary include/exclude)
- ✅ `isBlockedSourceDomain()` as deterministic safety net in citation normalizer (binary filter, not quality judgment)
- ✅ Blocklist as natural language in SKILL.md (compose phase — primary enforcement)
- ✅ Priority source guidance in retriever system prompt (retriever phase) AND SKILL.md (compose phase)
- ✅ Credibility evaluation instructions (primary data, authorship, methodology)
- ✅ Diversification instructions ("mix data, news, expert analysis")

**Paper stage equivalent:**
- ❌ Hardcoded `PAPER_TOOLS_ONLY_NOTE` strings in `paper-search-helpers.ts`
- ❌ Deterministic `isStageResearchIncomplete()` with hardcoded field/count requirements
- ✅ Skill instructions that explain research completeness criteria per stage
- ✅ LLM decides when research is sufficient based on skill guidance

## Principle 3: Code Pipeline Must Be Minimal

**Every code step between tool output and LLM input = potential data loss.**

Code should only perform deterministic transforms that don't reduce data:
- ✅ Normalize URL format
- ✅ Normalize citation format (provider-specific → standard)
- ✅ Resolve redirect URLs (vertex proxy → actual)
- ✅ Dedup exact URL duplicates
- ❌ Score/rank sources
- ❌ Enrich titles via fetch (timeout = source loss)
- ❌ Filter by reachability (slow servers ≠ bad sources)

### Evidence: Pipeline Simplification

| Pipeline | Steps | Sources Preserved |
|----------|-------|-------------------|
| Complex (original) | normalize → score → enrich → filter → dedup → Gemini | 6 of 12 (50% lost) |
| Simplified | normalize → Gemini + SKILL.md | 14 of 14 (0% lost) |

## Principle 4: LLM Should Reason, Not Pipeline

> "Adding programmatic tool calling on top of basic search tools was the key factor that fully unlocked agent performance." — Anthropic, BrowseComp & DeepSearchQA benchmarks

Three key findings from Anthropic's Programmatic Tool Calling research:

1. **"Tool results from programmatic calls are NOT added to Claude's context — only the final code output is."** Every intermediate processing step between tool output and LLM reasoning = data the LLM never sees.

2. **LLM writes its own filtering logic** — In Anthropic's examples, Claude writes `errors = [log for log in logs if "ERROR" in log]`. The LLM decides what's relevant, not the developer.

3. **"This approach enables workflows that would be impractical with traditional tool use."** Traditional = developer-designed step-by-step pipeline. Modern = LLM reasons over raw data with skill guidance.

Our architecture follows this: pass raw tool output to LLM + provide SKILL.md instructions for HOW to reason about it.

## Principle 5: Separate Concerns

| Concern | Owner | Example |
|---------|-------|---------|
| **Quality judgment** | Skills (SKILL.md) | Source evaluation, blocklist, narration, integrity |
| **Workflow control** | Route logic + helpers | When search runs, mode switching, stage enforcement |
| **Tool execution** | Provider config | Which model, API key, retriever chain |

Don't mix. Search quality doesn't care whether context is paper or chat. Paper workflow doesn't care how sources are evaluated.

## Principle 6: Retriever-Specific Behavior

Each retriever has unique characteristics that tools must handle at the normalization layer:

| Retriever | Citation Source | Special Handling |
|-----------|----------------|------------------|
| **Perplexity Sonar** | `result.sources` (native) | Most citations (~16), cheapest (~Rp 80/search) |
| **Grok** | `result.sources` via `:online` suffix | Fewer citations (~5), moderate cost ($5/K) |
| **Google Grounding** | `result.providerMetadata` (gateway) | Vertex proxy URLs need redirect resolution, dedup, cap at 20 |

These differences belong in the **tool layer** (retriever implementations), not in skills or pipeline.

## Current State: Three-Phase Search + RAG Pipeline

### Phase 1: Retriever Search (silent, blocking)

```
getSearchSystemPrompt() + augmentUserMessageForSearch()
    ↓
Retriever chain (Google Grounding → Perplexity fallback)
    ↓
searchText + sources[] (NormalizedCitation[])
```

Retriever is swappable via admin config. Each retriever implements `SearchRetriever` interface: `buildStreamConfig()` + `extractSources()`.

### Phase 1.5: FetchWeb Content Extraction (inside stream execute)

```
sources[].url (max 7)
    ↓
Primary: Node.js fetch() + linkedom + @mozilla/readability + turndown → markdown
    ↓ (failed URLs)
Fallback: @tavily/core .extract() → markdown
    ↓
pageContent per source (truncated 12K chars for compose, full for RAG)
+ metadata block: Author, Published, Source (from readability + HTML meta tags)
```

FetchWeb runs INSIDE the stream `execute` callback (after first byte sent) — Vercel timeout doesn't apply.

### Phase 2: Compose (streaming to client)

```
COMPOSE_PHASE_DIRECTIVE (position #1 — anti-hallucination rules)
+ searchResultsContext (sources with verified page content)
+ systemPrompt + SKILL.md + fileContext
    ↓
Compose model (Gemini 2.5 Flash) → streaming response
```

Key: `searchText` is DROPPED from compose context when page content is available. This eliminates the contamination source (retriever synthesis that can hallucinate).

### Phase 3: RAG Ingest (background, after compose)

```
fullContent per source (no truncation)
    ↓
chunkContent() — section-aware, ~500 tokens per chunk
    ↓
embedTexts() — gemini-embedding-001, 768 dimensions, RETRIEVAL_DOCUMENT
    ↓
Convex sourceChunks table (vectorIndex)
```

Runs sequential (one source at a time) to avoid embedding API rate limits. Fire-and-forget — never blocks the user.

### RAG Retrieval (follow-up turns)

```
User asks about cited sources → search router detects RAG chunks available
    ↓
RAG override: enableWebSearch=false (unless explicit new-search trigger)
    ↓
Normal chat path WITH tools:
  quoteFromSource({ sourceId, query }) → vector search → verbatim chunks
  searchAcrossSources({ query }) → cross-source vector search → relevant chunks
```

RAG tools are NOT available during compose phase (no tools in compose). Available in follow-up turns via `paper-tools.ts`.

### Search Decision — RAG-Aware Override

```
Pre-router: check sourceChunks.hasChunks(conversationId)
    ↓
Router prompt: informed that RAG tools are available
    ↓
Post-router guard: if ragChunksAvailable + searchAlreadyDone + no explicit new-search trigger
    → force enableWebSearch=false
    ↓
Explicit triggers bypass: "cari lagi", "tambah sumber", "search again" → allow new search
```

### File Upload → RAG Pipeline

```
"+ Konteks" button → upload → /api/extract-file → extractedText
    ↓
if (file.conversationId && extractedText):
    ingestToRag({ sourceType: "upload", content: extractedText })
    → same chunk → embed → store pipeline
```

conversationId always exists (app creates conversation before file upload).

### Key Files

| File | Description |
|------|-------------|
| `src/lib/ai/search-system-prompt.ts` | Retriever-phase skill: search strategy + priority sources |
| `src/lib/ai/skills/web-search-quality/SKILL.md` | Compose-phase skill: evaluation, content verification, identity disambiguation, verbatim quoting tools |
| `src/lib/ai/web-search/orchestrator.ts` | Three-phase flow: retriever → FetchWeb → compose + RAG ingest |
| `src/lib/ai/web-search/content-fetcher.ts` | FetchWeb: fetch + readability + turndown + metadata extraction, Tavily fallback |
| `src/lib/ai/web-search/retrievers/*.ts` | Strategy pattern retriever implementations |
| `src/lib/ai/chunking.ts` | Section-aware content chunker (~500 tokens) |
| `src/lib/ai/embedding.ts` | Google gemini-embedding-001 client with retry |
| `src/lib/ai/rag-ingest.ts` | Core RAG pipeline: chunk → embed → store |
| `src/lib/ai/paper-tools.ts` | Paper tools including `quoteFromSource`, `searchAcrossSources` |
| `src/lib/ai/search-results-context.ts` | Build compose context with pageContent (verified/unverified labels) |
| `src/lib/citations/normalizer.ts` | Citation normalization: AI SDK + Google Grounding formats |
| `src/lib/ai/blocked-domains.ts` | Deterministic domain blocklist (safety net) |
| `convex/sourceChunks.ts` | Convex mutations + vector search action for RAG |
| `convex/schema.ts` | sourceChunks table with vectorIndex (768 dims) |

### Paper Stages — Hardcoded Instructions (migration candidate)

```
Paper tool calls → hardcoded stage instructions → formatStageData context injection
```

- `src/lib/ai/paper-stages/*.ts` — hardcoded TypeScript instruction strings
- `src/lib/ai/paper-search-helpers.ts` — hardcoded system notes + deterministic checks
- `src/lib/ai/paper-mode-prompt.ts` — prompt injection

See `future-paper-workflow-skill-notes.md` for migration analysis.

## References

- Anthropic: "The Complete Guide to Building Skills for Claude" (`.references/skills/`)
- Anthropic: "Programmatic Tool Calling" (`.references/programatic-tools-calling/`)
- Boris Cherny: tools + freedom > rigid workflows
- `architecture-constraints.md` — technical constraints and rules
- `web-search-quality-skill-design.md` — skill architecture detail
- `future-paper-workflow-skill-notes.md` — paper stage skill migration analysis

## File Index

| File | Description |
|------|-------------|
| `README.md` | This document — principles and evidence |
| `architecture-constraints.md` | Architecture rules: language, scope, tools vs skills |
| `future-paper-workflow-skill-notes.md` | Paper stage skill migration analysis |
| `enforcement/README.md` | Full technical documentation: search mode decision, orchestrator, retrievers, skills, citations |
| `enforcement/priority-sources/` | Design doc and implementation plan for priority search targeting |
| `fetchweb/README.md` | FetchWeb problem statement: hallucination root cause, proposed direction |
| `rag/context-rationale.md` | Why RAG + FetchWeb: truncation loss, verbatim quoting, cross-source retrieval |
| `rag/design.md` | RAG pipeline design: Convex-native, gemini-embedding-001, two retrieval tools |
| `rag/implementation-plan.md` | RAG implementation plan (14 tasks) |
| `rag/known-issues.md` | Known issues and their resolution status |
