# Web Search System — Technical Documentation

## Overview

The web search system enables the Makalah AI assistant to augment responses with real-time web sources. It operates across two contexts: **chat mode** (general conversation) and **paper mode** (structured academic paper workflow with 14 stages).

The system follows three core principles:
1. **Tools are simple executors** — retrieve data, no quality judgment
2. **Skills provide intelligence** — natural language instructions guide the LLM's synthesis
3. **Code pipeline is minimal** — normalize formats only, pass everything to the LLM

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        route.ts (API Layer)                     │
│  Search Mode Decision → Retriever Chain → Orchestrator Dispatch │
│  RAG-aware override: skip search when chunks available          │
└────────────┬───────────────────────────────────────┬────────────┘
             │                                       │
    ┌────────▼────────┐                   ┌──────────▼──────────┐
    │   LLM Router    │                   │    Orchestrator      │
    │ decideWebSearch  │                   │  Three-Phase Flow    │
    │    Mode()       │                   │  Phase 1: Retrieve   │
    │ + RAG override  │                   │  Phase 1.5: FetchWeb │
    └─────────────────┘                   │  Phase 2: Compose    │
                                          │  Phase 3: RAG Ingest │
                                          └──────────┬──────────┘
                                                     │
                         ┌───────────────────────────┼───────────────┐
                         │                           │               │
                ┌────────▼───────┐         ┌────────▼──────┐  ┌─────▼──────┐
                │   Perplexity   │         │     Grok      │  │  Google    │
                │   Retriever    │         │   Retriever   │  │ Grounding  │
                └────────────────┘         └───────────────┘  └────────────┘
                                                     │
                                          ┌──────────▼──────────┐
                                          │   FetchWeb           │
                                          │  fetch+readability   │
                                          │  + Tavily fallback   │
                                          └──────────┬──────────┘
                                                     │
                                          ┌──────────▼──────────┐
                                          │   Citation Pipeline  │
                                          │  normalize → format  │
                                          │  → internal thought  │
                                          │  → stream to client  │
                                          └──────────┬──────────┘
                                                     │
                                          ┌──────────▼──────────┐
                                          │   RAG Pipeline       │
                                          │  chunk → embed →     │
                                          │  Convex vectorIndex   │
                                          └─────────────────────┘
```

### Layer Responsibilities

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Search Mode Decision** | Determine WHETHER to search (LLM router + RAG-aware override) | `route.ts` |
| **Retriever Chain** | Build ordered list of retriever candidates from admin config | `web-search/config-builder.ts` |
| **Orchestrator** | Execute three-phase search flow (retrieve → FetchWeb → compose) + RAG ingest | `web-search/orchestrator.ts` |
| **FetchWeb** | Fetch actual page content from source URLs, convert to markdown | `web-search/content-fetcher.ts` |
| **Retrievers** | Simple executors: call external API, extract citations | `web-search/retrievers/*.ts` |
| **Skills** | Natural language instructions guiding LLM synthesis | `skills/web-search-quality/SKILL.md` |
| **RAG** | Chunk, embed, store source content; retrieve verbatim for quoting | `chunking.ts`, `embedding.ts`, `rag-ingest.ts`, `convex/sourceChunks.ts` |
| **Citation Pipeline** | Normalize, format, and stream citations to client | `citations/*.ts`, `internal-thought-separator.ts` |
| **System Notes** | Contextual instructions injected based on search decision | `paper-search-helpers.ts` |

---

## Search Mode Decision

### Unified LLM Router

All search mode decisions — for ACTIVE stages, PASSIVE stages, and chat mode — flow through a single LLM router: `decideWebSearchMode()` in `route.ts`.

**Input:**
```typescript
{
  model: LanguageModel           // Gemini gateway model
  recentMessages: unknown[]      // Last 8 messages for context
  isPaperMode: boolean           // Paper session active?
  currentStage: PaperStageId     // Current paper stage
  stagePolicy: "active" | "passive" | "none"
  previousSearchDone: boolean    // Has search already run this conversation?
  previousSearchSourceCount?: number
  researchStatus: {              // From isStageResearchIncomplete()
    incomplete: boolean
    requirement?: string
  }
  ragChunksAvailable?: boolean   // RAG chunks exist for this conversation?
}
```

**Output:**
```typescript
{
  enableWebSearch: boolean       // Should web search run?
  confidence: number             // 0.0 – 1.0
  reason: string                 // Human-readable explanation
  intentType: "search" | "discussion" | "sync_request" | "compile_daftar_pustaka" | "save_submit"
}
```

**Implementation:** Uses `generateText` + `Output.object({ schema })` with Zod validation, temperature 0.2. Has retry (2 attempts) + freeform JSON fallback parsing. Safe default on total failure: `enableWebSearch: true` (search is never harmful).

### Intent Classification

The `intentType` enum replaces all former regex-based intent detection:

| Intent | Description | enableWebSearch |
|--------|-------------|-----------------|
| `search` | User/AI needs factual data, references, literature | `true` |
| `discussion` | Pure discussion, opinion, no factual claims needed | `false` |
| `sync_request` | User wants to sync/check session state | `false` |
| `compile_daftar_pustaka` | User wants to compile bibliography | `false` |
| `save_submit` | User wants to save, submit, or approve stage draft | `false` |

**Priority:** `sync_request` > `compile_daftar_pustaka` > `save_submit` > `search` > `discussion`

### Pre-Router Guardrails

Before the LLM router runs, one structural check applies:

| Guardrail | Condition | Effect |
|-----------|-----------|--------|
| `forcePaperToolsMode` | Paper intent detected but no session created yet | `enableWebSearch = false` — lets AI call `startPaperSession` first |

### Post-Router Processing

After the LLM router returns, the decision flows through:

1. **Post-router intent handling** — `sync_request`, `compile_daftar_pustaka`, and `save_submit` intents override search to `false` and inject appropriate system notes
2. **RAG-aware override** — If `ragChunksAvailable && searchAlreadyDone && !explicitNewSearchTrigger`, force `enableWebSearch = false`. This prevents redundant web searches when the user asks about previously cited sources — RAG tools (`quoteFromSource`, `searchAcrossSources`) handle these in the normal chat path. Explicit new-search triggers ("cari lagi", "tambah sumber", "search again", "sumber baru") bypass the override.
3. **Retriever chain resolution** — `resolveSearchExecutionMode()` maps the boolean decision to an actual retriever or `"off"` / `"blocked_unavailable"`
4. **System note injection** — contextual instructions injected into the model's prompt based on the search decision (see [System Notes](#system-notes))

### Stage Search Policy

Paper stages are classified into two search policies defined in `stage-skill-contracts.ts`:

| Policy | Stages | LLM Router Behavior |
|--------|--------|---------------------|
| **ACTIVE** | gagasan, topik, pendahuluan, tinjauan_literatur, metodologi, diskusi | Enable search when factual data/references needed, even on short user confirmations ("ya", "ok") if AI previously proposed search |
| **PASSIVE** | outline, abstrak, hasil, kesimpulan, pembaruan_abstrak, daftar_pustaka, lampiran, judul | Enable search ONLY if user EXPLICITLY requests it |
| **none** | completed | No search |

The policy is passed as context to the LLM router prompt, not enforced as a hard gate.

---

## Three-Phase Orchestrator Flow

`executeWebSearch()` in `orchestrator.ts` implements a three-phase architecture with background RAG ingest:

### Phase 1: Silent Retriever Search

Runs BEFORE stream creation (errors propagate to route.ts for fallback handling).

```
User message → augmentUserMessageForSearch() → searchMessages
                                                      │
                                            ┌─────────▼─────────┐
                                            │  Retriever Chain   │
                                            │  Try each until    │
                                            │  one succeeds      │
                                            └─────────┬─────────┘
                                                      │
                                            searchText + sources[]
```

- Messages sanitized via `sanitizeMessagesForSearch()` (strips tool parts from assistant messages)
- Search system prompt: enriched search strategy guidance — teaches the retriever model what priority sources to actively seek (academic databases, Indonesian university repositories, Indonesian media) and how to construct targeted search queries. No blocklist — blocklist enforcement is delegated to the compose model via SKILL.md.
- User message augmented with diversity hints + priority source names: "Search broadly. Cite at least 10 sources... prioritize including sources from: academic databases (Google Scholar, Scopus, ResearchGate, SINTA, Garuda), Indonesian university repositories (UI, UGM, ITB, UIN, Unair), and reputable Indonesian media (Kompas, Tempo, Republika)."
- Both system prompt and user message carry priority source guidance (dual-channel delivery) — all retrievers receive both via `streamText()`, ensuring priority sources reach the model regardless of how each provider processes system vs user messages.
- Each retriever in the chain is tried sequentially; first success wins
- Sources extracted via `retriever.extractSources()`, then canonicalized (UTM removal, hash stripping, trailing slash normalization)

### Phase 1.5: FetchWeb Content Extraction

Runs INSIDE stream `execute` callback (after first byte sent — Vercel timeout doesn't apply).

```
sources[].url (max 7)
    ↓
Primary: fetch() + linkedom + readability + turndown → markdown
    + metadata extraction: author, date, site (readability + HTML meta tags)
    ↓ (failed URLs)
Fallback: @tavily/core .extract() → markdown
    ↓
pageContent (truncated 12K for compose) + fullContent (raw for RAG)
```

- Parallel fetch via `Promise.allSettled`, 5s timeout per URL
- `MIN_CONTENT_CHARS = 50` — skip trivially short extractions
- Metadata prepended as markdown block: `**Author:** ...`, `**Published:** ...`, `**Source:** ...`
- Enriched sources with `pageContent` used in compose context

### Phase 2: Compose with Streaming

After Phase 1.5 completes, the orchestrator builds compose context and streams to the client.

**Key change:** `searchText` is DROPPED from compose context when page content is available. `searchText` (retriever synthesis) was the primary contamination source for hallucination. Page content replaces it as ground truth.

**System message injection order (critical — position determines override priority):**

| Position | Content | Size | Purpose |
|----------|---------|------|---------|
| 1st | `COMPOSE_PHASE_DIRECTIVE` | ~2.5K | Defines compose phase, anti-hallucination rules, overrides conflicting instructions |
| 2nd | `searchResultsContext` | Variable | Numbered source list with `Page content (verified):` blocks per source. Sources without page content marked `[no page content — unverified source]`. When no source has page content, labels omitted (behaves like pre-FetchWeb). |
| 3rd | `systemPrompt` | ~10K | Main app persona/tone/rules from database |
| 4th | `skillInstructions` | ~6K | `SKILL.md` — quality, credibility, content verification, identity disambiguation, verbatim quoting tools |
| 5th | `fileContext` (optional) | ≤20K | User-uploaded document context |

**Deliberately EXCLUDED from compose phase:**
- `paperModePrompt` — contains "ASK user to confirm search" and tool usage instructions that conflict with compose behavior
- `paperWorkflowReminder` — instructs "call startPaperSession IMMEDIATELY" — irrelevant and harmful in compose (no tools available)

**Why COMPOSE_PHASE_DIRECTIVE goes first:** When placed after systemPrompt/skillInstructions, the model treats those larger blocks as primary instructions and ignores the smaller directive. First position establishes phase context before the model processes everything else.

### Stream Events

The orchestrator emits a sequence of typed events to the UI:

```
data-search { status: "searching" }        → Phase 1 indicator
data-search { status: "fetching-content" } → Phase 1.5: FetchWeb in progress
data-search { status: "composing" }        → Phase 2 started
data-reasoning-thought { delta, traceId }  → Reasoning chunks (when transparent reasoning enabled)
text-delta (streaming)                     → Compose output chunks
data-search { status: "done" }             → Search complete
data-cited-text { text }                   → Final text with paragraph-end citations
data-internal-thought { text }             → Leading "wait" sentences stripped from response
data-cited-sources { sources[] }           → Source list for UI rendering
```

### Phase 3: RAG Ingest (Background)

After compose completes and `onFinish` callback runs, RAG ingest fires sequentially (one source at a time to avoid embedding API rate limits):

```
for each source with fullContent:
    ingestToRag({
      conversationId, sourceType: "web",
      sourceId: url, content: fullContent
    })
    → chunkContent() → ~500 token chunks
    → embedTexts() → gemini-embedding-001, 768 dims
    → Convex sourceChunks.ingestChunks()
```

RAG ingest is fire-and-forget — never blocks the user. Failed ingests are logged but don't affect the response.

---

## Retriever System

### Strategy Pattern

Each retriever implements the `SearchRetriever` interface:

```typescript
interface SearchRetriever {
  name: string
  buildStreamConfig(config: RetrieverConfig): {
    model: LanguageModel
    tools?: Record<string, unknown>
  }
  extractSources(result: AnyStreamTextResult): Promise<NormalizedCitation[]>
}
```

### Registered Retrievers

Registry at `web-search/retriever-registry.ts`:

| Retriever | Provider | Citation Source | Special Handling |
|-----------|----------|----------------|------------------|
| **perplexity** | OpenRouter | `result.sources` (native array) | Highest citation count (~16), 4s timeout |
| **grok** | OpenRouter (`:online` suffix) | `result.sources` | Fewer citations (~5), filters out vertex proxy URLs, 8s timeout |
| **google-grounding** | Google AI SDK | `result.providerMetadata` (grounding metadata) | Vertex proxy URL redirect resolution, dedup, cap at 20, 6s timeout |

### Retriever Chain

The admin panel configures an ordered array of `webSearchRetrievers` (Convex database). `buildRetrieverChain()` resolves this config into `RetrieverChainEntry[]`. The orchestrator tries each retriever sequentially — first success wins, others are skipped.

### Adding a New Retriever

1. Create `web-search/retrievers/new-retriever.ts` implementing `SearchRetriever`
2. Register in `web-search/retriever-registry.ts`
3. Add to admin panel `webSearchRetrievers` config
4. No other code changes needed — the orchestrator is retriever-agnostic

---

## Skill System

### Architecture

Skills are natural language instruction files (SKILL.md) that guide the LLM's behavior during the compose phase. They are NOT Claude Code skills — they are server-side knowledge layers injected into Gemini's context.

The retriever model also receives natural language guidance via `getSearchSystemPrompt()` in `search-system-prompt.ts` — this functions as a skill-equivalent for the retriever phase, teaching the model what priority sources to actively seek and how to construct targeted search queries. Priority source guidance is delivered through both channels (system prompt for retriever + SKILL.md for compose) to ensure end-to-end coverage.

```
skills/
└── web-search-quality/
    ├── SKILL.md              ← Natural language instructions
    ├── index.ts              ← Loader (reads SKILL.md, injects context)
    ├── scripts/
    │   ├── score-sources.ts  ← Pre-compose: source scoring utility
    │   └── check-references.ts ← Post-compose: reference integrity check
    └── references/           ← Supporting reference material
```

### Skill Availability

Skills are injected for **all stages** — both ACTIVE and PASSIVE — and chat mode:

| Context | Skill Injected? | Stage Guidance |
|---------|----------------|----------------|
| ACTIVE paper stage (e.g., tinjauan_literatur) | Yes | Stage-specific guidance from SKILL.md `### {stage}` section |
| PASSIVE paper stage (e.g., outline) | Yes | Default guidance from SKILL.md `### default` section |
| Paper mode, no stage set | No | `null` — skill requires a known stage in paper mode |
| Chat mode, has recent sources | Yes | Default guidance |
| Chat mode, no recent sources | No | `null` — skill not needed without search results |

### Skill Context

Skills receive context at compose time:

```typescript
interface SkillContext {
  isPaperMode: boolean
  currentStage: string | null
  hasRecentSources: boolean
  availableSources: SourceEntry[]    // { url, title, publishedAt?, citedText? }
}
```

### web-search-quality SKILL.md

The currently active skill covers:

| Section | Purpose | Loaded by `getInstructions()`? |
|---------|---------|-------------------------------|
| **BLOCKED DOMAINS** | Domains to never cite (wikipedia, medium, quora, etc.) | No — parsed but not injected; enforcement via natural language in SKILL.md body |
| **PRIORITY SOURCES** | Preferred source categories: academic databases (Google Scholar, Scopus, SINTA, Garuda), Indonesian university repositories (.ac.id), reputable Indonesian media (Kompas, Tempo, Republika). Guidance, not restriction. | Yes |
| **RESEARCH SOURCE STRATEGY** | How to evaluate source credibility — primary data, authorship, methodology | Yes |
| **RESPONSE COMPOSITION** | Researcher persona, depth expectations, source usage requirements | Yes |
| **REFERENCE INTEGRITY** | Integration over decoration, source honesty, claim-source alignment | Yes |
| **INFORMATION SUFFICIENCY** | Prevents hallucination from thin sources — evidence-based synthesis, insufficiency declaration, no gap-filling | Yes |
| **CONTENT VERIFICATION** | Cross-reference claims against verified page content. Trust page content over search findings. Flag unverified sources. | Yes |
| **Identity Disambiguation** | When sources attribute contradictory identities to the same name, present separately — never merge profiles | Yes |
| **No Inline Domain References** | Ban embedding website/domain names in response text. Reference sources by citation number [1], [2] only. | Yes |
| **VERBATIM QUOTING TOOLS** | Instructions for `quoteFromSource` and `searchAcrossSources` RAG tools — when to use, what to expect | Yes |
| **STAGE CONTEXT** | Per-stage guidance with priority source references. Active stages (gagasan, topik, tinjauan_literatur, pendahuluan, metodologi, diskusi) get stage-specific enrichment; passive stages fall back to `### default` | Yes (stage-specific or default) |

### Blocklist Strategy

The blocked domain list exists in two places with distinct roles:

| Location | Role | When Applied |
|----------|------|-------------|
| `blocked-domains.ts` (`isBlockedSourceDomain()`) | Code-level filter in citation normalizer | Applied to ALL providers at normalization time |
| `SKILL.md` BLOCKED DOMAINS section | Natural language instruction to LLM | Applied during compose — LLM skips these in synthesis |

Both layers work together: the normalizer removes blocked sources from the citation array, and the SKILL.md instructs the LLM to ignore any that slip through.

---

## Citation Pipeline

### Data Flow

```
Retriever raw output
    │
    ▼
normalizeCitations(rawData, provider)      ← Provider-specific extraction
    │                                         + blocked domain filter
    ▼
canonicalizeCitationUrls(citations)        ← UTM removal, hash strip, trailing slash
    │
    ▼
formatParagraphEndCitations({              ← Move inline [N] markers to paragraph/line ends
  text, sources, anchors                      Strip raw URLs/domain mentions from text
})                                            Table rows are IMMUNE to all processing
    │
    ▼
buildUserFacingSearchPayload(text)         ← Split internal thought ("Bentar ya...") from public text
    │
    ▼
Stream events: data-cited-text + data-internal-thought + data-cited-sources
```

### NormalizedCitation

The unified citation format used throughout the application:

```typescript
interface NormalizedCitation {
  url: string              // Canonical URL
  title: string            // Source title (or URL if unavailable)
  startIndex?: number      // Character position in text (0-indexed)
  endIndex?: number        // Character position end (exclusive)
  citedText?: string       // Cited text segment — propagated to compose context as Snippet: lines
  publishedAt?: number     // Unix timestamp (ms)
}
```

### Citation Normalizers

Each provider has a dedicated normalizer in `citations/normalizer.ts`:

| Provider Key | Normalizer | Input Format |
|-------------|-----------|--------------|
| `perplexity` | `normalizePerplexityCitations()` | Array of `{ url, title? }` from `result.sources` |
| `gateway` | `normalizeGoogleGrounding()` | Nested `providerMetadata.google.groundingMetadata` with chunks + supports |
| `openrouter` / `openai` | `normalizeOpenAIAnnotations()` | `annotations[]` with `type: "url_citation"` |
| `anthropic` | `normalizeAnthropicCitations()` | Stub (returns `[]`) |

All normalizers pass through a universal post-filter: `citations.filter(c => !isBlockedSourceDomain(c.url))`.

### Paragraph-End Citation Formatter

`formatParagraphEndCitations()` in `paragraph-citation-formatter.ts` transforms the compose output:

1. **Paragraph splitting** — double-newline boundaries
2. **Source mention removal** — strips raw URLs, markdown links, bare domain names from text (per-line, tables immune)
3. **Inline citation extraction** — collects `[N]` markers and maps them to target lines
4. **Inline citation stripping** — removes `[N]` from mid-text positions (per-line, tables immune)
5. **Spacing normalization** — collapses multiple spaces, fixes punctuation spacing (per-line, tables immune)
6. **Citation placement** — appends `[N,M]` markers at paragraph/line ends based on anchor positions or extracted markers

**Table Immunity:** All four processing steps skip lines detected as table rows by `isTableLine()`:
```typescript
const isTableLine = (line: string) => {
  const trimmed = line.trim()
  return trimmed.startsWith("|") && (
    trimmed.endsWith("|") ||
    /\|\s*\[\d+(?:\s*,\s*\d+)*\]\s*$/.test(trimmed)
  )
}
```

**Heading lines** are also excluded from citation placement — citations on heading-only lines are moved to the nearest content line below.

### Internal Thought Separator

`buildUserFacingSearchPayload()` in `internal-thought-separator.ts` strips leading "thinking aloud" sentences from the model's compose output:

- Detects patterns like "Bentar ya", "Saya akan mencari", "Izinkan saya search"
- Splits at sentence boundaries (up to 4 leading sentences)
- Public content → `data-cited-text` stream event
- Internal thought → `data-internal-thought` stream event (rendered as collapsible block in UI)

---

## System Notes

Contextual instructions injected into the model's prompt by route.ts, based on the search decision:

| Note | When Injected | Purpose |
|------|--------------|---------|
| `PAPER_TOOLS_ONLY_NOTE` | Paper mode, search disabled, no special reason | Prevents model from promising to search when search isn't available |
| `getResearchIncompleteNote(stage, requirement)` | Paper mode, search disabled, but research incomplete | Strong reminder to ask user for search permission |
| `getFunctionToolsModeNote(searchInfo)` | Paper mode, search done or specific intent detected | Concise state note: "MODE: FUNCTION_TOOLS" |
| `COMPOSE_PHASE_DIRECTIVE` | During compose phase (orchestrator) | Overrides conflicting instructions, defines compose behavior |

### PAPER_TOOLS_ONLY_NOTE

Injected when search is disabled in paper mode. Key instructions:
- Web search is NOT available this turn
- Do NOT promise to search for references/literature
- Available tools: updateStageData, submitStageForValidation, createArtifact, updateArtifact
- If references needed: ask user to explicitly request a search
- Do NOT fabricate/hallucinate references

### Research Incomplete Note

Injected when the current stage's research requirements aren't met (checked via `isStageResearchIncomplete()`):
- Research requirements are data-based: checks `stageData` fields against minimum counts per stage
- Example: `tinjauan_literatur` requires ≥5 items in `referensi` field
- The note instructs the model to request search permission from the user
- This is a context signal to the model, NOT a hard gate

### Stage Research Requirements

Defined in `paper-search-helpers.ts`:

| Stage | Required Field | Min Count |
|-------|---------------|-----------|
| gagasan | referensiAwal | 2 |
| topik | referensiPendukung | 3 |
| tinjauan_literatur | referensi | 5 |
| pendahuluan | sitasiAPA | 2 |
| diskusi | sitasiTambahan | 2 |

Stages not listed (outline, abstrak, hasil, etc.) have no research requirement — they are PASSIVE stages.

---

## Frontend Integration

### Message Display Path

```
Backend stream events
    │
    ├── data-cited-text ──────► citedText (backend-formatted)
    ├── data-cited-sources ───► sources[] for SourcesIndicator
    ├── data-internal-thought ► collapsible thought block
    └── text-delta ───────────► raw text (legacy fallback)
    │
    ▼
MessageBubble.tsx
    │
    ├── Has data-cited-text? → Use directly (trusted, already formatted)
    │
    └── Legacy message (no data-cited-text)?
        → normalizedLegacyCitedText: runs formatParagraphEndCitations()
          on frontend as fallback for messages created before the
          backend pipeline existed
    │
    ▼
MarkdownRenderer.tsx
    │
    ├── Table detection: isTableRow() strips trailing [N] markers
    │   before checking startsWith("|") && endsWith("|")
    │
    └── InlineCitationChip: renders [N] as clickable source links
```

### Artifact vs Chat Rendering

| Path | Citation Processing | Table Handling |
|------|-------------------|---------------|
| **Chat** | `formatParagraphEndCitations` → `buildUserFacingSearchPayload` → `data-cited-text` | Tables immune to citation formatter; MarkdownRenderer strips trailing `[N]` for table detection |
| **Artifact** | None — raw content passed directly to `<MarkdownRenderer>` | Standard markdown table rendering |

---

## Configuration

### Admin Panel (Convex Database)

The admin panel controls search configuration via `webSearchConfig`:

| Field | Description |
|-------|-------------|
| `webSearchRetrievers` | Ordered array of `{ retrieverId, modelId, priority }` — defines the retriever chain |
| `primaryEnabled` | Legacy: enable primary search model |
| `fallbackEnabled` | Legacy: enable fallback search model |
| `webSearchModel` | Legacy: primary model ID |
| `webSearchFallbackModel` | Legacy: fallback model ID |

The `webSearchRetrievers` array is the modern configuration. Legacy fields are used as fallback when the array is empty.

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_API_KEY` | API key for Perplexity and Grok retrievers (via OpenRouter) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | API key for Google Grounding retriever + gemini-embedding-001 (RAG) |
| `TAVILY_API_KEY` | API key for Tavily Extract fallback in FetchWeb |

---

## Language Policy

| Context | Language | Reason |
|---------|----------|--------|
| Model instructions (system prompts, SKILL.md, tool descriptions, Zod `.describe()`) | **English** | Models process English instructions more accurately |
| User-facing output (chat responses, paper artifacts) | **Indonesian** | Governed by primary system prompt in database |
| UI strings, error messages shown to users | **Indonesian** | User-facing |
| Regex patterns detecting Indonesian user input | **Indonesian** | Functional code matching user language |
| Internal thought patterns (`INTERNAL_THOUGHT_PATTERNS`) | **Indonesian** | Detecting Indonesian model output patterns |

This separation ensures a single source of truth for output language policy (database system prompt) and prevents scattered, inconsistent language directives across the codebase.

---

## Key Files Reference

| File | Description |
|------|-------------|
| `src/app/api/chat/route.ts` | API endpoint: search decision tree, LLM router, tool assembly, orchestrator dispatch |
| `src/lib/ai/web-search/orchestrator.ts` | Two-pass search flow: Phase 1 retrieve, Phase 2 compose + stream |
| `src/lib/ai/web-search/types.ts` | Core interfaces: `SearchRetriever`, `WebSearchOrchestratorConfig`, `WebSearchResult` |
| `src/lib/ai/web-search/retriever-registry.ts` | Retriever name → implementation map |
| `src/lib/ai/web-search/retrievers/perplexity.ts` | Perplexity Sonar retriever |
| `src/lib/ai/web-search/retrievers/grok.ts` | Grok `:online` retriever |
| `src/lib/ai/web-search/retrievers/google-grounding.ts` | Google Grounding retriever (with vertex proxy resolution) |
| `src/lib/ai/web-search/config-builder.ts` | Builds retriever chain from admin config |
| `src/lib/ai/web-search/search-execution-mode.ts` | Maps search decision to execution mode |
| `src/lib/ai/web-search/utils.ts` | Message sanitization, URL canonicalization, error responses |
| `src/lib/ai/skills/web-search-quality/SKILL.md` | Quality/credibility/composition skill instructions |
| `src/lib/ai/skills/index.ts` | Skill loader and instruction composer |
| `src/lib/ai/skills/types.ts` | `SkillContext`, `SourceEntry`, `ValidationResult` |
| `src/lib/ai/paper-search-helpers.ts` | System notes, research completeness checks, stage requirements |
| `src/lib/ai/stage-skill-contracts.ts` | ACTIVE/PASSIVE stage classification |
| `src/lib/ai/search-system-prompt.ts` | Search strategy system prompt (priority sources, query construction guidance) + user message augmentation (diversity hints + priority source names) |
| `src/lib/ai/web-search/content-fetcher.ts` | FetchWeb: fetch + readability + turndown + metadata extraction, Tavily fallback |
| `src/lib/ai/chunking.ts` | Section-aware content chunker (~500 tokens) for RAG |
| `src/lib/ai/embedding.ts` | Google gemini-embedding-001 client with retry + retry-after parsing |
| `src/lib/ai/rag-ingest.ts` | Core RAG pipeline: chunk → embed → store in Convex |
| `src/lib/ai/search-results-context.ts` | Builds source list with pageContent (verified/unverified labels) for compose context |
| `src/lib/ai/internal-thought-separator.ts` | Splits internal thought from public content |
| `src/lib/ai/blocked-domains.ts` | Blocked domain list + `isBlockedSourceDomain()` |
| `src/lib/citations/normalizer.ts` | Multi-provider citation normalizer dispatcher |
| `src/lib/citations/types.ts` | `NormalizedCitation`, provider-specific raw types |
| `src/lib/citations/paragraph-citation-formatter.ts` | Paragraph-end citation formatting with table immunity |
| `src/components/chat/MessageBubble.tsx` | Frontend message display: citation rendering, legacy fallback |
| `src/components/chat/MarkdownRenderer.tsx` | Markdown rendering with table detection + inline citation chips |
| `src/components/chat/SearchStatusIndicator.tsx` | Search status UI: searching → fetching-content → composing → done |
| `convex/sourceChunks.ts` | RAG: mutations (ingestChunks, hasChunks, deleteByConversation) + vector search action |
| `convex/schema.ts` | sourceChunks table with vectorIndex (768 dims, filterFields: conversationId, sourceType, sourceId) |

---

## Request Flow Examples

### Chat Mode — Initial Search

```
1. User sends message: "Apa dampak AI terhadap pendidikan tinggi di Indonesia?"
2. route.ts: no paperModePrompt → LLM router runs with isPaperMode=false
3. Router returns: { enableWebSearch: true, intentType: "search" }
4. buildRetrieverChain() → [google-grounding, perplexity]
5. resolveSearchExecutionMode() → "google-grounding"
6. executeWebSearch() called:
   Phase 1: Google Grounding searches → searchText + 20 sources
   Phase 1.5: FetchWeb extracts content for top 7 URLs → pageContent per source
   Phase 2: Compose with page content (searchText dropped), COMPOSE_PHASE_DIRECTIVE
   Phase 3 (background): RAG ingest → chunk + embed + store in Convex
7. Stream: searching → fetching-content → composing → text-delta... → done
8. Frontend: MessageBubble renders citedText via MarkdownRenderer
```

### Chat Mode — Follow-up with RAG

```
1. User asks: "Kutip paragraf pertama dari sumber kedua"
2. route.ts: ragChunksAvailable=true, searchAlreadyDone=true
3. Router says: enableWebSearch=true (wants to search)
4. RAG override: chunks available + no explicit new-search trigger → force false
5. Normal chat path with tools → model calls quoteFromSource({ sourceId, query })
6. quoteFromSource → embed query → Convex vectorSearch → return verbatim chunks
7. Model quotes exact text from stored chunk
```

### Paper Mode — ACTIVE Stage (e.g., tinjauan_literatur)

```
1. User sends "ya, cari referensi" (confirming AI's search proposal)
2. route.ts: paperModePrompt present, stage=tinjauan_literatur, policy=ACTIVE
3. isStageResearchIncomplete() → { incomplete: true, requirement: "Butuh minimal 5 referensi" }
4. LLM router: sees ACTIVE policy + incomplete research + user confirmation
   Returns: { enableWebSearch: true, intentType: "search", confidence: 0.95 }
5. Same flow as chat mode: orchestrator runs two-pass search
6. After compose stream completes → model has paper tools on next turn to save results
```

### Paper Mode — PASSIVE Stage (e.g., outline)

```
1. User sends "buatkan outline berdasarkan tinjauan literatur"
2. route.ts: paperModePrompt present, stage=outline, policy=PASSIVE
3. LLM router: PASSIVE policy → only enable if user EXPLICITLY requests search
   Returns: { enableWebSearch: false, intentType: "discussion", confidence: 0.9 }
4. searchRequestedByPolicy = false
5. PAPER_TOOLS_ONLY_NOTE injected → model works with existing data + paper tools
```

### Paper Mode — Sync Request

```
1. User sends "sinkronkan state"
2. LLM router: returns { enableWebSearch: false, intentType: "sync_request" }
3. isSyncRequest = true → shouldForceGetCurrentPaperState = true
4. Model receives getCurrentPaperState tool → returns session state to user
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| All retrievers fail | `createSearchUnavailableResponse()` → `data-search { status: "error" }` + user-visible error message |
| Single retriever fails | Try next in chain (logged, not user-visible) |
| Citation extraction timeout | Return `[]` sources (logged warning), compose proceeds without citations |
| LLM router failure (2 retries + fallback) | Safe default: `{ enableWebSearch: true }` — search is never harmful |
| FetchWeb primary fetch fails | Tavily fallback for failed URLs. Both fail → source has no pageContent (marked unverified) |
| FetchWeb all URLs fail | Proceed with searchText (pre-FetchWeb behavior). Labels omitted. |
| Compose phase error | Error propagates to route.ts; search status closed as terminal |
| Citation formatting error | Caught in orchestrator finish handler; search status set to "done"/"off" |
| RAG embedding fails (429 rate limit) | Retry 3x with exponential backoff, parse retry-after from Google 429 response. If all retries fail, chunks not stored — flow continues |
| RAG ingest fails | Fire-and-forget — logged but never blocks user response |
| RAG vectorSearch returns 0 results | Model receives empty array. SKILL.md instructs: inform user quote unavailable |

---

## Compose Phase — No Tools Available

The compose phase (`streamText` in orchestrator Phase 2) runs **without tools**. The model receives the main system prompt which may reference tools like `updateStageData`, `createArtifact`, etc., but these are NOT available during compose.

`COMPOSE_PHASE_DIRECTIVE` explicitly addresses this:
- "You have NO access to tools in this phase"
- "Do NOT output JSON tool calls as text — it will appear as raw text to the user"
- "Saving data happens in a SUBSEQUENT turn when tools are available"
- Anti-hallucination: "ONLY state facts from Page content (verified) sections. NEVER add training knowledge."
- Identity disambiguation: "If sources describe different entities with same name, present SEPARATELY."

This is an intentional design: the compose phase synthesizes search results into a response. Tool actions (saving data, creating artifacts) and RAG retrieval (`quoteFromSource`, `searchAcrossSources`) happen on subsequent turns when the model runs through the normal `streamText` path with full tool access.

### RAG Tools in Follow-up Turns

When the search decision routes to the non-search path (`enableWebSearch = false`), the model gets paper tools including two RAG tools:

| Tool | Purpose | Input |
|------|---------|-------|
| `quoteFromSource` | Retrieve verbatim text from a specific source | `sourceId` (URL or fileId) + `query` |
| `searchAcrossSources` | Find relevant passages across all stored sources | `query` + optional `sourceType` filter |

Both tools call `convex/sourceChunks.searchByEmbedding` (Convex action with `ctx.vectorSearch`). Query is embedded via `embedQuery()` with `taskType: "RETRIEVAL_QUERY"`.

RAG tools are available in ALL modes (chat + paper) when the non-search path is active.
