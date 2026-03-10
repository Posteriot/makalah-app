# Tools + Skills Architecture — Principles & Evidence

## Core Insight: Simple Tools, Smart Skills

Validated through iterative experimentation on the `search-tool-skills` branch:

> **Complex tool pipelines limit LLM intelligence. Keep tools simple, deliver intelligence through skills.**

### The Three Layers

| Layer | Role | Example |
|-------|------|---------|
| **Tool** | Simple executor — fetch data, no judgment | Perplexity retrieve sources, Grok search web, Google Grounding |
| **Skill** | Knowledge layer — teach LLM HOW to judge | SKILL.md: credibility evaluation, blocklist, narration rules |
| **Code Pipeline** | Minimal deterministic transform | Normalize URLs, format citations, resolve redirects |

### Where This Applies

This architecture is not search-specific. Any domain where an LLM needs knowledge guidance follows the same pattern:

| Domain | Tools (Simple Executors) | Skills (Knowledge Layer) | Code Pipeline |
|--------|--------------------------|--------------------------|---------------|
| **Web Search** | Perplexity, Grok, Google Grounding retrievers | `web-search-quality/SKILL.md` | Normalize citations, resolve proxy URLs |
| **Paper Stages** | `startPaperSession`, `updateStageData`, `submitStageForValidation` | Stage instructions in `paper-stages/*.ts` (migration candidate) | `formatStageData` context injection |
| **Future domains** | Any data-fetching tool | SKILL.md with domain-specific guidance | Format normalization only |

## Principle 1: Tools Must Be Free

> "AI works better when you give tools and freedom instead of forcing them into rigid, hand-designed workflows" — Boris Cherny

**Don't constrain what tools can gather.** A retriever with a blocklist in its system prompt = a retriever with hobbled retrieval. A free retriever = more sources, more diversity.

In practice:
- ❌ Blocklist in search model's system prompt (constrains retrieval)
- ❌ Specific domain names in instructions ("search BPS, World Bank, McKinsey")
- ✅ Generic diversity hints in user message ("search broadly, cite 10+ sources")
- ✅ Retrievers free to gather from anywhere

**Paper stage equivalent:**
- ❌ Hardcoded validation that blocks stage progression based on rigid field counts
- ✅ Skill instructions that teach LLM when research is insufficient and what to do about it

## Principle 2: Skills Provide Intelligence

**Quality judgment = LLM's job, not code's job.**

LLMs like Gemini are trained to follow instructions. A blocklist written as "NEVER cite wikipedia.org" in SKILL.md is as effective as `isBlockedSourceDomain()` in code — but without the risk of losing sources in a pipeline.

In practice:
- ❌ `isBlockedSourceDomain()` filter in code pipeline
- ❌ Domain tier scoring (academic: 90, news: 70, blog: 30)
- ❌ Diversity enforcement algorithm
- ✅ Blocklist as natural language in SKILL.md
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

## Current State: Two Domains, Two Patterns

### Web Search — Skills Pattern (implemented)

```
Retriever (tool) → normalize citations → pass ALL to Gemini + SKILL.md
```

- `src/lib/ai/skills/web-search-quality/SKILL.md` — knowledge layer
- `src/lib/ai/web-search/orchestrator.ts` — two-pass flow
- `src/lib/ai/web-search/retrievers/*.ts` — strategy pattern tools

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
| `web-search-quality-skill-design.md` | Web search quality skill design |
| `future-paper-workflow-skill-notes.md` | Paper stage skill migration analysis |
| `web-search-orchestrator-design.md` | Orchestrator + retriever chain design |
| `web-search-orchestrator-implementation-plans.md` | Orchestrator implementation plan |
| `admin-panel-search-redesign-design.md` | Admin panel N-retriever redesign |
| `admin-panel-search-redesign-implementation-plans.md` | Admin panel redesign implementation plan |
