# Architecture Constraints: Makalah AI Tools + Skills

## Language Rule

**ALL skill instructions and stage instructions MUST be written in English.**

- Model's native language is English — instructions in English minimize ambiguity and maximize accuracy
- Applies to: SKILL.md body, stage guidance, system notes, paper stage instructions
- Indonesian is for USER-FACING output only (Gemini's response to user), never for model instructions
- Search system prompts to Perplexity/Grok/Google Grounding must also be in English
- This rule applies to ALL skills and ALL stage instructions across every domain

## Skill Scope

- `src/lib/ai/skills/` contains server-side knowledge layers injected into Gemini's compose/generation phase
- Each skill is a self-contained folder with a SKILL.md and supporting code
- Skills are NOT Claude Code skills — they are natural language instruction files that guide LLM behavior at runtime
- Currently: `web-search-quality` skill (search domain)
- Future candidate: paper workflow skill (stage guidance domain) — see `future-paper-workflow-skill-notes.md`

## Separation of Concerns

Three independent concerns that must never be mixed:

| Concern | Responsibility | Current Location |
|---------|---------------|------------------|
| **Quality/Knowledge** | HOW the LLM processes and presents results | `skills/web-search-quality/SKILL.md` |
| **Workflow Control** | WHEN tools are available and what mode is active | `route.ts` (LLM router with intentType enum for all decisions), `paper-search-helpers.ts` (system notes + data checks) |
| **Tool Execution** | Simple data retrieval, no judgment | `web-search/retrievers/*.ts`, `paper-tools.ts` |

These are independent:
- Search quality doesn't care whether context is paper or chat
- Paper workflow doesn't care how sources are evaluated
- Tools don't care about quality or workflow — they just fetch data

## Tools vs Skills vs Code Pipeline

Core architectural principle validated through experimentation. See README.md for full evidence.

### Tools Are Simple Executors

- Retrievers (Perplexity, Grok, Google Grounding) = retrieve broadly, return raw sources
- Paper tools (`startPaperSession`, `updateStageData`) = execute actions, return state
- No blocklist, no filtering, no scoring, no quality judgment at the tool level
- Tools should be free to gather/process as much data as possible
- Constraining tools constrains the LLM's intelligence

### Skills Provide Intelligence

- Skills operate at TWO phases:
  - **Retriever phase:** `getSearchSystemPrompt()` teaches the retriever model what to search for (priority sources, query construction strategy)
  - **Compose phase:** `SKILL.md` teaches the compose model how to evaluate, filter, and present (blocklist, priority preference, credibility criteria, narration rules)
- Blocklist enforcement via natural language in SKILL.md (not code)
- Priority source guidance via natural language in both retriever prompt and SKILL.md (not API filters)
- Source credibility evaluation via skill instructions (not domain tier scoring)
- Stage behavior guidance via skill instructions (not hardcoded strings)
- Quality judgment delegated to LLM, not hardcoded in pipeline

### Code Pipeline Should Be Minimal

- `normalize → pass ALL to LLM` — that's the target
- No intermediate scoring, filtering, enrichment between tool output and LLM input
- Deterministic code only for: URL normalization, citation format normalization, redirect resolution
- Every code step between tool output and LLM input = potential data loss

### Why This Works

- LLMs follow natural language instructions — they respect blocklists and evaluation criteria in SKILL.md
- Complex pipelines (score → enrich → filter → dedup) lost 50% of sources in practice
- Simpler pipeline = more data preserved = better LLM output
- Skill instructions are easier to update than code logic
- Anthropic's Programmatic Tool Calling research confirms: LLM reasoning over raw data > hardcoded pipelines

## Blocklist Strategy

**Blocklist lives in SKILL.md as natural language, NOT as programmatic code filter.**

- `src/lib/ai/blocked-domains.ts` exists as canonical reference list (shared across skills)
- But `isBlockedSourceDomain()` is NOT called in the search pipeline
- Gemini respects "NEVER cite these domains" instruction in SKILL.md
- Validated: 14 sources preserved, zero blocked domains in final output

## Search System Prompt Strategy

- Retrievers receive an enriched system prompt with search strategy guidance: priority source categories (academic databases, Indonesian university repositories, Indonesian media), specific domain names, and query construction techniques
- NO blocklist in search system prompt — blocklist enforcement is delegated to compose model via SKILL.md
- User message augmented with diversity hints + priority source names (dual-channel delivery alongside system prompt)
- All retrievers receive both system prompt and user message via `streamText()` — how each provider processes them internally is provider-specific behavior outside our control

## Retriever Architecture

Strategy Pattern with chain fallback:

```
Admin config → buildRetrieverChain() → [retriever1, retriever2, ...] → orchestrator tries each until success
```

Each retriever implements `SearchRetriever` interface:
- `buildStreamConfig(config)` → returns `{ model, tools? }`
- `extractSources(result)` → returns `NormalizedCitation[]`

Registry at `src/lib/ai/web-search/retriever-registry.ts`. New retrievers = implement interface + register.

## Paper Stage Architecture (Current — Migration Candidate)

ALL regex have been removed from the search decision path. Search mode decisions — including intent classification (search, discussion, sync, compile, save) — are now unified under a single LLM router (`decideWebSearchMode` in `route.ts`) using a typed `intentType` enum. No regex patterns remain in `route.ts` or `paper-search-helpers.ts` for intent detection, search request matching, or sync request matching.

Currently hardcoded TypeScript instruction strings, not SKILL.md:

| Component | Location | Pattern |
|-----------|----------|---------|
| Stage instructions | `paper-stages/foundation.ts`, `core.ts`, `results.ts`, `finalization.ts` | Hardcoded template literal strings |
| System notes + data checks | `paper-search-helpers.ts` | Data-based research completeness checks, system notes (`PAPER_TOOLS_ONLY_NOTE`, `getResearchIncompleteNote()`, `getFunctionToolsModeNote()`), utility functions |
| Context injection | `paper-stages/formatStageData.ts` | Deterministic formatting of stageData for prompt |
| Stage routing | `paper-stages/index.ts` | `getStageInstructions(stage)` switch |

This pattern works but has maintenance costs:
- Instruction changes require code deployment
- Logic scattered across multiple TypeScript files
- `isStageResearchIncomplete` now provides context to the LLM router, not a hard gate
- No separation between knowledge (what to do) and workflow (when to do it)

See `future-paper-workflow-skill-notes.md` for migration analysis.
